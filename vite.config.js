/**
 * Vite build config for Defer Forms for Contact Form 7 admin UI.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

function discoverEntries() {
	const appsDir = path.resolve( __dirname, 'ui/apps' );
	if ( ! fs.existsSync( appsDir ) ) {
		return {};
	}
	const entries = {};
	for ( const name of fs.readdirSync( appsDir ) ) {
		if ( name.startsWith( '.' ) || name.startsWith( '_' ) ) {
			continue;
		}
		const entry = path.join( appsDir, name, 'index.jsx' );
		if ( fs.existsSync( entry ) ) {
			entries[ name ] = entry;
		}
	}
	return entries;
}

/**
 * Rewrite `@wordpress/*` imports to read from the `wp.*` globals WordPress
 * exposes on admin pages. Avoids bundling React/components twice.
 */
function wpGlobals() {
	const map = {
		'@wordpress/element':    'window.wp.element',
		'@wordpress/components': 'window.wp.components',
		'@wordpress/i18n':       'window.wp.i18n',
		'@wordpress/api-fetch':  'window.wp.apiFetch',
		'@wordpress/data':       'window.wp.data',
		react:                   'window.wp.element',
		'react-dom':             'window.wp.element',
		'react-dom/client':      'window.wp.element',
	};

	const jsxRuntimes = new Set( [ 'react/jsx-runtime', 'react/jsx-dev-runtime' ] );

	return {
		name: 'wp-globals',
		enforce: 'pre',
		resolveId( id ) {
			if ( map[ id ] || jsxRuntimes.has( id ) ) {
				return '\0wp:' + id;
			}
			return null;
		},
		load( id ) {
			if ( ! id.startsWith( '\0wp:' ) ) {
				return null;
			}
			const real = id.replace( '\0wp:', '' );

			if ( jsxRuntimes.has( real ) ) {
				return `
					const _m = window.wp.element;
					export const Fragment = _m.Fragment;
					function _jsx( type, props, maybeKey ) {
						const config = { ...( props || {} ) };
						if ( maybeKey !== undefined ) {
							config.key = maybeKey;
						}
						const { children, ...rest } = config;
						if ( children === undefined ) {
							return _m.createElement( type, rest );
						}
						return Array.isArray( children )
							? _m.createElement( type, rest, ...children )
							: _m.createElement( type, rest, children );
					}
					export { _jsx as jsx, _jsx as jsxs, _jsx as jsxDEV };
				`;
			}

			const global    = map[ real ];
			const named     = namedReExports( real );
			const namedLine = named ? `export const { ${ named } } = _m;` : '';

			// dnd-kit imports unstable_batchedUpdates from react-dom; wp.element
			// doesn't expose it. React 18 auto-batches, so a passthrough is safe.
			const extra = ( 'react-dom' === real )
				? 'export const unstable_batchedUpdates = _m.unstable_batchedUpdates || ( ( fn, a ) => fn( a ) );'
				: '';

			return `
				const _m = ${ global };
				export default _m;
				${ namedLine }
				${ extra }
			`;
		},
	};
}

/**
 * Hand-rolled list of named exports we use from each WP package. If we start
 * importing something new and the build fails with "X is undefined", add it
 * here.
 */
function namedReExports( pkg ) {
	const exports = {
		'@wordpress/element': [
			'createRoot',
			'render',
			'useState',
			'useEffect',
			'useMemo',
			'useCallback',
			'useRef',
			'useContext',
			'useReducer',
			'createContext',
			'Fragment',
			'cloneElement',
			'createElement',
			'forwardRef',
			'memo',
		],
		'@wordpress/components': [
			'Button',
			'Modal',
			'TextControl',
			'SelectControl',
			'CheckboxControl',
			'ToggleControl',
			'Spinner',
			'Notice',
			'Card',
			'CardBody',
			'CardHeader',
			'CardFooter',
			'Flex',
			'FlexItem',
		],
		'@wordpress/i18n':      [ '__', '_x', '_n', '_nx', 'sprintf' ],
		'@wordpress/api-fetch': [],
		'@wordpress/data':      [ 'useSelect', 'useDispatch', 'select', 'dispatch' ],
		react: [
			'Children',
			'Component',
			'PureComponent',
			'Fragment',
			'StrictMode',
			'Suspense',
			'cloneElement',
			'createContext',
			'createElement',
			'createRef',
			'forwardRef',
			'isValidElement',
			'lazy',
			'memo',
			'startTransition',
			'useCallback',
			'useContext',
			'useDebugValue',
			'useDeferredValue',
			'useEffect',
			'useId',
			'useImperativeHandle',
			'useInsertionEffect',
			'useLayoutEffect',
			'useMemo',
			'useReducer',
			'useRef',
			'useState',
			'useSyncExternalStore',
			'useTransition',
			'version',
		],
		'react-dom': [
			'createPortal',
			'findDOMNode',
			'flushSync',
			'render',
			'hydrate',
			'unmountComponentAtNode',
		],
		'react-dom/client': [ 'createRoot', 'hydrateRoot' ],
	};
	return ( exports[ pkg ] || [] ).join( ', ' );
}

/**
 * The silence file every other directory here has a committed copy of.
 *
 * build/ cannot: it is emptied and written from scratch on every release, so
 * anything committed into it goes with the rest. Written on the way out
 * instead, which is also the only moment it is certain to exist.
 *
 * Nothing in build/ is PHP, so this is about a directory listing rather than
 * about running anything -- on a server with indexes on, it is otherwise a
 * readable list of the files this admin is built from.
 */
function silence() {
	return {
		name: 'df7-silence',
		closeBundle() {
			fs.writeFileSync(
				path.resolve( __dirname, 'build/index.php' ),
				[ '<?php', '// Silence is golden.', '' ].join( '\n' )
			);
		},
	};
}

export default defineConfig( {
	plugins: [ wpGlobals(), react(), silence() ],

	server: {
		port: 5173,
		strictPort: true,
		cors: true,
	},

	build: {
		outDir: 'build',
		emptyOutDir: true,
		// Named rather than `true`: Vite's default is build/.vite/manifest.json,
		// and a hidden directory is one of the things Plugin Check refuses
		// outright ("Hidden files are not permitted"). The plugin cannot run
		// without this file, so it cannot live somewhere wp.org will not take.
		manifest: 'manifest.json',

		// Off for a release, on when you ask for it. The maps were 1.5 MB of a
		// 2.1 MB build — 71% of what ships, for files no end user opens. They
		// are worth having while debugging a built bundle, which is what the
		// flag is for: `DF7_SOURCEMAP=1 npm run build`.
		sourcemap: '1' === process.env.DF7_SOURCEMAP,
		target: 'es2019',

		rollupOptions: {
			input: discoverEntries(),
			output: {
				entryFileNames: 'apps/[name]/[name].[hash].js',
				chunkFileNames: 'chunks/[name].[hash].js',
				assetFileNames: 'assets/[name].[hash].[ext]',
			},
		},
	},

	resolve: {
		alias: {
			'@':       path.resolve( __dirname, 'ui' ),
			'@apps':   path.resolve( __dirname, 'ui/apps' ),
			'@shared': path.resolve( __dirname, 'ui/shared' ),
		},
	},
} );
