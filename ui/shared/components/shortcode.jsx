/**
 * A form's shortcode, and one click to copy it.
 *
 * Shared because it is wanted in two places for the same reason: on the Forms
 * card, and in the builder while the form is open — which is exactly when
 * somebody wants to paste it into a page and does not want to leave to fetch
 * it.
 *
 * The clipboard API needs a secure context and a permission that a browser can
 * refuse, so there is a fallback: a scratch textarea and execCommand, which is
 * deprecated and works everywhere.
 *
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Check, Copy } from 'lucide-react';

import { Shimmer } from './ui';

export const ShortcodeBox = ( { code, loading = false, compact = false } ) => {
	const [ copied, setCopied ] = useState( false );

	if ( ! code && ! loading ) {
		return null;
	}

	const copy = async () => {
		try {
			await navigator.clipboard.writeText( code );
		} catch {
			const scratch = document.createElement( 'textarea' );
			scratch.value = code;
			scratch.style.position = 'fixed';
			scratch.style.opacity = '0';
			document.body.appendChild( scratch );
			scratch.select();
			document.execCommand( 'copy' );
			document.body.removeChild( scratch );
		}
		setCopied( true );
		setTimeout( () => setCopied( false ), 1600 );
	};

	return (
		<button
			type="button"
			onClick={ loading ? undefined : copy }
			disabled={ loading }
			title={ loading ? undefined : code }
			aria-label={ __( 'Copy shortcode', 'essentials-for-contact-form-7' ) }
			className={ `cf7e-flex cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-2.5 cf7e-text-left cf7e-transition-colors ${
				// In a toolbar it stands beside buttons and has to be their
				// height; in a card it is a line of its own under the text.
				compact ? 'cf7e-h-9 cf7e-max-w-[15rem]' : 'cf7e-mt-4 cf7e-w-full cf7e-py-1.5'
			} ${
				loading ? '' : 'cf7e-cursor-pointer hover:cf7e-border-stroke hover:cf7e-bg-stone-50'
			}` }
		>
			<code className="cf7e-min-w-0 cf7e-flex-1 cf7e-truncate cf7e-bg-transparent cf7e-p-0 cf7e-text-[14px] cf7e-text-stone-500">
				{ loading ? <Shimmer w="cf7e-w-2/3" /> : code }
			</code>
			{ loading || ! copied
				? <Copy className={ `cf7e-h-3.5 cf7e-w-3.5 cf7e-shrink-0 cf7e-text-stone-400 ${ loading ? 'cf7e-animate-pulse cf7e-opacity-40' : '' }` } />
				: <Check className="cf7e-h-3.5 cf7e-w-3.5 cf7e-shrink-0 cf7e-text-emerald-600" /> }
		</button>
	);
};
