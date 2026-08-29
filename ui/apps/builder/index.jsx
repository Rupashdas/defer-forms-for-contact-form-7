import { createRoot, Fragment, useCallback, useEffect, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import { GripVertical, Pencil, Copy, Trash2, X, Wand2, Plus, Save, Loader2, Check, Type, LayoutGrid, Undo2, Redo2, Scissors, Palette, History, RotateCcw, Lock } from 'lucide-react';

import { Page, PageHeader } from '@shared/components/page';
import { Toggle } from '@shared/components/toggle';
import { Tabs, Select, Backdrop, control, btnPrimary, btnGhost, focusRing, Shimmer } from '@shared/components/ui';
import {
	DndContext,
	DragOverlay,
	MeasuringStrategy,
	closestCenter,
	getFirstCollision,
	pointerWithin,
	rectIntersection,
	PointerSensor,
	KeyboardSensor,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	verticalListSortingStrategy,
	sortableKeyboardCoordinates,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { FIELD_LIBRARY, ALL_FIELDS, labelForType, makeField } from './fields.js';
import { TEL_PATTERNS, CUSTOM as TEL_CUSTOM, startsCustom, selectValue, pick as pickTelFormat } from './tel-format.js';
import { NONE_MODE, URL_MODE, PAGE_MODE, mode as destinationMode, choose as chooseDestination, hasDestination } from './redirect-destination.js';
import { showsRequired, requiredLocked, isRequired, hasDefaultChoice, defaultChoice } from './field-rules.js';
import { stepNumbers, opensWithBreak, stepNav } from './step-numbers.js';
import { ShortcodeBox } from '@shared/components/shortcode';
import '@shared/styles/admin.css';

const uid = () => Math.random().toString( 36 ).slice( 2, 9 );
const slug = ( text ) => String( text ).toLowerCase().replace( /[^a-z0-9_-]+/g, '-' ).replace( /^-+|-+$/g, '' );

const ensureIds = ( list ) =>
	( list || [] ).map( ( item ) => {
		const withId = { _id: uid(), _nameTouched: true, ...item };
		if ( 'row' === item.kind ) {
			withId.columns = ( item.columns || [] ).map( ( col ) => ensureIds( col ) );
		}
		return withId;
	} );
const stripIds = ( list ) =>
	( list || [] ).map( ( item ) => {
		const clean = Object.fromEntries( Object.entries( item ).filter( ( [ k ] ) => ! k.startsWith( '_' ) ) );
		if ( 'row' === item.kind ) {
			clean.columns = ( item.columns || [] ).map( ( col ) => stripIds( col ) );
		}
		return clean;
	} );

// Replace a node anywhere in the tree by _id; append to the root if not found.
const replaceById = ( list, target ) => {
	let found = false;
	const walk = ( arr ) =>
		arr.map( ( it ) => {
			if ( it._id === target._id ) {
				found = true;
				return target;
			}
			return 'row' === it.kind ? { ...it, columns: ( it.columns || [] ).map( ( col ) => walk( col ) ) } : it;
		} );
	const next = walk( list );
	return found ? next : [ ...list, target ];
};

// Remove a node anywhere in the tree by _id.
const removeById = ( list, id ) =>
	list
		.filter( ( it ) => it._id !== id )
		.map( ( it ) =>
			'row' === it.kind
				? { ...it, columns: ( it.columns || [] ).map( ( col ) => removeById( col, id ) ) }
				: it );

// Deep copy with fresh _ids (rows clone every column child too).
const cloneWithIds = ( item ) => {
	const copy = { ...item, _id: uid() };
	if ( 'row' === item.kind ) {
		copy.columns = ( item.columns || [] ).map( ( col ) => col.map( cloneWithIds ) );
	}
	return copy;
};

// Insert a fresh-id copy right after the node, wherever it lives.
const duplicateById = ( list, id ) => {
	const idx = list.findIndex( ( it ) => it._id === id );
	if ( -1 !== idx ) {
		const next = list.slice();
		next.splice( idx + 1, 0, cloneWithIds( list[ idx ] ) );
		return next;
	}
	return list.map( ( it ) => {
		if ( 'row' !== it.kind ) {
			return it;
		}
		const columns = ( it.columns || [] ).map( ( col ) => {
			const ci = col.findIndex( ( item ) => item._id === id );
			if ( -1 === ci ) {
				return col;
			}
			const copy = col.slice();
			copy.splice( ci + 1, 0, cloneWithIds( col[ ci ] ) );
			return copy;
		} );
		return { ...it, columns };
	} );
};

/* ---------- Drag containers ---------- */
// Rows and page breaks live at the root only — never inside a column.
const isRootOnly = ( item ) => !! item && ( 'row' === item.kind || 'pagebreak' === item.kind );

// Drop zones are the root list ('root') and each grid column ('col:<rowId>:<ci>').
const ROOT       = 'root';
const colId      = ( rowId, ci ) => `col:${ rowId }:${ ci }`;
const parseColId = ( id ) => {
	if ( 'string' === typeof id && id.startsWith( 'col:' ) ) {
		const parts = id.split( ':' );
		return { rowId: parts[ 1 ], ci: Number( parts[ 2 ] ) };
	}
	return null;
};

// Which container an id sits in: ROOT, a column id, or null.
const findContainer = ( tree, id ) => {
	if ( id === ROOT || parseColId( id ) ) {
		return id;
	}
	for ( const it of tree ) {
		if ( it._id === id ) {
			return ROOT;
		}
		if ( 'row' === it.kind ) {
			const cols = it.columns || [];
			for ( let ci = 0; ci < cols.length; ci++ ) {
				if ( cols[ ci ].some( ( item ) => item._id === id ) ) {
					return colId( it._id, ci );
				}
			}
		}
	}
	return null;
};

const findItemDeep = ( tree, id ) => {
	for ( const it of tree ) {
		if ( it._id === id ) {
			return it;
		}
		if ( 'row' === it.kind ) {
			for ( const col of it.columns || [] ) {
				const hit = col.find( ( item ) => item._id === id );
				if ( hit ) {
					return hit;
				}
			}
		}
	}
	return null;
};

const collectFields = ( tree ) => {
	const out = [];
	const walk = ( list ) => {
		for ( const it of list || [] ) {
			if ( 'row' === it.kind ) {
				( it.columns || [] ).forEach( walk );
			} else if ( 'field' === it.kind && it.name && 'submit' !== it.type ) {
				out.push( it );
			}
		}
	};
	walk( tree );
	return out;
};

const getContainerItems = ( tree, container ) => {
	if ( container === ROOT ) {
		return tree;
	}
	const col = parseColId( container );
	const row = col && tree.find( ( it ) => it._id === col.rowId && 'row' === it.kind );
	return row ? ( row.columns[ col.ci ] || [] ) : [];
};

const setContainerItems = ( tree, container, next ) => {
	if ( container === ROOT ) {
		return next;
	}
	const col = parseColId( container );
	if ( ! col ) {
		return tree;
	}
	return tree.map( ( it ) =>
		( it._id === col.rowId && 'row' === it.kind
			? { ...it, columns: it.columns.map( ( column, columnIndex ) => ( columnIndex === col.ci ? next : column ) ) }
			: it ) );
};

const insertIntoContainer = ( tree, container, item, index ) => {
	const target = getContainerItems( tree, container ).slice();
	target.splice( index, 0, item );
	return setContainerItems( tree, container, target );
};

// Move the dragged item (activeId) to wherever it was dropped (overId).
const moveItem = ( tree, activeId, overId ) => {
	const source = findContainer( tree, activeId );
	let dest     = findContainer( tree, overId );
	if ( ! source || ! dest ) {
		return tree;
	}

	const active = findItemDeep( tree, activeId );
	if ( ! active ) {
		return tree;
	}

	let over = overId;
	// Root-only items (rows, page breaks) never nest in a column. Dropped onto a
	// column, they reorder next to that column's parent row instead.
	if ( isRootOnly( active ) && dest !== ROOT ) {
		const col = parseColId( dest );
		if ( ! col ) {
			return tree;
		}
		dest = ROOT;
		over = col.rowId;
	}

	const overIsContainer = over === ROOT || !! parseColId( over );

	if ( source === dest ) {
		const list = getContainerItems( tree, dest );
		const from = list.findIndex( ( item ) => item._id === activeId );
		const to   = overIsContainer ? list.length - 1 : list.findIndex( ( item ) => item._id === over );
		if ( -1 === from || -1 === to || from === to ) {
			return tree;
		}
		return setContainerItems( tree, dest, arrayMove( list, from, to ) );
	}

	const destList = getContainerItems( tree, dest );
	const overIdx  = destList.findIndex( ( item ) => item._id === over );
	const index    = overIsContainer || -1 === overIdx ? destList.length : overIdx;

	return insertIntoContainer( removeById( tree, activeId ), dest, active, index );
};

// Live cross-container move (onDragOver): pull the dragged field/content out of
// its current container and drop it into `overC` near the hovered item.
const moveToContainer = ( tree, activeId, overId, overC ) => {
	const active = findItemDeep( tree, activeId );
	if ( ! active ) {
		return tree;
	}
	const without         = removeById( tree, activeId );
	const destList        = getContainerItems( without, overC );
	const overIsContainer = overId === ROOT || !! parseColId( overId );
	let index             = destList.length;
	if ( ! overIsContainer ) {
		const found = destList.findIndex( ( item ) => item._id === overId );
		if ( -1 !== found ) {
			index = found;
		}
	}
	return insertIntoContainer( without, overC, active, index );
};

const iconFor = ( type ) => ( ALL_FIELDS.find( ( entry ) => entry.type === type )?.icon ) || Type;

const TEXT_LIKE = [ 'text', 'email', 'tel', 'url', 'number', 'date', 'password', 'textarea' ];
// Types that draw no caption, so a Field label box would edit nothing: a hidden
// field is never shown, a quiz prints its own question, and a count is a number
// beside the field it counts.
const NO_CAPTION = [ 'hidden', 'quiz', 'count' ];
// Why a locked Required toggle is locked. Kept beside the panel rather than in
// field-rules.js so the sentences stay translatable.
const REQUIRED_LOCK_REASON = {
	radio: () => __( 'Contact Form 7 always requires a radio group.', 'essentials-for-contact-form-7' ),
	quiz:  () => __( 'A quiz is only passed by answering it correctly.', 'essentials-for-contact-form-7' ),
};
const CHOICE    = [ 'select', 'checkbox', 'radio' ];

// Types that actually have something to configure on the Validation tab; for the
// rest the tab is hidden rather than shown empty.
const HAS_VALIDATION = [ 'text', 'email', 'tel', 'url', 'password', 'textarea', 'number', 'range', 'date', 'file' ];

// Types that can start with a value resolved at render time. Choice fields are
// excluded (their values are the options); dynamic text has its own source box.
const PREFILLABLE = [ 'text', 'email', 'tel', 'url', 'number', 'range', 'date', 'textarea', 'password', 'hidden', 'country' ];

const CONDITION_OPS = [
	{ id: 'eq',       label: () => __( 'equals', 'essentials-for-contact-form-7' ) },
	{ id: 'neq',      label: () => __( 'not equals', 'essentials-for-contact-form-7' ) },
	{ id: 'gt',       label: () => __( 'greater than', 'essentials-for-contact-form-7' ) },
	{ id: 'lt',       label: () => __( 'less than', 'essentials-for-contact-form-7' ) },
	{ id: 'gte',      label: () => __( 'greater than or equal', 'essentials-for-contact-form-7' ) },
	{ id: 'lte',      label: () => __( 'less than or equal', 'essentials-for-contact-form-7' ) },
	{ id: 'empty',    label: () => __( 'is empty', 'essentials-for-contact-form-7' ) },
	{ id: 'notempty', label: () => __( 'is not empty', 'essentials-for-contact-form-7' ) },
];
const VALUELESS_OPS = [ 'empty', 'notempty' ];

const COLS    = 'cf7e-grid-cols-[20px_28px_minmax(0,1.4fr)_minmax(0,1fr)_120px_104px]';
const inputCls  = `${ control } cf7e-w-full`;
// Same look as `control` but without its fixed height: every Tailwind utility
// here is `!important`, so a height class would beat the inline height the
// browser writes while you drag the resize grip — and the textarea would refuse
// to resize. Initial size comes from the `rows` attribute instead.
const textareaCls = `cf7e-w-full cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-px-3 cf7e-py-2 cf7e-text-sm cf7e-leading-relaxed cf7e-text-ink cf7e-transition-colors ${ focusRing }`;
const ghostBtn  = btnGhost;
const accentBtn = btnPrimary;

/* ---------- Settings form ---------- */
const LField = ( { label, hint, children } ) => (
	<div className="cf7e-flex cf7e-flex-col cf7e-gap-1.5">
		<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-text-ink">{ label }</span>
		{ children }
		{ hint && <span className="cf7e-text-[14px] cf7e-text-stone-400">{ hint }</span> }
	</div>
);

/**
 * One choice per line.
 *
 * The field stores a clean array, but the textarea has to show exactly what is
 * being typed — including the empty line that exists for the instant after you
 * press Enter. Rebuilding the textarea's value from the trimmed array would
 * swallow that newline as fast as it was typed, so the raw text is kept here and
 * only the parsed result travels upward.
 */
const ChoicesEditor = ( { fieldId, choices, onChange } ) => {
	const [ text, setText ] = useState( () => ( choices || [] ).join( '\n' ) );

	// Re-seed only when a different field is opened, never on our own edits.
	useEffect( () => {
		setText( ( choices || [] ).join( '\n' ) );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ fieldId ] );

	return (
		<textarea
			className={ textareaCls }
			rows={ 6 }
			value={ text }
			onChange={ ( event ) => {
				setText( event.target.value );
				onChange( event.target.value.split( '\n' ).map( ( line ) => line.trim() ).filter( Boolean ) );
			} }
		/>
	);
};

const SETTINGS_TABS = [
	{ id: 'general',    label: () => __( 'General', 'essentials-for-contact-form-7' ) },
	{ id: 'validation',  label: () => __( 'Validation', 'essentials-for-contact-form-7' ) },
	{ id: 'conditional', label: () => __( 'Conditional', 'essentials-for-contact-form-7' ) },
	{ id: 'advanced',    label: () => __( 'Advanced', 'essentials-for-contact-form-7' ) },
];

const TwoCol = ( { children } ) => <div className="cf7e-grid cf7e-grid-cols-2 cf7e-gap-3">{ children }</div>;

// Keyed by pattern so the two lists can be checked against each other; the
// strings are literal so a translation scanner can pick them up.
const TEL_FORMAT_LABELS = {
	'':                 () => __( 'No formatting', 'essentials-for-contact-form-7' ),
	'#####-######':     () => __( 'Bangladesh — 01712-345678', 'essentials-for-contact-form-7' ),
	'+## #####-######': () => __( 'Bangladesh with country code', 'essentials-for-contact-form-7' ),
	'(###) ###-####':   () => __( 'US — (212) 555-1234', 'essentials-for-contact-form-7' ),
	'##### ######':     () => __( 'India — 98765 43210', 'essentials-for-contact-form-7' ),
	'+## #### ######':  () => __( 'International', 'essentials-for-contact-form-7' ),
};

/** Every field on the form, flattened out of rows, for the `[name]` helper list. */
const fieldNames = ( items ) => {
	const out = [];
	const walk = ( list ) =>
		( list || [] ).forEach( ( item ) => {
			if ( 'row' === item.kind ) {
				( item.columns || [] ).forEach( walk );
			} else if ( 'field' === item.kind && item.name ) {
				out.push( item.name );
			}
		} );
	walk( items );
	return out;
};

/**
 * Where the form sends people once it is sent.
 *
 * A page is stored by id rather than by address, so renaming it later cannot
 * quietly break the redirect.
 */
const RedirectDestination = ( { redirect, items, onChange } ) => {
	const [ pages, setPages ] = useState( null );
	// null until the visitor picks: the saved settings arrive after this first
	// renders, and their own choice must survive that arriving. See
	// redirect-destination.js.
	const [ chosen, setChosen ] = useState( null );

	useEffect( () => {
		let live = true;
		apiFetch( { path: '/wp/v2/pages?per_page=100&status=publish&orderby=title&order=asc&_fields=id,title' } )
			.then( ( res ) => live && setPages( res ) )
			.catch( () => live && setPages( [] ) );
		return () => { live = false; };
	}, [] );

	const showing   = destinationMode( chosen, redirect );
	const usingPage = PAGE_MODE === showing;

	return (
		<>
			<LField label={ __( 'Redirect after submit', 'essentials-for-contact-form-7' ) }>
				<Select
					value={ destinationMode( chosen, redirect ) }
					onChange={ ( mode ) => {
						const next = chooseDestination( mode );
						setChosen( next.chosen );
						onChange( next.patch );
					} }
					options={ [
						// First, and the one a form starts on: staying put is what
						// most forms do, and it was the only choice here with no way
						// to say it.
						{ value: NONE_MODE, label: __( 'Nowhere — stay on the page', 'essentials-for-contact-form-7' ) },
						{ value: URL_MODE, label: __( 'A web address', 'essentials-for-contact-form-7' ) },
						{ value: PAGE_MODE, label: __( 'A page on this site', 'essentials-for-contact-form-7' ) },
					] }
				/>
			</LField>

			{ NONE_MODE === showing ? null : usingPage ? (
				<LField
					label={ __( 'Page', 'essentials-for-contact-form-7' ) }
					hint={ __( 'Stored by page, not by address — renaming the page keeps the redirect working.', 'essentials-for-contact-form-7' ) }
				>
					{ null === pages ? (
						<div className="cf7e-h-9 cf7e-w-full cf7e-animate-pulse cf7e-rounded-lg cf7e-bg-stone-100" />
					) : (
						// No "— Select a page —" entry: nothing chosen is a page id of
						// 0, which matches no option, and the placeholder says so. An
						// option that unsets the field would be a second way to mean
						// the same thing.
						<Select
							value={ redirect.page_id || 0 }
							onChange={ ( value ) => onChange( { page_id: value } ) }
							placeholder={ __( 'Select a page…', 'essentials-for-contact-form-7' ) }
							options={ pages.map( ( page ) => ( {
								value: page.id,
								label: page.title?.rendered || `#${ page.id }`,
							} ) ) }
						/>
					) }
				</LField>
			) : (
				<LField
					label={ __( 'Web address', 'essentials-for-contact-form-7' ) }
					hint={ sprintf(
						/* translators: %s: an example field name in square brackets. */
						__( 'Leave empty to stay on the page. A field name in square brackets is filled in from the submission — for example %s.', 'essentials-for-contact-form-7' ),
						`[${ fieldNames( items )[ 0 ] || 'your-name' }]`
					) }
				>
					<input
						className={ inputCls }
						type="text"
						placeholder="https://example.com/thank-you"
						value={ redirect.url || '' }
						onChange={ ( event ) => onChange( { url: event.target.value } ) }
					/>
				</LField>
			) }
		</>
	);
};

/**
 * Extra query parameters hung off the destination.
 *
 * Values may name a field, which is how the thank-you page gets to know
 * anything about the submission.
 */
const RedirectParams = ( { redirect, items, onChange } ) => {
	const rows = redirect.params || [];
	const names = fieldNames( items );

	const set = ( i, patch ) =>
		onChange( { params: rows.map( ( row, n ) => ( n === i ? { ...row, ...patch } : row ) ) } );

	return (
		<LField
			label={ __( 'Extra query parameters', 'essentials-for-contact-form-7' ) }
			hint={ __( 'Added to the address. A value in square brackets is filled in from the submission. These end up in the address bar and browser history, so leave personal details out of them.', 'essentials-for-contact-form-7' ) }
		>
			<div className="cf7e-flex cf7e-flex-col cf7e-gap-2">
				{ rows.map( ( row, i ) => (
					<div key={ i } className="cf7e-flex cf7e-items-center cf7e-gap-2">
						<input
							className={ `${ inputCls } cf7e-w-40` }
							placeholder={ __( 'name', 'essentials-for-contact-form-7' ) }
							value={ row.key || '' }
							onChange={ ( event ) => set( i, { key: event.target.value } ) }
						/>
						<input
							className={ inputCls }
							placeholder={ names[ 0 ] ? `[${ names[ 0 ] }]` : __( 'value', 'essentials-for-contact-form-7' ) }
							value={ row.value || '' }
							onChange={ ( event ) => set( i, { value: event.target.value } ) }
						/>
						<button
							type="button"
							className={ btnGhost }
							aria-label={ __( 'Remove', 'essentials-for-contact-form-7' ) }
							onClick={ () => onChange( { params: rows.filter( ( _, n ) => n !== i ) } ) }
						>
							<Trash2 className="cf7e-h-4 cf7e-w-4" />
						</button>
					</div>
				) ) }

				<button
					type="button"
					className={ `${ btnGhost } cf7e-self-start` }
					onClick={ () => onChange( { params: [ ...rows, { key: '', value: '' } ] } ) }
				>
					<Plus className="cf7e-h-4 cf7e-w-4" />
					{ __( 'Add parameter', 'essentials-for-contact-form-7' ) }
				</button>

				{ !! names.length && (
					<p className="cf7e-text-[14px] cf7e-text-stone-400">
						{ __( 'Available fields:', 'essentials-for-contact-form-7' ) }{ ' ' }
						<code>{ names.map( ( name ) => `[${ name }]` ).join( ' ' ) }</code>
					</p>
				) }
			</div>
		</LField>
	);
};

/**
 * Phone number format picker.
 *
 * Its own component because "is this custom?" is a piece of editor state, not
 * something the saved pattern can answer — see tel-format.js.
 */
const TelFormatField = ( { field, onChange } ) => {
	const pattern = field.telformat || '';
	const [ custom, setCustom ] = useState( () => startsCustom( pattern ) );

	return (
		<>
			<LField
				label={ __( 'Number format', 'essentials-for-contact-form-7' ) }
				hint={ __( 'Typed digits are laid into this pattern. # is a digit; everything else is punctuation the field adds itself. A format always implies numbers only.', 'essentials-for-contact-form-7' ) }
			>
				<select
					className={ inputCls }
					value={ selectValue( pattern, custom ) }
					onChange={ ( event ) => {
						const next = pickTelFormat( event.target.value, pattern );
						setCustom( next.custom );
						onChange( { telformat: next.pattern } );
					} }
				>
					{ TEL_PATTERNS.map( ( preset ) => (
						<option key={ preset } value={ preset }>{ ( TEL_FORMAT_LABELS[ preset ] || ( () => preset ) )() }</option>
					) ) }
					<option value={ TEL_CUSTOM }>{ __( 'Custom…', 'essentials-for-contact-form-7' ) }</option>
				</select>
			</LField>
			{ custom && (
				<LField label={ __( 'Custom pattern', 'essentials-for-contact-form-7' ) }>
					<input
						className={ inputCls }
						value={ pattern }
						placeholder="+## ####-######"
						onChange={ ( event ) => onChange( { telformat: event.target.value } ) }
					/>
				</LField>
			) }
		</>
	);
};

const ContentSettings = ( { field, onChange } ) => {
	const kind = field.type;

	if ( 'heading' === kind ) {
		return (
			<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
				<LField label={ __( 'Text', 'essentials-for-contact-form-7' ) }>
					<input className={ inputCls } value={ field.text || '' } onChange={ ( event ) => onChange( { text: event.target.value } ) } />
				</LField>
				<div className="cf7e-grid cf7e-grid-cols-2 cf7e-gap-3">
					<LField label={ __( 'Level', 'essentials-for-contact-form-7' ) }>
						<Select
							inline
							value={ field.level || 'h2' }
							onChange={ ( value ) => onChange( { level: value } ) }
							options={ [
								{ value: 'h2', label: 'H2' },
								{ value: 'h3', label: 'H3' },
								{ value: 'h4', label: 'H4' },
							] }
						/>
					</LField>
					<LField label={ __( 'Align', 'essentials-for-contact-form-7' ) }>
						<Select
							inline
							value={ field.align || 'left' }
							onChange={ ( value ) => onChange( { align: value } ) }
							options={ [
								{ value: 'left', label: __( 'Left', 'essentials-for-contact-form-7' ) },
								{ value: 'center', label: __( 'Center', 'essentials-for-contact-form-7' ) },
								{ value: 'right', label: __( 'Right', 'essentials-for-contact-form-7' ) },
							] }
						/>
					</LField>
				</div>
			</div>
		);
	}

	if ( 'paragraph' === kind ) {
		return (
			<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
				<LField label={ __( 'Text', 'essentials-for-contact-form-7' ) }>
					<textarea className={ textareaCls } rows={ 6 } value={ field.text || '' } onChange={ ( event ) => onChange( { text: event.target.value } ) } />
				</LField>
				<div className="cf7e-grid cf7e-grid-cols-2 cf7e-gap-3">
					<LField label={ __( 'Size', 'essentials-for-contact-form-7' ) }>
						<Select
							inline
							value={ field.size || 'md' }
							onChange={ ( value ) => onChange( { size: value } ) }
							options={ [
								{ value: 'sm', label: __( 'Small', 'essentials-for-contact-form-7' ) },
								{ value: 'md', label: __( 'Medium', 'essentials-for-contact-form-7' ) },
								{ value: 'lg', label: __( 'Large', 'essentials-for-contact-form-7' ) },
							] }
						/>
					</LField>
					<LField label={ __( 'Align', 'essentials-for-contact-form-7' ) }>
						<Select
							inline
							value={ field.align || 'left' }
							onChange={ ( value ) => onChange( { align: value } ) }
							options={ [
								{ value: 'left', label: __( 'Left', 'essentials-for-contact-form-7' ) },
								{ value: 'center', label: __( 'Center', 'essentials-for-contact-form-7' ) },
								{ value: 'right', label: __( 'Right', 'essentials-for-contact-form-7' ) },
							] }
						/>
					</LField>
				</div>
			</div>
		);
	}

	if ( 'divider' === kind ) {
		return (
			<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
				<div className="cf7e-grid cf7e-grid-cols-2 cf7e-gap-3">
					<LField label={ __( 'Style', 'essentials-for-contact-form-7' ) }>
						<Select
							inline
							value={ field.style || 'solid' }
							onChange={ ( value ) => onChange( { style: value } ) }
							options={ [
								{ value: 'solid', label: __( 'Solid', 'essentials-for-contact-form-7' ) },
								{ value: 'dashed', label: __( 'Dashed', 'essentials-for-contact-form-7' ) },
								{ value: 'dotted', label: __( 'Dotted', 'essentials-for-contact-form-7' ) },
							] }
						/>
					</LField>
					<LField label={ __( 'Thickness (px)', 'essentials-for-contact-form-7' ) }>
						<input type="number" min="1" max="6" className={ inputCls } value={ field.thickness || 1 } onChange={ ( event ) => onChange( { thickness: Number( event.target.value ) || 1 } ) } />
					</LField>
				</div>
				<LField label={ __( 'Weight', 'essentials-for-contact-form-7' ) }>
					<Select
						inline
						value={ field.tier || 'subtle' }
						onChange={ ( value ) => onChange( { tier: value } ) }
						options={ [
							{ value: 'subtle', label: __( 'Subtle', 'essentials-for-contact-form-7' ) },
							{ value: 'normal', label: __( 'Normal', 'essentials-for-contact-form-7' ) },
							{ value: 'strong', label: __( 'Strong', 'essentials-for-contact-form-7' ) },
						] }
					/>
				</LField>
			</div>
		);
	}

	if ( 'spacer' === kind ) {
		return (
			<LField label={ __( 'Height (px)', 'essentials-for-contact-form-7' ) }>
				<input type="number" min="0" max="200" className={ inputCls } value={ field.height || 16 } onChange={ ( event ) => onChange( { height: Number( event.target.value ) || 0 } ) } />
			</LField>
		);
	}

	return null;
};

const FieldSettingsForm = ( { field, onChange, availableFields = [], tab = 'general', onTab = () => {} } ) => {
	const t   = field.type;
	const opt = field.options || {};
	const setOption = ( name, value ) => onChange( { options: { ...opt, [ name ]: value } } );

	// Dynamic fields are one of three display modes, stored as bare tag flags.
	const dynamicMode = opt.hidden ? 'hidden' : ( opt.readonly ? 'readonly' : 'visible' );
	const setDynamicMode = ( mode ) => {
		const next = { ...opt };
		delete next.readonly;
		delete next.hidden;
		if ( 'readonly' === mode ) {
			next.readonly = true;
		}
		if ( 'hidden' === mode ) {
			next.hidden = true;
		}
		onChange( { options: next } );
	};

	// Only a field with a length worth watching. CF7 reads the counted field's
	// maxlength, and every other type either has none or is not typed into.
	const countTargets = availableFields.filter( ( other ) => TEXT_LIKE.includes( other.type ) );

	const setLabel = ( label ) => {
		const patch = { label };
		// The name follows the caption until the user edits it by hand, at which
		// point it is theirs and this stops touching it.
		if ( ! field._nameTouched ) {
			patch.name = slug( label );
		}
		onChange( patch );
	};

	if ( 'content' === field.kind ) {
		return <ContentSettings field={ field } onChange={ onChange } />;
	}

	if ( 'submit' === t ) {
		return (
			<LField label={ __( 'Button label', 'essentials-for-contact-form-7' ) }>
				<input className={ inputCls } value={ field.label || '' } onChange={ ( event ) => onChange( { label: event.target.value } ) } />
			</LField>
		);
	}

	return (
		<>
			<Tabs
				className="cf7e-mb-5"
				active={ tab }
				onChange={ onTab }
				tabs={ SETTINGS_TABS
					.filter( ( tb ) => 'validation' !== tb.id || HAS_VALIDATION.includes( t ) )
					.map( ( tb ) => ( { id: tb.id, label: tb.label() } ) ) }
			/>

			<div key={ tab }>

			{ 'general' === tab && (
				<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
					{ /* A field that renders no caption of its own gets no label box. */ }
					{ ! NO_CAPTION.includes( t ) && (
						<LField
							label={ 'acceptance' === t ? __( 'Consent text', 'essentials-for-contact-form-7' ) : __( 'Field label', 'essentials-for-contact-form-7' ) }
							hint={ 'acceptance' === t ? __( 'Shown next to the consent checkbox.', 'essentials-for-contact-form-7' ) : undefined }
						>
							<input className={ inputCls } value={ field.label || '' } onChange={ ( event ) => setLabel( event.target.value ) } />
						</LField>
					) }
					{ 'count' === t ? (
						<LField
							label={ __( 'Counts', 'essentials-for-contact-form-7' ) }
							hint={ __( 'The field being typed into. A count carries the name of that field rather than one of its own.', 'essentials-for-contact-form-7' ) }
						>
							{ countTargets.length ? (
								<Select
									inline
									value={ field.name || '' }
									onChange={ ( value ) => onChange( { name: value, _nameTouched: true } ) }
									options={ countTargets.map( ( other ) => ( { value: other.name, label: other.label || other.name } ) ) }
								/>
							) : (
								<div className="cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-p-3.5 cf7e-text-[14px] cf7e-leading-relaxed cf7e-text-stone-500">
									{ __( 'Add a text or textarea field first — a count needs something to count.', 'essentials-for-contact-form-7' ) }
								</div>
							) }
						</LField>
					) : (
						<LField label={ __( 'Field name', 'essentials-for-contact-form-7' ) } hint={ __( 'The name used in the form tag.', 'essentials-for-contact-form-7' ) }>
							<input className={ inputCls } value={ field.name || '' } onChange={ ( event ) => onChange( { name: slug( event.target.value ), _nameTouched: true } ) } />
						</LField>
					) }
					{ 'hidden' === t && (
						<LField label={ __( 'Value', 'essentials-for-contact-form-7' ) } hint={ __( 'Submitted with the form but never shown to the visitor. Leave empty to fill it from Pre-fill instead.', 'essentials-for-contact-form-7' ) }>
							<input className={ inputCls } value={ field.default || '' } onChange={ ( event ) => onChange( { default: event.target.value } ) } />
						</LField>
					) }
					{ showsRequired( t ) && (
						<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
							<div className="cf7e-flex cf7e-flex-col">
								<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Required field', 'essentials-for-contact-form-7' ) }</span>
								{ requiredLocked( t ) && !! REQUIRED_LOCK_REASON[ t ] && (
									<span className="cf7e-text-[14px] cf7e-text-stone-400">{ REQUIRED_LOCK_REASON[ t ]() }</span>
								) }
							</div>
							<Toggle
								checked={ isRequired( t, field.required ) }
								onChange={ ( value ) => onChange( { required: value } ) }
								disabled={ requiredLocked( t ) }
							/>
						</div>
					) }
					{ 'tel' === t && (
						<>
							<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
								<div className="cf7e-flex cf7e-flex-col">
									<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Numbers only', 'essentials-for-contact-form-7' ) }</span>
									<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Letters cannot be typed or pasted into the field.', 'essentials-for-contact-form-7' ) }</span>
								</div>
								<Toggle
									checked={ !! field.digitsonly || !! field.telformat }
									onChange={ ( value ) => onChange( { digitsonly: value } ) }
									disabled={ !! field.telformat }
								/>
							</div>
							<TelFormatField field={ field } onChange={ onChange } />
						</>
					) }
					{ 'date' === t && (
						<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
							<div className="cf7e-flex cf7e-flex-col">
								<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Styled date picker', 'essentials-for-contact-form-7' ) }</span>
								<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Off uses the browser native picker.', 'essentials-for-contact-form-7' ) }</span>
							</div>
							<Toggle checked={ 'native' !== ( field.picker || 'styled' ) } onChange={ ( value ) => onChange( { picker: value ? 'styled' : 'native' } ) } />
						</div>
					) }
					{ 'acceptance' === t && (
						<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
							<div className="cf7e-flex cf7e-flex-col">
								<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Pre-checked', 'essentials-for-contact-form-7' ) }</span>
								<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Tick the box by default.', 'essentials-for-contact-form-7' ) }</span>
							</div>
							<Toggle checked={ 'on' === field.default } onChange={ ( value ) => onChange( { default: value ? 'on' : '' } ) } />
						</div>
					) }
					{ 'submission_id' === t && (
						<>
							<div className="cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-p-3.5 cf7e-text-[14px] cf7e-leading-relaxed cf7e-text-stone-500">
								{ __( 'A sequential number, allocated when the form is sent. It is never shown on the page — printing it would tell visitors how many submissions you have had — so use it in the mail template as [your-field-name].', 'essentials-for-contact-form-7' ) }
							</div>
							<TwoCol>
								<LField label={ __( 'Prefix', 'essentials-for-contact-form-7' ) } hint={ __( 'e.g. INV-', 'essentials-for-contact-form-7' ) }>
									<input className={ inputCls } value={ opt.prefix || '' } placeholder={ __( 'INV-', 'essentials-for-contact-form-7' ) } onChange={ ( event ) => setOption( 'prefix', event.target.value.replace( /\s/g, '' ) ) } />
								</LField>
								<LField label={ __( 'Digits', 'essentials-for-contact-form-7' ) } hint={ __( '5 → 00042', 'essentials-for-contact-form-7' ) }>
									<input type="number" min="0" max="12" className={ inputCls } value={ opt.pad || '' } onChange={ ( event ) => setOption( 'pad', event.target.value ) } />
								</LField>
							</TwoCol>
						</>
					) }
					{ 'product' === t && (
						<>
							<TwoCol>
								<LField label={ __( 'Category slug', 'essentials-for-contact-form-7' ) } hint={ __( 'Empty lists every category.', 'essentials-for-contact-form-7' ) }>
									<input className={ inputCls } value={ opt.cat || '' } placeholder="t-shirts" onChange={ ( event ) => setOption( 'cat', event.target.value ) } />
								</LField>
								<LField label={ __( 'Maximum products', 'essentials-for-contact-form-7' ) }>
									<input type="number" min="1" max="200" className={ inputCls } value={ opt.limit || '' } placeholder="50" onChange={ ( event ) => setOption( 'limit', event.target.value ) } />
								</LField>
							</TwoCol>
							<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
								<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Show the price', 'essentials-for-contact-form-7' ) }</span>
								<Toggle checked={ !! opt.show_price } onChange={ ( value ) => setOption( 'show_price', value || undefined ) } />
							</div>
							<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
								<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'In-stock products only', 'essentials-for-contact-form-7' ) }</span>
								<Toggle checked={ !! opt.in_stock } onChange={ ( value ) => setOption( 'in_stock', value || undefined ) } />
							</div>
						</>
					) }
					{ 'rating' === t && (
						<LField label={ __( 'Stars', 'essentials-for-contact-form-7' ) } hint={ __( 'Number of stars (1–10).', 'essentials-for-contact-form-7' ) }>
							<input type="number" min="1" max="10" className={ inputCls } value={ opt.max || '5' } onChange={ ( event ) => setOption( 'max', event.target.value ) } />
						</LField>
					) }
					{ 'dynamictext' === t && (
						<>
							<LField
								label={ __( 'Dynamic value source', 'essentials-for-contact-form-7' ) }
								hint={ __( 'url:ref reads ?ref= from the URL. Also: post:title · post:url · post:id · user:email · user:name · today · now.', 'essentials-for-contact-form-7' ) }
							>
								<input className={ inputCls } value={ field.default || '' } placeholder="url:ref" onChange={ ( event ) => onChange( { default: event.target.value } ) } />
							</LField>
							<LField label={ __( 'Display', 'essentials-for-contact-form-7' ) } hint={ __( 'Hidden posts the value without showing it — best for tracking codes.', 'essentials-for-contact-form-7' ) }>
								<Select
									inline
									value={ dynamicMode }
									onChange={ setDynamicMode }
									options={ [
										{ value: 'visible', label: __( 'Visible — visitor can edit', 'essentials-for-contact-form-7' ) },
										{ value: 'readonly', label: __( 'Read-only — shown, not editable', 'essentials-for-contact-form-7' ) },
										{ value: 'hidden', label: __( 'Hidden — not shown', 'essentials-for-contact-form-7' ) },
									] }
								/>
							</LField>
						</>
					) }
					{ TEXT_LIKE.includes( t ) && (
						<LField label={ __( 'Placeholder', 'essentials-for-contact-form-7' ) }>
							<input className={ inputCls } value={ field.placeholder || '' } onChange={ ( event ) => onChange( { placeholder: event.target.value } ) } />
						</LField>
					) }
					{ hasDefaultChoice( t ) && !! ( field.choices || [] ).length && (
						<LField
							label={ __( 'Selected by default', 'essentials-for-contact-form-7' ) }
							hint={ __( 'Which choice starts out picked. Reordering or removing choices clears this.', 'essentials-for-contact-form-7' ) }
						>
							<select
								className={ inputCls }
								value={ defaultChoice( opt.default, field.choices ) }
								onChange={ ( event ) => setOption( 'default', parseInt( event.target.value, 10 ) || undefined ) }
							>
								<option value={ 0 }>{ __( 'Nothing', 'essentials-for-contact-form-7' ) }</option>
								{ ( field.choices || [] ).map( ( choice, i ) => (
									<option key={ i } value={ i + 1 }>{ choice }</option>
								) ) }
							</select>
						</LField>
					) }
					{ 'quiz' === t && (
						<LField
							label={ __( 'Questions, one per line', 'essentials-for-contact-form-7' ) }
							hint={ __( 'Written question|answer. One is asked at random each time the form is shown, and the answer is matched ignoring case and spacing.', 'essentials-for-contact-form-7' ) }
						>
							<ChoicesEditor
								fieldId={ field._id }
								choices={ field.choices }
								onChange={ ( choices ) => onChange( { choices } ) }
							/>
						</LField>
					) }
					{ 'count' === t && (
						<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
							<div className="cf7e-flex cf7e-flex-col">
								<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Count down', 'essentials-for-contact-form-7' ) }</span>
								<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Characters left rather than characters typed. It needs a maximum length on the counted field to count down from.', 'essentials-for-contact-form-7' ) }</span>
							</div>
							<Toggle checked={ !! opt.down } onChange={ ( value ) => setOption( 'down', value || undefined ) } />
						</div>
					) }
					{ CHOICE.includes( t ) && (
						<LField label={ __( 'Choices (one per line)', 'essentials-for-contact-form-7' ) }>
							<ChoicesEditor
								fieldId={ field._id }
								choices={ field.choices }
								onChange={ ( choices ) => onChange( { choices } ) }
							/>
						</LField>
					) }
					{ [ 'select', 'country' ].includes( t ) && (
						<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
							<div className="cf7e-flex cf7e-flex-col">
								<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Searchable', 'essentials-for-contact-form-7' ) }</span>
								<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Adds a filter box inside the dropdown.', 'essentials-for-contact-form-7' ) }</span>
							</div>
							<Toggle checked={ !! field.searchable } onChange={ ( value ) => onChange( { searchable: value } ) } />
						</div>
					) }
					{ 'select' === t && (
						<>
							<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
								<div className="cf7e-flex cf7e-flex-col">
									<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Allow multiple selections', 'essentials-for-contact-form-7' ) }</span>
									<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Renders a multi-select list.', 'essentials-for-contact-form-7' ) }</span>
								</div>
								<Toggle checked={ !! opt.multiple } onChange={ ( value ) => setOption( 'multiple', value || undefined ) } />
							</div>
							<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
								<div className="cf7e-flex cf7e-flex-col">
									<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Blank first option', 'essentials-for-contact-form-7' ) }</span>
									<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Starts empty so nothing is preselected.', 'essentials-for-contact-form-7' ) }</span>
								</div>
								<Toggle checked={ !! opt.include_blank } onChange={ ( value ) => setOption( 'include_blank', value || undefined ) } />
							</div>
						</>
					) }
					{ [ 'checkbox', 'radio' ].includes( t ) && (
						<LField label={ __( 'Layout', 'essentials-for-contact-form-7' ) }>
							<Select
								inline
								value={ field.layout || 'list' }
								onChange={ ( value ) => onChange( { layout: value } ) }
								options={ [
									{ value: 'list', label: __( 'List — one per line', 'essentials-for-contact-form-7' ) },
									{ value: 'inline', label: __( 'Inline — side by side', 'essentials-for-contact-form-7' ) },
									{ value: 'cards', label: __( 'Cards — clickable boxes', 'essentials-for-contact-form-7' ) },
								] }
							/>
						</LField>
					) }
					{ 'checkbox' === t && (
						<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
							<div className="cf7e-flex cf7e-flex-col">
								<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Exclusive', 'essentials-for-contact-form-7' ) }</span>
								<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Only one box can be ticked at a time.', 'essentials-for-contact-form-7' ) }</span>
							</div>
							<Toggle checked={ !! opt.exclusive } onChange={ ( value ) => setOption( 'exclusive', value || undefined ) } />
						</div>
					) }
				</div>
			) }

			{ 'validation' === tab && (
				<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
					{ [ 'text', 'email', 'tel', 'url', 'password', 'textarea' ].includes( t ) && (
						<TwoCol>
							<LField label={ __( 'Min length', 'essentials-for-contact-form-7' ) }>
								<input type="number" min="0" className={ inputCls } value={ opt.minlength || '' } onChange={ ( event ) => setOption( 'minlength', event.target.value ) } />
							</LField>
							<LField label={ __( 'Max length', 'essentials-for-contact-form-7' ) }>
								<input type="number" min="0" className={ inputCls } value={ opt.maxlength || '' } onChange={ ( event ) => setOption( 'maxlength', event.target.value ) } />
							</LField>
						</TwoCol>
					) }
					{ ( 'number' === t || 'range' === t ) && (
						<>
							<TwoCol>
								<LField label={ __( 'Min', 'essentials-for-contact-form-7' ) }>
									<input type="number" className={ inputCls } value={ opt.min || '' } onChange={ ( event ) => setOption( 'min', event.target.value ) } />
								</LField>
								<LField label={ __( 'Max', 'essentials-for-contact-form-7' ) }>
									<input type="number" className={ inputCls } value={ opt.max || '' } onChange={ ( event ) => setOption( 'max', event.target.value ) } />
								</LField>
							</TwoCol>
							<LField label={ __( 'Step', 'essentials-for-contact-form-7' ) }>
								<input type="text" className={ inputCls } value={ opt.step || '' } onChange={ ( event ) => setOption( 'step', event.target.value ) } />
							</LField>
						</>
					) }
					{ 'date' === t && (
						<TwoCol>
							<LField label={ __( 'Min date', 'essentials-for-contact-form-7' ) }>
								<input type="date" className={ inputCls } value={ opt.min || '' } onChange={ ( event ) => setOption( 'min', event.target.value ) } />
							</LField>
							<LField label={ __( 'Max date', 'essentials-for-contact-form-7' ) }>
								<input type="date" className={ inputCls } value={ opt.max || '' } onChange={ ( event ) => setOption( 'max', event.target.value ) } />
							</LField>
						</TwoCol>
					) }
					{ 'file' === t && (
						<>
							<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
								<div className="cf7e-flex cf7e-flex-col">
									<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Allow multiple files', 'essentials-for-contact-form-7' ) }</span>
									<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Visitors can attach more than one file.', 'essentials-for-contact-form-7' ) }</span>
								</div>
								<Toggle checked={ !! opt.multiple } onChange={ ( value ) => setOption( 'multiple', value || undefined ) } />
							</div>
							{ !! opt.multiple && (
								<LField label={ __( 'Maximum number of files', 'essentials-for-contact-form-7' ) } hint={ __( 'Leave empty for no limit.', 'essentials-for-contact-form-7' ) }>
									<input type="number" min="1" className={ inputCls } value={ opt.maxfiles || '' } placeholder="5" onChange={ ( event ) => setOption( 'maxfiles', event.target.value ) } />
								</LField>
							) }
							<LField label={ __( 'Allowed file types', 'essentials-for-contact-form-7' ) } hint={ __( 'Extensions separated by | — e.g. jpg|jpeg|png|pdf. Empty allows the WordPress defaults.', 'essentials-for-contact-form-7' ) }>
								<input className={ inputCls } value={ opt.filetypes || '' } placeholder="jpg|jpeg|png|pdf" onChange={ ( event ) => setOption( 'filetypes', event.target.value ) } />
							</LField>
							<LField label={ __( 'Maximum file size', 'essentials-for-contact-form-7' ) } hint={ __( 'Per file — e.g. 2mb or 512kb. Cannot exceed the server upload limit.', 'essentials-for-contact-form-7' ) }>
								<input className={ inputCls } value={ opt.limit || '' } placeholder="2mb" onChange={ ( event ) => setOption( 'limit', event.target.value ) } />
							</LField>
						</>
					) }
				</div>
			) }

			{ 'conditional' === tab && (
				<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
					<div className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-3.5 cf7e-py-2.5">
						<div className="cf7e-flex cf7e-flex-col">
							<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ __( 'Conditional display', 'essentials-for-contact-form-7' ) }</span>
							<span className="cf7e-text-[14px] cf7e-text-stone-400">{ __( 'Show or hide this field based on another field.', 'essentials-for-contact-form-7' ) }</span>
						</div>
						<Toggle
							checked={ !! field.condition }
							onChange={ ( value ) => onChange( { condition: value ? { action: 'show', groups: [ { rules: [ { field: '', operator: 'eq', value: '' } ] } ] } : undefined } ) }
						/>
					</div>

					{ field.condition && (
						availableFields.length ? (
							( () => {
								const groups   = field.condition.groups;
								const setGroups = ( nextGroups ) => onChange( { condition: { ...field.condition, groups: nextGroups } } );
								return (
									<div className="cf7e-flex cf7e-flex-col cf7e-gap-2">
										<div className="cf7e-flex cf7e-items-center cf7e-gap-2 cf7e-text-sm cf7e-text-stone-500">
											<Select
												className="cf7e-w-40"
												value={ field.condition.action || 'show' }
												onChange={ ( value ) => onChange( { condition: { ...field.condition, action: value } } ) }
												options={ [
													{ value: 'show', label: __( 'Show this field', 'essentials-for-contact-form-7' ) },
													{ value: 'hide', label: __( 'Hide this field', 'essentials-for-contact-form-7' ) },
												] }
											/>
											<span>{ __( 'when', 'essentials-for-contact-form-7' ) }</span>
										</div>
										{ groups.map( ( group, gi ) => (
											<Fragment key={ gi }>
												{ gi > 0 && (
													<div className="cf7e-flex cf7e-items-center cf7e-gap-2 cf7e-py-0.5">
														<span className="cf7e-h-px cf7e-flex-1 cf7e-bg-line" />
														<span className="cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-widest cf7e-text-stone-400">{ __( 'or', 'essentials-for-contact-form-7' ) }</span>
														<span className="cf7e-h-px cf7e-flex-1 cf7e-bg-line" />
													</div>
												) }
												<div className="cf7e-flex cf7e-flex-col cf7e-gap-1.5 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-p-2">
													{ group.rules.map( ( rule, ri ) => {
														const setRule = ( patch ) => setGroups( groups.map( ( each, eachIndex ) => ( eachIndex === gi ? { ...each, rules: each.rules.map( ( eachRule, eachRuleIndex ) => ( eachRuleIndex === ri ? { ...eachRule, ...patch } : eachRule ) ) } : each ) ) );
														const dropRule = () => {
															let next = groups.map( ( each, eachIndex ) => ( eachIndex === gi ? { ...each, rules: each.rules.filter( ( _, eachRuleIndex ) => eachRuleIndex !== ri ) } : each ) ).filter( ( each ) => each.rules.length );
															if ( ! next.length ) {
																next = [ { rules: [ { field: '', operator: 'eq', value: '' } ] } ];
															}
															setGroups( next );
														};
														return (
															<div key={ ri } className="cf7e-flex cf7e-flex-col cf7e-gap-1.5">
																{ ri > 0 && <span className="cf7e-pl-0.5 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">{ __( 'and', 'essentials-for-contact-form-7' ) }</span> }
																<div className="cf7e-flex cf7e-items-start cf7e-gap-1.5">
																	<Select
																		inline
																		className="cf7e-min-w-0 cf7e-basis-0 cf7e-flex-1"
																		placeholder={ __( 'Field…', 'essentials-for-contact-form-7' ) }
																		value={ rule.field }
																		onChange={ ( value ) => setRule( { field: value } ) }
																		options={ availableFields.map( ( other ) => ( { value: other.name, label: other.label || other.name } ) ) }
																	/>
																	<Select
																		inline
																		className="cf7e-w-44 cf7e-shrink-0"
																		value={ rule.operator }
																		onChange={ ( value ) => setRule( { operator: value } ) }
																		options={ CONDITION_OPS.map( ( op ) => ( { value: op.id, label: op.label() } ) ) }
																	/>
																	{ ! VALUELESS_OPS.includes( rule.operator ) && (
																		<div className="cf7e-min-w-0 cf7e-basis-0 cf7e-flex-1">
																			<input className={ inputCls } value={ rule.value || '' } placeholder={ __( 'Value', 'essentials-for-contact-form-7' ) } onChange={ ( event ) => setRule( { value: event.target.value } ) } />
																		</div>
																	) }
																	<button type="button" className="cf7e-flex cf7e-h-9 cf7e-shrink-0 cf7e-items-center cf7e-text-stone-400 hover:cf7e-text-red-500" onClick={ dropRule } aria-label={ __( 'Remove', 'essentials-for-contact-form-7' ) }>
																		<X className="cf7e-h-4 cf7e-w-4" />
																	</button>
																</div>
															</div>
														);
													} ) }
													<button
														type="button"
														className="cf7e-flex cf7e-items-center cf7e-gap-1 cf7e-self-start cf7e-pl-0.5 cf7e-pt-0.5 cf7e-text-[14px] cf7e-font-semibold cf7e-text-ink/60 hover:cf7e-text-ink"
														onClick={ () => setGroups( groups.map( ( each, eachIndex ) => ( eachIndex === gi ? { ...each, rules: [ ...each.rules, { field: '', operator: 'eq', value: '' } ] } : each ) ) ) }
													>
														<Plus className="cf7e-h-3.5 cf7e-w-3.5" /> { __( 'AND', 'essentials-for-contact-form-7' ) }
													</button>
												</div>
											</Fragment>
										) ) }
										<button
											type="button"
											className={ `${ ghostBtn } cf7e-self-start` }
											onClick={ () => setGroups( [ ...groups, { rules: [ { field: '', operator: 'eq', value: '' } ] } ] ) }
										>
											<Plus className="cf7e-h-4 cf7e-w-4" /> { __( 'OR group', 'essentials-for-contact-form-7' ) }
										</button>
									</div>
								);
							} )()
						) : (
							<p className="cf7e-text-sm cf7e-text-stone-400">{ __( 'Add another named field first to build a rule.', 'essentials-for-contact-form-7' ) }</p>
						)
					) }
				</div>
			) }

			{ 'advanced' === tab && (
				<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
					{ ( TEXT_LIKE.includes( t ) || 'range' === t ) && (
						<LField label={ __( 'Default value', 'essentials-for-contact-form-7' ) }>
							<input className={ inputCls } value={ field.default || '' } onChange={ ( event ) => onChange( { default: event.target.value } ) } />
						</LField>
					) }
					{ PREFILLABLE.includes( t ) && (
						<LField
							label={ __( 'Pre-fill from', 'essentials-for-contact-form-7' ) }
							hint={ __( 'Start the field with a value read at page load: url:ref · cookie:name · user:email · user:name · user:first · user:last · post:title · post:url · referrer · today · now. Overrides the placeholder when it resolves.', 'essentials-for-contact-form-7' ) }
						>
							<input className={ inputCls } value={ opt.prefill || '' } placeholder="url:ref" onChange={ ( event ) => setOption( 'prefill', event.target.value ) } />
						</LField>
					) }
					<LField label={ __( 'CSS class', 'essentials-for-contact-form-7' ) } hint={ __( 'Space-separated class names.', 'essentials-for-contact-form-7' ) }>
						<input className={ inputCls } value={ opt.class || '' } onChange={ ( event ) => setOption( 'class', event.target.value ) } />
					</LField>
					<LField label={ __( 'ID attribute', 'essentials-for-contact-form-7' ) }>
						<input className={ inputCls } value={ opt.id || '' } onChange={ ( event ) => setOption( 'id', event.target.value ) } />
					</LField>
					{ TEXT_LIKE.includes( t ) && (
						<LField label={ __( 'Autocomplete', 'essentials-for-contact-form-7' ) } hint={ __( 'e.g. name, email, tel, off', 'essentials-for-contact-form-7' ) }>
							<input className={ inputCls } value={ opt.autocomplete || '' } onChange={ ( event ) => setOption( 'autocomplete', event.target.value ) } />
						</LField>
					) }
				</div>
			) }
			</div>
		</>
	);
};

/* ---------- Type picker ---------- */
/**
 * Settings for the step a page break opens.
 *
 * A break belongs to the step *after* it, which is what the wording here says —
 * getting that backwards is the easy mistake, and it is the same convention
 * steps.js reads the divider by.
 *
 * `nav` says which navigation buttons that step renders, so the form can leave
 * out the wording for one it does not have.
 */
const StepSettingsForm = ( { step, nav, onChange } ) => (
	<div className="cf7e-flex cf7e-flex-col cf7e-gap-4">
		<LField label={ __( 'Step title', 'essentials-for-contact-form-7' ) } hint={ __( 'Shown above the fields on this step.', 'essentials-for-contact-form-7' ) }>
			<input
				className={ inputCls }
				type="text"
				value={ step.title || '' }
				onChange={ ( event ) => onChange( { title: event.target.value } ) }
				placeholder={ __( 'Your details', 'essentials-for-contact-form-7' ) }
			/>
		</LField>

		<LField label={ __( 'Description', 'essentials-for-contact-form-7' ) } hint={ __( 'A line of guidance under the title.', 'essentials-for-contact-form-7' ) }>
			<textarea
				className={ textareaCls }
				rows={ 2 }
				value={ step.desc || '' }
				onChange={ ( event ) => onChange( { desc: event.target.value } ) }
			/>
		</LField>

		<TwoCol>
			{ nav.next && (
				<LField label={ __( 'Next button', 'essentials-for-contact-form-7' ) } hint={ __( 'Default: Next', 'essentials-for-contact-form-7' ) }>
					<input className={ inputCls } type="text" value={ step.next || '' } onChange={ ( event ) => onChange( { next: event.target.value } ) } />
				</LField>
			) }
			{ nav.prev && (
				<LField label={ __( 'Back button', 'essentials-for-contact-form-7' ) } hint={ __( 'Default: Back', 'essentials-for-contact-form-7' ) }>
					<input className={ inputCls } type="text" value={ step.prev || '' } onChange={ ( event ) => onChange( { prev: event.target.value } ) } />
				</LField>
			) }
		</TwoCol>

		<TwoCol>
			<LField label={ __( 'CSS class', 'essentials-for-contact-form-7' ) } hint={ __( 'Added to this step’s wrapper.', 'essentials-for-contact-form-7' ) }>
				<input className={ inputCls } type="text" value={ step.class || '' } onChange={ ( event ) => onChange( { class: event.target.value } ) } />
			</LField>
			<LField label={ __( 'CSS id', 'essentials-for-contact-form-7' ) } hint={ __( 'Must be unique on the page.', 'essentials-for-contact-form-7' ) }>
				<input className={ inputCls } type="text" value={ step.id || '' } onChange={ ( event ) => onChange( { id: event.target.value } ) } />
			</LField>
		</TwoCol>
	</div>
);

// What a field needs before it can be added, keyed by the `requires` name in
// the catalogue. Beside the picker rather than in fields.js, the same way
// REQUIRED_LOCK_REASON sits beside its panel, so the sentence is translatable
// where it is read.
const REQUIREMENT = {
	woocommerce: () => ( {
		caption: __( 'Needs WooCommerce', 'essentials-for-contact-form-7' ),
		title:   __( 'Activate WooCommerce to list products in a form.', 'essentials-for-contact-form-7' ),
	} ),
};

const TypePicker = ( { onPick } ) => {
	// Written by Menu::hand_over() on this screen. Missing while the bundle runs
	// anywhere else, and an unmet requirement is the safe reading of that.
	const capabilities = window.cf7eBuilder || {};

	return (
		<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
			{ FIELD_LIBRARY.map( ( group ) => (
				<div key={ group.id }>
					<div className="cf7e-mb-2 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">{ group.label }</div>
					<div className="cf7e-grid cf7e-grid-cols-2 cf7e-gap-2 sm:cf7e-grid-cols-3">
						{ group.fields.map( ( entry ) => {
							const missing = entry.requires && ! capabilities[ entry.requires ];
							const reason  = missing ? REQUIREMENT[ entry.requires ]?.() : null;
							const Ico     = missing ? Lock : entry.icon;
							return (
								<button
									key={ entry.type }
									type="button"
									disabled={ !! missing }
									title={ reason?.title }
									onClick={ () => onPick( entry.type ) }
									className={ `cf7e-flex cf7e-items-center cf7e-gap-2.5 cf7e-rounded-xl cf7e-border cf7e-border-stroke cf7e-px-3 cf7e-py-2.5 cf7e-text-left cf7e-transition-colors ${ missing ? 'cf7e-cursor-not-allowed cf7e-bg-stone-50' : 'cf7e-cursor-pointer cf7e-bg-white hover:cf7e-border-accent hover:cf7e-bg-accent-50' }` }
								>
									<span className={ `cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-shrink-0 cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-bg-stone-100 ${ missing ? 'cf7e-text-stone-400' : 'cf7e-text-stone-500' }` }>
										<Ico className="cf7e-h-4 cf7e-w-4" />
									</span>
									<span className="cf7e-flex cf7e-min-w-0 cf7e-flex-col">
										<span className={ `cf7e-truncate cf7e-text-[14px] cf7e-font-semibold ${ missing ? 'cf7e-text-stone-400' : 'cf7e-text-ink' }` }>{ entry.label }</span>
										{ reason
											? <span className="cf7e-truncate cf7e-text-[14px] cf7e-text-stone-400">{ reason.caption }</span>
											: <span className="cf7e-text-[12px] cf7e-text-stone-400">{ entry.type }</span> }
									</span>
								</button>
							);
						} ) }
					</div>
				</div>
			) ) }
		</div>
	);
};

/* ---------- Modal ---------- */
/**
 * When a saved version was taken, in the reader's own timezone and format.
 *
 * The server stores UTC and sends a unix stamp, so the browser is the only
 * place that knows what "yesterday" means to the person reading it.
 *
 * Seconds are shown, which looks fussy until you watch somebody use this.
 * Iterating in the builder means saving several times in a minute, and without
 * seconds the list is then a column of rows reading "Today at 1:49 AM" with no
 * way to tell which is which — on the one screen whose whole job is telling
 * versions apart.
 */
const revisionWhen = ( unix ) => {
	const at    = new Date( unix * 1000 );
	const today = new Date();
	const same  = ( a, b ) => a.toDateString() === b.toDateString();

	const time = at.toLocaleTimeString( undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' } );

	if ( same( at, today ) ) {
		/* translators: %s: a time, e.g. 14:22. */
		return sprintf( __( 'Today at %s', 'essentials-for-contact-form-7' ), time );
	}

	const yesterday = new Date( today );
	yesterday.setDate( yesterday.getDate() - 1 );

	if ( same( at, yesterday ) ) {
		/* translators: %s: a time, e.g. 14:22. */
		return sprintf( __( 'Yesterday at %s', 'essentials-for-contact-form-7' ), time );
	}

	return at.toLocaleString( undefined, { dateStyle: 'medium', timeStyle: 'medium' } );
};

/**
 * The saved versions of this form, newest first.
 *
 * Every one of them opens, the newest included. It is tempting to label that
 * one "Current" and grey it out, but the canvas is not the last save whenever
 * there are unsaved edits on screen — and going back to the last save is
 * exactly what somebody with a canvas full of mistakes wants. Blocking it would
 * disable the most useful row in the list. So the label says what is true —
 * which save it was — and the button stays live.
 */
const RevisionList = ( { state, onPick } ) => {
	if ( state.error ) {
		return <div className="cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-3.5 cf7e-py-2.5 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">{ state.error }</div>;
	}

	if ( state.loading && ! state.list.length ) {
		return <p className="cf7e-m-0 cf7e-text-center cf7e-text-sm cf7e-text-stone-400">{ __( 'Loading…', 'essentials-for-contact-form-7' ) }</p>;
	}

	if ( ! state.list.length ) {
		return (
			<p className="cf7e-m-0 cf7e-text-center cf7e-text-sm cf7e-text-stone-400">
				{ __( 'No earlier versions yet. One is kept each time you save.', 'essentials-for-contact-form-7' ) }
			</p>
		);
	}

	return (
		<div className="cf7e-flex cf7e-flex-col cf7e-gap-2">
			<p className="cf7e-mb-2 cf7e-mt-0 cf7e-text-[14px] cf7e-leading-relaxed cf7e-text-stone-500">
				{ __( 'Opening a version loads it onto the canvas — nothing is saved until you press Save, and Ctrl+Z puts it back.', 'essentials-for-contact-form-7' ) }
			</p>

			{ state.list.map( ( entry, index ) => (
				<div
					key={ entry.rev }
					className="cf7e-flex cf7e-items-center cf7e-gap-3 cf7e-rounded-xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-px-4 cf7e-py-3"
				>
					<span className="cf7e-flex-1 cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ revisionWhen( entry.time ) }</span>

					{ 0 === index && (
						<span className="cf7e-text-[14px] cf7e-font-medium cf7e-text-stone-400">{ __( 'Latest save', 'essentials-for-contact-form-7' ) }</span>
					) }

					<button type="button" disabled={ state.loading } onClick={ () => onPick( entry.rev ) } className={ btnGhost }>
						<RotateCcw className="cf7e-h-4 cf7e-w-4" />
						{ __( 'Open', 'essentials-for-contact-form-7' ) }
					</button>
				</div>
			) ) }
		</div>
	);
};

const Modal = ( { title, badge, wide, onClose, footer, children } ) => {
	useEffect( () => {
		const onKey = ( event ) => 'Escape' === event.key && onClose();
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	}, [ onClose ] );

	return (
		<div className="cf7e-fixed cf7e-inset-0 cf7e-z-[100000] cf7e-flex cf7e-items-start cf7e-justify-center cf7e-px-4 cf7e-pb-4 cf7e-pt-[7vh]">
			<Backdrop
				onClick={ onClose }
				className="cf7e-absolute cf7e-inset-0 cf7e-bg-ink/40 cf7e-backdrop-blur-sm"
			/>
			<div
				className={ `cf7e-relative cf7e-flex cf7e-max-h-[85vh] cf7e-w-full ${ wide ? 'cf7e-max-w-2xl' : 'cf7e-max-w-lg' } cf7e-flex-col cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-shadow-pop` }
			>
				<header className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-gap-3 cf7e-border-b cf7e-border-line cf7e-px-6 cf7e-py-4">
					<div className="cf7e-flex cf7e-min-w-0 cf7e-items-center cf7e-gap-2">
						<span className="cf7e-truncate cf7e-text-lg cf7e-font-bold cf7e-text-ink">{ title }</span>
						{ badge && (
							<span className="cf7e-rounded-md cf7e-bg-stone-100 cf7e-px-2 cf7e-py-0.5 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wide cf7e-text-stone-500">{ badge }</span>
						) }
					</div>
					<button
						type="button"
						onClick={ onClose }
						aria-label={ __( 'Close', 'essentials-for-contact-form-7' ) }
						className="cf7e-flex cf7e-h-9 cf7e-w-9 cf7e-shrink-0 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-stone-50 cf7e-text-stone-500 hover:cf7e-bg-stone-100 hover:cf7e-text-ink"
					>
						<X className="cf7e-h-4 cf7e-w-4" />
					</button>
				</header>

				{ /* The scrollbar is reserved on both edges, otherwise it eats ~10px from
				     the right only and every field box stops short on that side. Padding
				     is then 14px so padding + gutter lines the fields up with the 24px
				     header and footer. */ }
				<div className="cf7e-scroll cf7e-flex-1 cf7e-overflow-y-auto cf7e-px-3.5 cf7e-py-5" style={ { scrollbarGutter: 'stable both-edges' } }>
					{ children }
				</div>

				{ footer && (
					<footer className="cf7e-flex cf7e-items-center cf7e-gap-2 cf7e-border-t cf7e-border-line cf7e-px-6 cf7e-py-4">{ footer }</footer>
				) }
			</div>
		</div>
	);
};

/* ---------- Field row ---------- */
/**
 * What to call a field with no caption.
 *
 * "Untitled field" is the right word for a text box nobody has labelled yet —
 * it names something missing. For the three types that draw no caption at all
 * it names nothing missing, and the panel does not even offer a label box, so
 * it reads as a fault in a row that is perfectly finished. Those say what they
 * are instead.
 */
const rowCaption = ( field ) =>
	NO_CAPTION.includes( field.type )
		? labelForType( field.type )
		: __( 'Untitled field', 'essentials-for-contact-form-7' );

const FieldRow = ( { field, index, onEdit, onDelete, onDuplicate } ) => {
	const Ico = iconFor( field.type );
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: field._id } );
	const style = { transform: CSS.Transform.toString( transform ), transition };

	if ( isDragging ) {
		return (
			<div ref={ setNodeRef } style={ style } className="cf7e-border-b cf7e-border-line cf7e-px-4 cf7e-py-2 last:cf7e-border-b-0">
				<div className="cf7e-h-9 cf7e-rounded-lg cf7e-border cf7e-border-dashed cf7e-border-accent-300 cf7e-bg-accent-50/60" />
			</div>
		);
	}

	const isContent = 'content' === field.kind;

	return (
		<div
			ref={ setNodeRef }
			style={ style }
			className={ `cf7e-grid ${ COLS } cf7e-items-center cf7e-gap-3 cf7e-border-b cf7e-border-line cf7e-bg-white cf7e-px-4 cf7e-py-3 cf7e-transition-colors last:cf7e-border-b-0 hover:cf7e-bg-stone-50/60` }
		>
			<button type="button" { ...attributes } { ...listeners } aria-label={ __( 'Drag', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-cursor-grab cf7e-items-center cf7e-justify-center cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-text-stone-500 active:cf7e-cursor-grabbing">
				<GripVertical className="cf7e-h-4 cf7e-w-4" />
			</button>
			<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-text-stone-400 cf7e-tnum">{ String( index + 1 ).padStart( 2, '0' ) }</span>
			<button type="button" onClick={ onEdit } className="cf7e-flex cf7e-min-w-0 cf7e-cursor-pointer cf7e-items-center cf7e-gap-1 cf7e-border-0 cf7e-bg-transparent cf7e-text-left">
				<span className="cf7e-truncate cf7e-text-sm cf7e-font-semibold cf7e-text-ink">
					{ isContent ? contentLabel( field.type ) : ( field.label || <span className="cf7e-font-normal cf7e-text-stone-400">{ rowCaption( field ) }</span> ) }
				</span>
				{ ! isContent && field.required && <span className="cf7e-text-red-500">*</span> }
			</button>
			<span className="cf7e-truncate cf7e-text-[14px] cf7e-text-stone-500">
				{ isContent ? ( field.text ? String( field.text ).slice( 0, 60 ) : '—' ) : ( field.name || '—' ) }
			</span>
			<span className="cf7e-inline-flex cf7e-w-fit cf7e-items-center cf7e-gap-1.5 cf7e-rounded-md cf7e-bg-stone-100 cf7e-px-2 cf7e-py-1 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wide cf7e-text-stone-500">
				<Ico className="cf7e-h-3 cf7e-w-3" />
				{ field.type }
			</span>
			<div className="cf7e-flex cf7e-items-center cf7e-justify-end cf7e-gap-0.5">
				<button type="button" onClick={ onEdit } aria-label={ __( 'Edit', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-bg-stone-100 hover:cf7e-text-ink">
					<Pencil className="cf7e-h-3.5 cf7e-w-3.5" />
				</button>
				<button type="button" onClick={ onDuplicate } aria-label={ __( 'Duplicate', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-bg-stone-100 hover:cf7e-text-ink">
					<Copy className="cf7e-h-3.5 cf7e-w-3.5" />
				</button>
				<button type="button" onClick={ onDelete } aria-label={ __( 'Delete', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-bg-red-50 hover:cf7e-text-red-600">
					<Trash2 className="cf7e-h-3.5 cf7e-w-3.5" />
				</button>
			</div>
		</div>
	);
};

/* ---------- Grid row block ---------- */

/**
 * What a content block is called, from the same catalogue the palette draws.
 *
 * This was a second hardcoded map — `{ heading: 'Heading', … }` — which is how
 * it came to be the one place these four names were never translated while the
 * palette above showed them in the site's language. One list, one set of words.
 */
const contentLabel = labelForType;

const RowChip = ( { child, onEdit, onDuplicate, onDelete } ) => {
	const Ico   = iconFor( child.type );
	const label = 'content' === child.kind
		? contentLabel( child.type )
		: ( child.label || child.name || child.type );
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: child._id } );
	const style = { transform: CSS.Transform.toString( transform ), transition };

	if ( isDragging ) {
		return <div ref={ setNodeRef } style={ style } className="cf7e-h-[2.375rem] cf7e-rounded-lg cf7e-border cf7e-border-dashed cf7e-border-accent-300 cf7e-bg-accent-50/60" />;
	}

	return (
		<div ref={ setNodeRef } style={ style } className="cf7e-group cf7e-flex cf7e-min-w-0 cf7e-items-center cf7e-gap-1.5 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-white cf7e-py-1.5 cf7e-pl-1 cf7e-pr-2">
			<button type="button" { ...attributes } { ...listeners } aria-label={ __( 'Drag to reorder', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-6 cf7e-w-4 cf7e-shrink-0 cf7e-cursor-grab cf7e-items-center cf7e-justify-center cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 cf7e-transition-colors hover:cf7e-text-stone-500 active:cf7e-cursor-grabbing">
				<GripVertical className="cf7e-h-4 cf7e-w-4" />
			</button>
			<span className="cf7e-flex cf7e-h-6 cf7e-w-6 cf7e-shrink-0 cf7e-items-center cf7e-justify-center cf7e-rounded-md cf7e-bg-stone-100 cf7e-text-stone-500">
				<Ico className="cf7e-h-3 cf7e-w-3" />
			</span>
			<button type="button" onClick={ onEdit } className="cf7e-min-w-0 cf7e-flex-1 cf7e-cursor-pointer cf7e-truncate cf7e-border-0 cf7e-bg-transparent cf7e-text-left cf7e-text-[14px] cf7e-font-medium cf7e-text-ink">{ label }</button>
			<button type="button" onClick={ onEdit } aria-label={ __( 'Edit', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-6 cf7e-w-6 cf7e-shrink-0 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-md cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 cf7e-opacity-0 cf7e-transition-opacity hover:cf7e-bg-stone-100 hover:cf7e-text-ink group-hover:cf7e-opacity-100">
				<Pencil className="cf7e-h-3 cf7e-w-3" />
			</button>
			<button type="button" onClick={ onDuplicate } aria-label={ __( 'Duplicate', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-6 cf7e-w-6 cf7e-shrink-0 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-md cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 cf7e-opacity-0 cf7e-transition-opacity hover:cf7e-bg-stone-100 hover:cf7e-text-ink group-hover:cf7e-opacity-100">
				<Copy className="cf7e-h-3 cf7e-w-3" />
			</button>
			<button type="button" onClick={ onDelete } aria-label={ __( 'Delete', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-6 cf7e-w-6 cf7e-shrink-0 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-md cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 cf7e-opacity-0 cf7e-transition-opacity hover:cf7e-bg-red-50 hover:cf7e-text-red-600 group-hover:cf7e-opacity-100">
				<Trash2 className="cf7e-h-3 cf7e-w-3" />
			</button>
		</div>
	);
};

const Column = ( { rowId, ci, items, total, onAddField, onEditChild, onDuplicateChild, onDeleteChild } ) => {
	const { setNodeRef, isOver } = useDroppable( { id: colId( rowId, ci ) } );

	return (
		<div
			ref={ setNodeRef }
			className={ `cf7e-flex cf7e-min-h-[5.5rem] cf7e-flex-col cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-border-dashed cf7e-p-2 cf7e-transition-all ${ isOver ? 'cf7e-border-accent cf7e-bg-accent-50 cf7e-ring-2 cf7e-ring-accent-200' : 'cf7e-border-stroke cf7e-bg-white' }` }
		>
			<span className="cf7e-px-1 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">
				{ sprintf( /* translators: 1: column number, 2: total columns. */ __( 'Column %1$d / %2$d', 'essentials-for-contact-form-7' ), ci + 1, total ) }
			</span>
			<SortableContext items={ items.map( ( item ) => item._id ) } strategy={ verticalListSortingStrategy }>
				{ items.length
					? items.map( ( child ) => (
						<RowChip
							key={ child._id }
							child={ child }
							onEdit={ () => onEditChild( child ) }
							onDuplicate={ () => onDuplicateChild( child._id ) }
							onDelete={ () => onDeleteChild( child._id ) }
						/>
					) )
					: (
						<span className={ `cf7e-flex cf7e-flex-1 cf7e-items-center cf7e-justify-center cf7e-rounded-md cf7e-border cf7e-border-dashed cf7e-py-3 cf7e-text-center cf7e-text-[14px] cf7e-transition-colors ${ isOver ? 'cf7e-border-accent cf7e-text-accent' : 'cf7e-border-transparent cf7e-text-stone-400' }` }>
							{ __( 'Drop a field here', 'essentials-for-contact-form-7' ) }
						</span>
					) }
			</SortableContext>
			<button type="button" onClick={ onAddField } className="cf7e-flex cf7e-w-full cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-gap-1 cf7e-rounded-md cf7e-border cf7e-border-dashed cf7e-border-stroke cf7e-bg-stone-50/60 cf7e-py-1.5 cf7e-text-[14px] cf7e-font-semibold cf7e-text-stone-500 cf7e-transition-colors hover:cf7e-border-accent hover:cf7e-text-accent">
				<Plus className="cf7e-h-3 cf7e-w-3" /> { __( 'Add field', 'essentials-for-contact-form-7' ) }
			</button>
		</div>
	);
};

const RowBlock = ( { row, onCols, onDuplicate, onDelete, onAddField, onEditChild, onDuplicateChild, onDeleteChild } ) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: row._id } );
	const style   = { transform: CSS.Transform.toString( transform ), transition, opacity: isDragging ? 0.5 : 1 };
	const columns = row.columns || [];
	const cols    = columns.length || 1;

	return (
		<div
			ref={ setNodeRef }
			style={ style }
			className={ `cf7e-border-b cf7e-border-line cf7e-bg-stone-50/40 last:cf7e-border-b-0 ${ isDragging ? 'cf7e-relative cf7e-z-10 cf7e-shadow-card' : '' }` }
		>
			<div className="cf7e-flex cf7e-items-center cf7e-gap-3 cf7e-px-4 cf7e-py-2.5">
				<button type="button" { ...attributes } { ...listeners } aria-label={ __( 'Drag', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-cursor-grab cf7e-items-center cf7e-justify-center cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-text-stone-500 active:cf7e-cursor-grabbing">
					<GripVertical className="cf7e-h-4 cf7e-w-4" />
				</button>
				<span className="cf7e-inline-flex cf7e-items-center cf7e-gap-1.5 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wide cf7e-text-stone-500">
					<LayoutGrid className="cf7e-h-3.5 cf7e-w-3.5" />
					{ __( 'Grid row', 'essentials-for-contact-form-7' ) }
				</span>
				<Select
					className="cf7e-w-32"
					value={ cols }
					onChange={ ( value ) => onCols( Number( value ) ) }
					options={ [ 1, 2, 3, 4 ].map( ( count ) => ( {
						value: count,
						label: sprintf( /* translators: %d: number of columns. */ __( '%d columns', 'essentials-for-contact-form-7' ), count ),
					} ) ) }
				/>
				<span className="cf7e-flex-1" />
				<button type="button" onClick={ onDuplicate } aria-label={ __( 'Duplicate row', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-bg-stone-100 hover:cf7e-text-ink">
					<Copy className="cf7e-h-3.5 cf7e-w-3.5" />
				</button>
				<button type="button" onClick={ onDelete } aria-label={ __( 'Delete', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-bg-red-50 hover:cf7e-text-red-600">
					<Trash2 className="cf7e-h-3.5 cf7e-w-3.5" />
				</button>
			</div>
			<div className="cf7e-px-4 cf7e-pb-3" style={ { display: 'grid', gridTemplateColumns: `repeat(${ cols }, minmax(0, 1fr))`, gap: '0.5rem' } }>
				{ columns.map( ( col, ci ) => (
					<Column
						key={ ci }
						rowId={ row._id }
						ci={ ci }
						items={ col }
						total={ cols }
						onAddField={ () => onAddField( ci ) }
						onEditChild={ onEditChild }
						onDuplicateChild={ onDuplicateChild }
						onDeleteChild={ onDeleteChild }
					/>
				) ) }
			</div>
		</div>
	);
};

const PageBreakBar = ( { item, step, onEdit, onDelete } ) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: item._id } );
	const style = { transform: CSS.Transform.toString( transform ), transition, opacity: isDragging ? 0.5 : 1 };

	return (
		<div
			ref={ setNodeRef }
			style={ style }
			className={ `cf7e-flex cf7e-items-center cf7e-gap-3 cf7e-border-b cf7e-border-line cf7e-bg-stone-100/70 cf7e-px-4 cf7e-py-2.5 last:cf7e-border-b-0 ${ isDragging ? 'cf7e-relative cf7e-z-10 cf7e-shadow-card' : '' }` }
		>
			<button type="button" { ...attributes } { ...listeners } aria-label={ __( 'Drag', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-cursor-grab cf7e-items-center cf7e-justify-center cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-text-stone-500 active:cf7e-cursor-grabbing">
				<GripVertical className="cf7e-h-4 cf7e-w-4" />
			</button>
			<span className="cf7e-inline-flex cf7e-items-center cf7e-gap-1.5 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wide cf7e-text-stone-500">
				<Scissors className="cf7e-h-3.5 cf7e-w-3.5" />
				{ sprintf( /* translators: %d: step number. */ __( 'Step %d', 'essentials-for-contact-form-7' ), step ) }
			</span>
			{ item.title && (
				<span className="cf7e-truncate cf7e-text-[14px] cf7e-font-semibold cf7e-text-ink">{ item.title }</span>
			) }
			<span className="cf7e-h-px cf7e-flex-1 cf7e-bg-stroke" />
			<button type="button" onClick={ onEdit } aria-label={ __( 'Step settings', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-bg-stone-100 hover:cf7e-text-ink">
				<Pencil className="cf7e-h-3.5 cf7e-w-3.5" />
			</button>
			<button type="button" onClick={ onDelete } aria-label={ __( 'Delete', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 hover:cf7e-bg-red-50 hover:cf7e-text-red-600">
				<Trash2 className="cf7e-h-3.5 cf7e-w-3.5" />
			</button>
		</div>
	);
};

const DragPreview = ( { item } ) => {
	if ( ! item ) {
		return null;
	}
	if ( 'row' === item.kind ) {
		return (
			<div className="cf7e-flex cf7e-rotate-2 cf7e-cursor-grabbing cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-border-accent-200 cf7e-bg-white cf7e-px-3 cf7e-py-2 cf7e-shadow-2xl cf7e-ring-2 cf7e-ring-accent-100">
				<LayoutGrid className="cf7e-h-4 cf7e-w-4 cf7e-text-accent" />
				<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-text-ink">{ __( 'Grid row', 'essentials-for-contact-form-7' ) }</span>
			</div>
		);
	}
	const Ico   = iconFor( item.type );
	const label = 'content' === item.kind ? contentLabel( item.type ) : ( item.label || item.name || item.type );
	return (
		<div className="cf7e-flex cf7e-rotate-2 cf7e-cursor-grabbing cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-border-accent-200 cf7e-bg-white cf7e-px-2.5 cf7e-py-1.5 cf7e-shadow-2xl cf7e-ring-2 cf7e-ring-accent-100">
			<span className="cf7e-flex cf7e-h-6 cf7e-w-6 cf7e-items-center cf7e-justify-center cf7e-rounded-md cf7e-bg-accent-50 cf7e-text-accent"><Ico className="cf7e-h-3 cf7e-w-3" /></span>
			<span className="cf7e-text-[14px] cf7e-font-medium cf7e-text-ink">{ label }</span>
		</div>
	);
};

/* ---------- Live preview ----------
 *
 * The preview renders what the front end renders: the same wrappers, the same
 * class names. assets/css/{controls,form,steps,range,rating}.css are imported
 * into the admin bundle and scoped to `:is( .wpcf7-form, .cf7e-preview )`, so
 * they skin this the way they skin the real form rather than us imitating them.
 *
 * Nothing below carries an cf7e- Tailwind utility. Utilities are `!important` in
 * this bundle, so one would beat the shared rule and put the preview back out
 * of step — which is how it drifted the first time. Anything still drawn by
 * hand here is a place the two can drift again.
 */

// A <label> forwards clicks to the first control inside it, which breaks option
// selection and file drop zones. Form_Serializer gives those a fieldset caption
// instead; this is the same list.
const GROUP_CAPTION = [ 'radio', 'checkbox', 'file', 'rating' ];

// Renders nothing for the visitor, so it gets no paragraph either — an empty
// one would still carry the gap token's bottom margin and open a hole.
const isInvisible = ( field ) =>
	'hidden' === field.type ||
	'submission_id' === field.type ||
	( 'dynamictext' === field.type && field.options?.hidden );

const RequiredStar = () => <span className="cf7e-required" aria-hidden="true">*</span>;

const clamp = ( value, min, max, fallback ) => {
	const number = parseInt( value, 10 );
	return Math.max( min, Math.min( max, Number.isNaN( number ) ? fallback : number ) );
};

const PreviewContent = ( { item } ) => {
	const align = `cf7e-align-${ [ 'left', 'center', 'right' ].includes( item.align ) ? item.align : 'left' }`;

	if ( 'heading' === item.type ) {
		const level   = [ 'h2', 'h3', 'h4' ].includes( item.level ) ? item.level : 'h2';
		const Heading = level;
		return <Heading className={ `cf7e-h cf7e-h-${ level } ${ align }` }>{ item.text }</Heading>;
	}
	if ( 'paragraph' === item.type ) {
		const size = [ 'sm', 'md', 'lg' ].includes( item.size ) ? item.size : 'md';
		return <p className={ `cf7e-p cf7e-p-${ size } ${ align }` }>{ item.text }</p>;
	}
	if ( 'divider' === item.type ) {
		const style = [ 'solid', 'dashed', 'dotted' ].includes( item.style ) ? item.style : 'solid';
		const tier  = [ 'subtle', 'normal', 'strong' ].includes( item.tier ) ? item.tier : 'subtle';
		return (
			<hr
				className={ `cf7e-hr cf7e-hr-${ style } cf7e-hr-${ tier }` }
				style={ { borderTopWidth: `${ clamp( item.thickness, 1, 6, 1 ) }px` } }
			/>
		);
	}
	if ( 'spacer' === item.type ) {
		return <div className="cf7e-spacer" aria-hidden="true" style={ { height: `${ clamp( item.height, 0, 200, 16 ) }px` } } />;
	}
	return null;
};

const PreviewField = ( { field } ) => {
	const kind = field.type;

	if ( 'submit' === kind ) {
		return (
			<button type="submit" disabled onClick={ ( event ) => event.preventDefault() }>
				{ field.label || __( 'Send', 'essentials-for-contact-form-7' ) }
			</button>
		);
	}
	// Acceptance is not in Form_Serializer's labelable list — its consent line is
	// the caption, and it sits beside the box rather than above the field.
	if ( 'acceptance' === kind ) {
		return (
			<span className="wpcf7-form-control-wrap">
				<span className="wpcf7-form-control wpcf7-acceptance">
					<span className="wpcf7-list-item">
						<label>
							<input type="checkbox" defaultChecked={ 'on' === field.default } disabled />
							<span className="wpcf7-list-item-label">
								{ field.label || __( 'I agree', 'essentials-for-contact-form-7' ) }{ field.required && <RequiredStar /> }
							</span>
						</label>
					</span>
				</span>
			</span>
		);
	}

	// CF7 registers count with zero-controls-container, so it prints the bare
	// span with no form-control-wrap around it. The number shown is the counted
	// field's maxlength when counting down, which is nearly always unset — so
	// zero is what both directions really start from.
	if ( 'count' === kind ) {
		return <span className={ `wpcf7-character-count ${ field.options?.down ? 'down' : 'up' }` }>0</span>;
	}

	// Not `control`: that name is the shared class token this file imports, and
	// a local one hid it for the whole function.
	let widget;
	if ( 'textarea' === kind ) {
		widget = <textarea placeholder={ field.placeholder || '' } readOnly />;
	} else if ( 'select' === kind ) {
		// Static stand-in for the JS widget — same class names, so it wears the
		// same skin without running any of the widget's behaviour.
		const multi  = !! field.options?.multiple;
		const chosen = ( field.choices || [] ).slice( 0, multi ? 2 : 1 );
		widget = (
			<div className={ `cf7e-select${ multi ? ' cf7e-select--multiple' : '' }` }>
				<span className="cf7e-select-trigger">
					<span className="cf7e-select-value">
						{ multi
							? chosen.map( ( choice, index ) => <span key={ index } className="cf7e-select-chip">{ choice }<span className="cf7e-select-chip-remove">×</span></span> )
							: ( chosen[ 0 ] || <span className="cf7e-select-placeholder">{ __( 'Select…', 'essentials-for-contact-form-7' ) }</span> ) }
					</span>
					<span className="cf7e-select-arrow" />
				</span>
			</div>
		);
	} else if ( 'checkbox' === kind || 'radio' === kind ) {
		const layout = [ 'inline', 'cards' ].includes( field.layout ) ? ` cf7e-${ field.layout }` : '';
		widget = (
			<span className={ `wpcf7-form-control wpcf7-${ kind }${ layout }` }>
				{ ( field.choices || [] ).map( ( choice, index ) => (
					<span key={ index } className="wpcf7-list-item">
						<label>
							<input type={ kind } disabled />
							<span className="wpcf7-list-item-label">{ choice }</span>
						</label>
					</span>
				) ) }
			</span>
		);
	} else if ( 'file' === kind ) {
		const hints = [
			field.options?.filetypes && field.options.filetypes.replace( /\|/g, ', ' ),
			field.options?.limit,
		].filter( Boolean );
		widget = (
			<div className="cf7e-file">
				<div className="cf7e-file-zone">
					<span className="cf7e-file-icon" />
					<span className="cf7e-file-text">
						{ field.options?.multiple
							? __( 'Drag files here or click to browse', 'essentials-for-contact-form-7' )
							: __( 'Drag a file here or click to browse', 'essentials-for-contact-form-7' ) }
					</span>
					{ !! hints.length && <span className="cf7e-file-hint">{ hints.join( ' · ' ) }</span> }
				</div>
			</div>
		);
	} else if ( 'range' === kind ) {
		const rMin = Number( field.options?.min ?? 0 );
		const rMax = Number( field.options?.max ?? 100 );
		const rVal = '' !== ( field.default ?? '' ) ? Number( field.default ) : rMin;
		const pct  = rMax > rMin ? ( ( rVal - rMin ) / ( rMax - rMin ) ) * 100 : 0;
		// The wrapper and badge range.js builds around the native control.
		widget = (
			<div className="cf7e-range">
				<input
					type="range"
					className="wpcf7-range"
					style={ { '--cf7e-range-p': `${ pct }%` } }
					min={ rMin }
					max={ rMax }
					step={ field.options?.step ?? 1 }
					value={ rVal }
					readOnly
				/>
				<span className="cf7e-range-value">{ rVal }</span>
			</div>
		);
	} else if ( 'rating' === kind ) {
		const max = clamp( field.options?.max, 1, 10, 5 );
		// Counted down like Rating.php, because rating.css reverses the row — the
		// order in the markup is what makes the CSS-only fill work.
		widget = (
			<span className="cf7e-rating">
				{ Array.from( { length: max } ).flatMap( ( _, i ) => {
					const score = max - i;
					// `for`/`id` the same way Rating.php pairs them: the star is the
					// label, and without the pairing it labelled nothing.
					const inputId = `${ field.name || field._id }-${ score }`;
					return [
						<input key={ `r${ score }` } id={ inputId } type="radio" name={ field.name || field._id } value={ score } disabled />,
						<label key={ `s${ score }` } htmlFor={ inputId } aria-label={ String( score ) }>★</label>,
					];
				} ) }
			</span>
		);
	} else if ( 'country' === kind || 'product' === kind ) {
		widget = (
			<div className="cf7e-select">
				<span className="cf7e-select-trigger">
					<span className="cf7e-select-value">
						<span className="cf7e-select-placeholder">
							{ 'product' === kind
								? __( 'Select a product…', 'essentials-for-contact-form-7' )
								: __( 'Select a country…', 'essentials-for-contact-form-7' ) }
						</span>
					</span>
					<span className="cf7e-select-arrow" />
				</span>
			</div>
		);
	} else if ( 'quiz' === kind ) {
		// The question is the caption, so it is inside the control the way
		// wpcf7_quiz_form_tag_handler writes it. Only the first is shown; the
		// front end picks one of the pairs at random.
		const [ question ] = String( ( field.choices || [] )[ 0 ] || '' ).split( '|' );
		widget = (
			<label>
				<span className="wpcf7-quiz-label">{ question || '1+1=?' }</span>{ ' ' }
				<input type="text" autoComplete="off" readOnly />
			</label>
		);
	} else if ( 'dynamictext' === kind ) {
		widget = <input type="text" readOnly placeholder={ field.default ? `⟨ ${ field.default } ⟩` : __( 'Dynamic value', 'essentials-for-contact-form-7' ) } />;
	} else {
		const native = [ 'email', 'tel', 'url', 'number', 'date', 'password' ].includes( kind ) ? kind : 'text';
		widget = <input type={ native } placeholder={ field.placeholder || '' } defaultValue={ field.default || '' } readOnly />;
	}

	// CF7 wraps every control in this span, and controls.css hangs the gap
	// between caption and control off it.
	const wrapped = <span className="wpcf7-form-control-wrap">{ widget }</span>;

	if ( ! field.label ) {
		return wrapped;
	}

	const caption = <>{ field.label }{ field.required && <RequiredStar /> }</>;

	if ( GROUP_CAPTION.includes( kind ) ) {
		return (
			<fieldset className="cf7e-fieldset">
				<legend>{ caption }</legend>
				{ wrapped }
			</fieldset>
		);
	}

	return <label>{ caption }{ wrapped }</label>;
};

// One paragraph per field, the way CF7's autop wraps them, so the gap comes
// from the same `:is( p, … )` rule that spaces the real form — and so an
// inline-flex submit button keeps its own width instead of being stretched by
// a flex column, which is what made it full width here.
const previewItems = ( list ) => list.map( ( item ) => {
	if ( 'row' === item.kind ) {
		return <PreviewRow key={ item._id } row={ item } />;
	}
	// Content blocks are block-level HTML; autop leaves them alone.
	if ( 'content' === item.kind ) {
		return <PreviewContent key={ item._id } item={ item } />;
	}
	if ( isInvisible( item ) ) {
		return null;
	}
	// wpautop leaves block-level HTML alone, and a captioned choice group is a
	// <fieldset>. It carries the gap itself; controls.css lists it alongside <p>.
	if ( item.label && GROUP_CAPTION.includes( item.type ) ) {
		return <PreviewField key={ item._id } field={ item } />;
	}
	return <p key={ item._id }><PreviewField field={ item } /></p>;
} );

const PreviewRow = ( { row } ) => {
	const columns = row.columns || [];
	return (
		<div className={ `cf7e-row cf7e-cols-${ columns.length || 1 }` }>
			{ columns.map( ( col, ci ) => (
				<div key={ ci } className="cf7e-col">{ previewItems( col ) }</div>
			) ) }
		</div>
	);
};

/**
 * The indicator, built exactly as steps.js builds it.
 *
 * Both the bar and the marker row are always rendered; steps.css decides which
 * one is shown from the `cf7e-steps-*` class on the wrapper, and hides the
 * whole block for "none". That is how it works on the real form, so the
 * variants cannot disagree here.
 */
const PreviewIndicator = ( { pages, current } ) => (
	<div className="cf7e-steps-indicator">
		<div className="cf7e-steps-progress">
			<div className="cf7e-steps-progress-fill" style={ { width: `${ ( ( current + 1 ) / pages.length ) * 100 }%` } } />
		</div>
		<ol className="cf7e-steps-marks">
			{ pages.map( ( page, i ) => (
				<li
					key={ i }
					className={ `cf7e-steps-mark${ i < current ? ' cf7e-steps-mark-done' : '' }${ i === current ? ' cf7e-steps-mark-current' : '' }` }
				>
					<span className="cf7e-steps-mark-num">{ i + 1 }</span>
					<span className="cf7e-steps-mark-label">
						{ page.settings.title || sprintf( /* translators: %d: step number. */ __( 'Step %d', 'essentials-for-contact-form-7' ), i + 1 ) }
					</span>
				</li>
			) ) }
		</ol>
	</div>
);

const Preview = ( { items, title, indicator } ) => {
	const [ step, setStep ] = useState( 0 );

	// A break carries the settings of the step it opens, so they are kept with
	// that group — same shape steps.js builds on the real form.
	const groups = [ { settings: {}, fields: [] } ];
	items.forEach( ( item ) => {
		if ( 'pagebreak' === item.kind ) {
			groups.push( { settings: item, fields: [] } );
		} else {
			groups[ groups.length - 1 ].fields.push( item );
		}
	} );
	const pages   = groups.filter( ( group ) => group.fields.length );
	const multi   = pages.length > 1;
	const current = Math.max( 0, Math.min( step, pages.length - 1 ) );
	const now     = pages[ current ] || { settings: {}, fields: [] };

	// The variant class belongs on the host element, as it does on the <form>:
	// steps.css keys every variant rule off it. Left off entirely when there is
	// no choice yet, so the "not one of the others" fallback shows the bar.
	const variant = multi && indicator ? ` cf7e-steps-${ indicator }` : '';

	return (
		<div className={ `cf7e-preview${ variant } cf7e-mx-auto cf7e-max-w-2xl cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-8 cf7e-shadow-card` }>
			{ title && <h2 className="cf7e-mb-6 cf7e-mt-0 cf7e-text-2xl cf7e-font-bold cf7e-text-ink">{ title }</h2> }
			{ 0 === items.length ? (
				<p className="cf7e-m-0 cf7e-text-center cf7e-text-sm cf7e-text-stone-400">{ __( 'Nothing to preview yet.', 'essentials-for-contact-form-7' ) }</p>
			) : multi ? (
				<>
					<PreviewIndicator pages={ pages } current={ current } />
					<div className="cf7e-step cf7e-step-active">
						{ ( now.settings.title || now.settings.desc ) && (
							<div className="cf7e-step-heading">
								{ now.settings.title && <h3 className="cf7e-step-title">{ now.settings.title }</h3> }
								{ now.settings.desc && <p className="cf7e-step-desc">{ now.settings.desc }</p> }
							</div>
						) }
						{ previewItems( now.fields ) }
					</div>
					{ /* steps.js takes the buttons out of flow rather than hiding
					     them in place, which is what lets the status line slide
					     across on the first and last step. */ }
					<div className="cf7e-steps-nav">
						<button
							type="button"
							className="cf7e-step-btn cf7e-step-prev"
							style={ 0 === current ? { display: 'none' } : undefined }
							onClick={ () => setStep( current - 1 ) }
						>
							{ now.settings.prev || __( 'Back', 'essentials-for-contact-form-7' ) }
						</button>
						<span className="cf7e-step-status">
							{ sprintf( /* translators: 1: current step, 2: total steps. */ __( 'Step %1$d of %2$d', 'essentials-for-contact-form-7' ), current + 1, pages.length ) }
						</span>
						<button
							type="button"
							className="cf7e-step-btn cf7e-step-next"
							style={ current === pages.length - 1 ? { display: 'none' } : undefined }
							onClick={ () => setStep( current + 1 ) }
						>
							{ now.settings.next || __( 'Next', 'essentials-for-contact-form-7' ) }
						</button>
					</div>
				</>
			) : (
				previewItems( ( pages[ 0 ] || { fields: [] } ).fields )
			) }
		</div>
	);
};

const App = ( { formId } ) => {
	const [ items, setItems ]     = useState( [] );
	const [ title, setTitle ]     = useState( '' );
	const [ shortcode, setShortcode ] = useState( '' );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ]     = useState( null );
	const [ saving, setSaving ]   = useState( 'idle' );
	const [ modal, setModal ]     = useState( null );
	const [ draft, setDraft ]     = useState( null );
	const [ fieldTab, setFieldTab ]     = useState( 'general' );
	const [ draftError, setDraftError ] = useState( '' );
	const [ addTarget, setAddTarget ] = useState( null );
	const [ activeId, setActiveId ]   = useState( null );
	const [ past, setPast ]     = useState( [] );
	const [ future, setFuture ] = useState( [] );
	const [ mode, setMode ]     = useState( () => {
		const requested = new URLSearchParams( window.location.search ).get( 'tab' );
		return ( 'settings' === requested || 'preview' === requested ) ? requested : 'build';
	} );
	const [ redirect, setRedirect ] = useState( {} );
	const [ steps, setSteps ]       = useState( {} );
	const [ cssClass, setCssClass ] = useState( '' );

	// null when the History panel is shut; { loading, list, error } while open.
	const [ history, setHistory ] = useState( null );

	// The timestamp of a version just loaded onto the canvas, until it is saved.
	const [ loaded, setLoaded ] = useState( null );

	useEffect( () => {
		if ( ! formId ) {
			setLoading( false );
			return;
		}
		apiFetch( { path: `cf7e/v1/forms/${ formId }/builder` } )
			.then( ( res ) => {
				setItems( ensureIds( res.fields || [] ) );
				setTitle( res.title || '' );
				setShortcode( res.shortcode || '' );
				setRedirect( res.redirect || {} );
				setSteps( res.steps || {} );
				setCssClass( res.css_class || '' );
				setError( null );
				setPast( [] );
				setFuture( [] );
			} )
			.catch( ( err ) => setError( err.message ) )
			.finally( () => setLoading( false ) );
	}, [ formId ] );

	// Keep the `tab` query param in sync so a reload restores the active tab.
	useEffect( () => {
		const url = new URL( window.location.href );
		if ( 'build' === mode ) {
			url.searchParams.delete( 'tab' );
		} else {
			url.searchParams.set( 'tab', mode );
		}
		window.history.replaceState( {}, '', url );
	}, [ mode ] );

	// Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl+Y to redo (not while a modal is open).
	useEffect( () => {
		const onKey = ( event ) => {
			if ( modal || ! ( event.ctrlKey || event.metaKey ) ) {
				return;
			}
			const key = event.key.toLowerCase();
			if ( 'z' === key && ! event.shiftKey ) {
				event.preventDefault();
				undo();
			} else if ( 'y' === key || ( 'z' === key && event.shiftKey ) ) {
				event.preventDefault();
				redo();
			}
		};
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	} );

	const save = async () => {
		if ( ! formId ) {
			return;
		}
		setSaving( 'saving' );
		try {
			const res = await apiFetch( {
				path:   `cf7e/v1/forms/${ formId }/builder`,
				method: 'PUT',
				data:   { fields: stripIds( items ), redirect, steps, css_class: cssClass },
			} );
			setItems( ensureIds( res.fields || [] ) );
			setRedirect( res.redirect || {} );
			setSteps( res.steps || {} );
				setCssClass( res.css_class || '' );
			setSaving( 'saved' );
			// Whatever was on screen is the live form now, restored or not.
			setLoaded( null );
			setTimeout( () => setSaving( 'idle' ), 2000 );
		} catch ( err ) {
			setError( err.message );
			setSaving( 'idle' );
		}
	};

	// Snapshot the present into the undo stack — call before any mutation.
	const beginChange = () => {
		setPast( ( stack ) => [ ...stack, items ].slice( -50 ) );
		setFuture( [] );
	};

	/*
	 * History — the same idea as undo/redo, one timescale up.
	 *
	 * Undo covers this sitting; this covers the last ten times the form was
	 * saved, and survives a reload. They sit together in the header for that
	 * reason.
	 */
	const openHistory = () => {
		setHistory( { loading: true, list: [], error: null } );

		apiFetch( { path: `cf7e/v1/forms/${ formId }/revisions` } )
			.then( ( list ) => setHistory( { loading: false, list, error: null } ) )
			.catch( ( err ) => setHistory( { loading: false, list: [], error: err.message } ) );
	};

	/*
	 * Loading a version is not a restore in the destructive sense — nothing is
	 * written. The canvas fills with the older state, the Save bar notices, and
	 * the user decides. Opening the wrong one costs a Ctrl+Z.
	 */
	const loadRevision = ( rev ) => {
		setHistory( ( state ) => ( { ...state, loading: true } ) );

		apiFetch( { path: `cf7e/v1/forms/${ formId }/revisions/${ rev }` } )
			.then( ( res ) => {
				beginChange();
				setItems( ensureIds( res.fields || [] ) );
				setRedirect( res.redirect || {} );
				setSteps( res.steps || {} );
				setCssClass( res.css_class || '' );
				setHistory( null );

				/*
				 * Say so. A loaded version looks exactly like a saved one — the
				 * canvas simply fills with the older form — so without this it
				 * is easy to open one, see it, and close the tab believing the
				 * rollback happened. Nothing would be lost, but the user would
				 * be wrong about the state of their site.
				 */
				setLoaded( res.time );
			} )
			.catch( ( err ) => setHistory( ( state ) => ( { ...state, loading: false, error: err.message } ) ) );
	};

	const undo = () => {
		if ( ! past.length ) {
			return;
		}
		setFuture( ( stack ) => [ items, ...stack ] );
		setItems( past[ past.length - 1 ] );
		setPast( ( stack ) => stack.slice( 0, -1 ) );
		// A restore is one entry on that stack, so undoing may have just taken
		// it back off; the notice would be describing a canvas that is gone.
		setLoaded( null );
	};

	const redo = () => {
		if ( ! future.length ) {
			return;
		}
		setPast( ( stack ) => [ ...stack, items ] );
		setItems( future[ 0 ] );
		setFuture( ( stack ) => stack.slice( 1 ) );
	};

	const openAdd      = () => { setModal( { mode: 'add' } ); setDraft( null ); setAddTarget( null ); };
	const openAddToRow = ( rowId, col ) => { setModal( { mode: 'add' } ); setDraft( null ); setAddTarget( { rowId, col } ); };
	const openEdit     = ( field ) => { setModal( { mode: 'edit' } ); setDraft( { ...field } ); setAddTarget( null ); setFieldTab( 'general' ); setDraftError( '' ); };
	const closeModal   = () => { setModal( null ); setDraft( null ); setAddTarget( null ); setDraftError( '' ); };
	const pickType     = ( type ) => { setDraft( { _id: uid(), _nameTouched: false, ...makeField( type ) } ); setFieldTab( 'general' ); setDraftError( '' ); };
	const patchDraft   = ( patch ) => setDraft( ( current ) => ( current ? { ...current, ...patch } : current ) );

	const addRow = () => {
		beginChange();
		setItems( ( curr ) => [ ...curr, { _id: uid(), kind: 'row', columns: [ [], [] ] } ] );
	};

	// The break that opens step 2 is the one the user asked for. The one at the
	// top comes with it, so step 1 has somewhere to keep a title too — without
	// it the first screen of every multi-step form is the only unnameable one.
	const addPageBreak = () => {
		beginChange();
		setItems( ( curr ) => {
			const opening = opensWithBreak( curr ) || ! curr.length ? [] : [ { _id: uid(), kind: 'pagebreak' } ];
			return [ ...opening, ...curr, { _id: uid(), kind: 'pagebreak' } ];
		} );
	};


	const commitDraft = () => {
		if ( ! draft ) {
			return;
		}
		// Without a name the field can't be posted, stored or referenced in a
		// condition — so it has no meaning in the form.
		if ( 'field' === draft.kind && 'submit' !== draft.type && ! ( draft.name || '' ).trim() ) {
			setDraftError( __( 'Give this field a name — it identifies the field in submissions, email and conditions.', 'essentials-for-contact-form-7' ) );
			setFieldTab( 'general' );
			return;
		}
		setDraftError( '' );
		beginChange();
		setItems( ( curr ) =>
			addTarget
				? curr.map( ( it ) =>
					( it._id === addTarget.rowId && 'row' === it.kind
						? { ...it, columns: it.columns.map( ( col, ci ) => ( ci === addTarget.col ? [ ...col, draft ] : col ) ) }
						: it ) )
				: replaceById( curr, draft )
		);
		closeModal();
	};

	const deleteField = ( id ) => { beginChange(); setItems( ( curr ) => removeById( curr, id ) ); };

	const setRowCols = ( id, n ) => {
		beginChange();
		setItems( ( curr ) =>
			curr.map( ( it ) => {
				if ( it._id !== id || 'row' !== it.kind ) {
					return it;
				}
				const cols = it.columns || [];
				if ( n >= cols.length ) {
					const next = cols.slice();
					while ( next.length < n ) {
						next.push( [] );
					}
					return { ...it, columns: next };
				}
				// Shrink: keep the first n columns, fold the rest into the last kept one.
				const kept    = cols.slice( 0, n );
				const dropped = cols.slice( n ).flat();
				kept[ n - 1 ] = [ ...kept[ n - 1 ], ...dropped ];
				return { ...it, columns: kept };
			} )
		);
	};

	const duplicateField = ( id ) => { beginChange(); setItems( ( curr ) => duplicateById( curr, id ) ); };

	const sensors = useSensors(
		useSensor( PointerSensor, { activationConstraint: { distance: 4 } } ),
		useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } ),
	);

	// Stabilises cross-container collisions so the drop target doesn't flicker.
	const lastOverId    = useRef( null );
	const recentlyMoved = useRef( false );
	useEffect( () => { recentlyMoved.current = false; }, [ items ] );

	const collisionDetection = useCallback(
		( args ) => {
			const active = findItemDeep( items, activeId );

			// Root-only blocks (rows, page breaks) reorder against other root blocks.
			if ( isRootOnly( active ) ) {
				return closestCenter( {
					...args,
					droppableContainers: args.droppableContainers.filter(
						( container ) => ROOT === findContainer( items, container.id ) && ! parseColId( container.id )
					),
				} );
			}

			// Fields: pointer hit first, rectangle overlap as fallback.
			const pointer = pointerWithin( args );
			const hits    = pointer.length ? pointer : rectIntersection( args );

			// Is the pointer inside a column? (A column hit beats the row that
			// wraps it, so chips never resolve to the root by accident.)
			const colHit = hits.map( ( hit ) => hit.id ).find( ( id ) => parseColId( id ) );
			if ( colHit ) {
				const inner = getContainerItems( items, colHit );
				if ( inner.length ) {
					const closest = closestCenter( {
						...args,
						droppableContainers: args.droppableContainers.filter( ( container ) => inner.some( ( item ) => item._id === container.id ) ),
					} );
					const id = closest[ 0 ]?.id ?? colHit;
					lastOverId.current = id;
					return [ { id } ];
				}
				lastOverId.current = colHit;
				return [ { id: colHit } ];
			}

			// Otherwise resolve to the nearest root block.
			const overId = getFirstCollision( hits, 'id' );
			if ( null != overId ) {
				lastOverId.current = overId;
				return [ { id: overId } ];
			}

			// Nothing under the pointer — hold the last target to avoid flicker.
			if ( recentlyMoved.current ) {
				lastOverId.current = activeId;
			}
			return lastOverId.current ? [ { id: lastOverId.current } ] : [];
		},
		[ activeId, items ]
	);

	const onDragStart = ( event ) => {
		beginChange();
		setActiveId( event.active.id );
	};

	// Live: as the pointer crosses into a different container, move the field
	// there so the sortable opens a placeholder gap.
	const onDragOver = ( event ) => {
		const { active, over } = event;
		if ( ! over ) {
			return;
		}
		setItems( ( curr ) => {
			const activeC = findContainer( curr, active.id );
			const overC   = findContainer( curr, over.id );
			if ( ! activeC || ! overC || activeC === overC ) {
				return curr;
			}
			const activeItem = findItemDeep( curr, active.id );
			if ( ! activeItem || isRootOnly( activeItem ) ) {
				return curr; // root-only blocks reorder at the root, finalised on drop
			}
			recentlyMoved.current = true;
			return moveToContainer( curr, active.id, over.id, overC );
		} );
	};

	const onDragEnd = ( event ) => {
		const { active, over } = event;
		setActiveId( null );
		if ( ! over ) {
			return;
		}
		setItems( ( curr ) => {
			const activeItem = findItemDeep( curr, active.id );
			if ( isRootOnly( activeItem ) ) {
				return moveItem( curr, active.id, over.id );
			}
			// Field/content was already placed in its container by onDragOver;
			// just settle its order within that container.
			const overC = findContainer( curr, over.id );
			if ( ! overC ) {
				return curr;
			}
			const list = getContainerItems( curr, overC );
			const from = list.findIndex( ( item ) => item._id === active.id );
			const to   = list.findIndex( ( item ) => item._id === over.id );
			if ( -1 === from || -1 === to || from === to ) {
				return curr;
			}
			return setContainerItems( curr, overC, arrayMove( list, from, to ) );
		} );
	};

	const onDragCancel = () => setActiveId( null );

	const showPicker  = modal && 'add' === modal.mode && ! draft;
	const isStepDraft = !! draft && 'pagebreak' === draft.kind;

	return (
		<Page>
			<PageHeader
				title={ __( 'Form Builder', 'essentials-for-contact-form-7' ) }
				subtitle={ title || ( formId ? sprintf( /* translators: %d: form ID. */ __( 'Form #%d', 'essentials-for-contact-form-7' ), formId ) : __( 'No form selected.', 'essentials-for-contact-form-7' ) ) }
				actions={
					<div className="cf7e-flex cf7e-items-center cf7e-gap-2">
						{ /* Beside the tools rather than above the tabs.
						     
						     It is a thing you reach for while working, like undo
						     and history, not a heading for the page. Compact so it
						     stands at button height and cannot push the row wide:
						     a shortcode is long and this one truncates. */ }
						{ !! formId && <ShortcodeBox code={ shortcode } loading={ loading } compact /> }
						<div className="cf7e-flex cf7e-items-center cf7e-gap-1">
							<button type="button" onClick={ undo } disabled={ ! past.length } aria-label={ __( 'Undo', 'essentials-for-contact-form-7' ) } title={ __( 'Undo (Ctrl+Z)', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-9 cf7e-w-9 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-text-stone-500 cf7e-transition-colors hover:cf7e-bg-stone-50 hover:cf7e-text-ink disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-40">
								<Undo2 className="cf7e-h-4 cf7e-w-4" />
							</button>
							<button type="button" onClick={ redo } disabled={ ! future.length } aria-label={ __( 'Redo', 'essentials-for-contact-form-7' ) } title={ __( 'Redo (Ctrl+Shift+Z)', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-9 cf7e-w-9 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-text-stone-500 cf7e-transition-colors hover:cf7e-bg-stone-50 hover:cf7e-text-ink disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-40">
								<Redo2 className="cf7e-h-4 cf7e-w-4" />
							</button>
							{ /* Beside undo/redo because it is the same idea at a
							     longer timescale — this sitting, and the ten saves
							     before it. */ }
							<button type="button" onClick={ openHistory } disabled={ ! formId || loading } aria-label={ __( 'History', 'essentials-for-contact-form-7' ) } title={ __( 'Earlier saved versions of this form', 'essentials-for-contact-form-7' ) } className="cf7e-flex cf7e-h-9 cf7e-w-9 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-text-stone-500 cf7e-transition-colors hover:cf7e-bg-stone-50 hover:cf7e-text-ink disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-40">
								<History className="cf7e-h-4 cf7e-w-4" />
							</button>
						</div>
						{ /* Styling is global, not this form's — but this is where
						     someone stands when they decide the form looks wrong,
						     and a link they can find beats a setting they cannot. */ }
						<a
							href="admin.php?page=cf7-essentials-styling"
							className={ btnGhost }
							title={ __( 'Colours, shape and spacing for every form', 'essentials-for-contact-form-7' ) }
						>
							<Palette className="cf7e-h-4 cf7e-w-4 cf7e-text-stone-400" />
							{ __( 'Styling', 'essentials-for-contact-form-7' ) }
						</a>
						<button
							type="button"
							disabled={ loading || 'saving' === saving }
							onClick={ save }
							className={ `${ btnPrimary } cf7e-px-5` }
						>
							{ 'saving' === saving ? <Loader2 className="cf7e-h-4 cf7e-w-4 cf7e-animate-spin" /> : 'saved' === saving ? <Check className="cf7e-h-4 cf7e-w-4" /> : <Save className="cf7e-h-4 cf7e-w-4" /> }
							{ 'saved' === saving ? __( 'Saved', 'essentials-for-contact-form-7' ) : __( 'Save', 'essentials-for-contact-form-7' ) }
						</button>
					</div>
				}
			/>

			{ error && (
				<div className="cf7e-mb-4 cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">{ error }</div>
			) }

			{ null !== loaded && (
				<div className="cf7e-mb-4 cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-gap-x-2 cf7e-gap-y-1 cf7e-rounded-lg cf7e-border cf7e-border-amber-200 cf7e-bg-amber-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-text-amber-800">
					<strong className="cf7e-font-semibold">
						{ sprintf(
							/* translators: %s: when the version was saved, e.g. "Today at 1:49:07 PM". */
							__( 'Showing the version from %s.', 'essentials-for-contact-form-7' ),
							revisionWhen( loaded )
						) }
					</strong>
					<span>{ __( 'Nothing has changed on your site yet — press Save to keep it, or Ctrl+Z to go back.', 'essentials-for-contact-form-7' ) }</span>
				</div>
			) }

			<Tabs
				className="cf7e-mb-4"
				active={ mode }
				onChange={ setMode }
				tabs={ [
					{ id: 'build', label: __( 'Build', 'essentials-for-contact-form-7' ) },
					{ id: 'preview', label: __( 'Preview', 'essentials-for-contact-form-7' ) },
					{ id: 'settings', label: __( 'Settings', 'essentials-for-contact-form-7' ) },
				] }
			/>

			{ loading ? (
				<div className="cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white">
					<div className={ `cf7e-grid ${ COLS } cf7e-items-center cf7e-gap-3 cf7e-border-b cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-4 cf7e-py-2.5` }>
						<span /><span /><span /><span /><span /><span />
					</div>
					{ /* py-3 and a 32px action button, both taken from FieldRow above:
					     the padding was py-3.5 here and the last cell a 16px bar,
					     which is a row 8px shorter than the one replacing it. */ }
					{ Array.from( { length: 4 } ).map( ( _, i ) => (
						<div key={ i } className={ `cf7e-grid ${ COLS } cf7e-items-center cf7e-gap-3 cf7e-border-b cf7e-border-line cf7e-px-4 cf7e-py-3 last:cf7e-border-0` }>
							<div className="cf7e-h-4 cf7e-w-4 cf7e-animate-pulse cf7e-rounded cf7e-bg-stone-100" />
							<Shimmer w="cf7e-w-5" text="cf7e-text-[14px]" />
							<Shimmer w="cf7e-w-32" text="cf7e-text-sm" />
							<Shimmer w="cf7e-w-24" text="cf7e-text-[14px]" />
							<span className="cf7e-inline-block cf7e-w-fit cf7e-animate-pulse cf7e-rounded-md cf7e-bg-stone-100 cf7e-px-2 cf7e-py-1 cf7e-text-[14px] cf7e-text-transparent">
								{ '\u00a0\u00a0\u00a0\u00a0\u00a0' }
							</span>
							<div className="cf7e-h-8 cf7e-w-8 cf7e-animate-pulse cf7e-rounded-lg cf7e-bg-stone-100" />
						</div>
					) ) }
				</div>
			) : 'settings' === mode ? (
				<div className="cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-6">
					{ /* Full width. A max-width here left every field hugging the
					     left edge of a card that ran the width of the screen,
					     which reads as a layout that has gone wrong rather than
					     as a measured column. */ }
					<div className="cf7e-flex cf7e-flex-col cf7e-gap-5">
						{ /*
						  * A hook for the one form that has to look different.
						  *
						  * Styling sets how every form on the site looks; this is
						  * the other half. The name goes on the form element
						  * itself, so `.my-form input` is what somebody writes —
						  * a wrapper would make it `.my-form .wpcf7-form input`
						  * and surprise them every time.
						  */ }
						<LField
							label={ __( 'CSS class', 'essentials-for-contact-form-7' ) }
							hint={ __( 'Added to this form only, so your theme can style it on its own. Letters, numbers, hyphens and underscores; separate several with spaces.', 'essentials-for-contact-form-7' ) }
						>
							<input
								className={ inputCls }
								type="text"
								placeholder="my-contact-form"
								value={ cssClass }
								onChange={ ( event ) => setCssClass( event.target.value ) }
							/>
						</LField>
						<hr className="cf7e-m-0 cf7e-border-0 cf7e-border-t cf7e-border-line" />

						{ items.some( ( it ) => 'pagebreak' === it.kind ) && (
							<>
								<LField
									label={ __( 'Step indicator', 'essentials-for-contact-form-7' ) }
									hint={ __( 'How progress through the steps is shown above the fields.', 'essentials-for-contact-form-7' ) }
								>
									<Select
										value={ steps.indicator || 'bar' }
										onChange={ ( value ) => setSteps( { ...steps, indicator: value } ) }
										options={ [
											{ value: 'bar', label: __( 'Progress bar', 'essentials-for-contact-form-7' ) },
											{ value: 'dots', label: __( 'Dots', 'essentials-for-contact-form-7' ) },
											{ value: 'numbers', label: __( 'Numbers', 'essentials-for-contact-form-7' ) },
											{ value: 'titles', label: __( 'Numbers with step titles', 'essentials-for-contact-form-7' ) },
											{ value: 'none', label: __( 'None', 'essentials-for-contact-form-7' ) },
										] }
									/>
								</LField>
								<hr className="cf7e-m-0 cf7e-border-0 cf7e-border-t cf7e-border-line" />
							</>
						) }

						<RedirectDestination
							redirect={ redirect }
							items={ items }
							onChange={ ( patch ) => setRedirect( { ...redirect, ...patch } ) }
						/>

						{ !! hasDestination( redirect ) && (
							<>
								<LField
									label={ __( 'Wait before redirecting', 'essentials-for-contact-form-7' ) }
									hint={ __( 'Seconds to leave the success message on screen. 0 redirects straight away.', 'essentials-for-contact-form-7' ) }
								>
									<input
										className={ `${ inputCls } cf7e-w-28` }
										type="number"
										min="0"
										max="60"
										value={ redirect.delay ?? 0 }
										onChange={ ( event ) => setRedirect( { ...redirect, delay: parseInt( event.target.value, 10 ) || 0 } ) }
									/>
								</LField>

								{ /*
								  * A new tab needs the click that asked for it to still count, and
								  * browsers stop counting a few seconds after it. Measured on this: a
								  * two second wait opens the tab, five does not, and the submit itself
								  * spends about a second of the allowance before the wait even starts.
								  * So the warning is on the long waits, not on the setting.
								  */ }
								<LField
									label={ __( 'Open in', 'essentials-for-contact-form-7' ) }
									hint={ 'blank' === ( redirect.target || 'same' ) && ( redirect.delay ?? 0 ) > 3
										? __( 'Browsers only allow a new tab for a few seconds after the click, so a wait this long is usually refused and the page opens in this tab instead. Around 2 seconds is reliable.', 'essentials-for-contact-form-7' )
										: undefined }
								>
									<Select
										value={ redirect.target || 'same' }
										onChange={ ( value ) => setRedirect( { ...redirect, target: value } ) }
										options={ [
											{ value: 'same', label: __( 'The same tab', 'essentials-for-contact-form-7' ) },
											{ value: 'blank', label: __( 'A new tab — the form stays open', 'essentials-for-contact-form-7' ) },
										] }
									/>
								</LField>

								{ 'blank' !== ( redirect.target || 'same' ) && (
									<LField
										label={ __( 'Browser history', 'essentials-for-contact-form-7' ) }
										hint={ __( 'Replacing the entry stops the Back button returning to the submitted form.', 'essentials-for-contact-form-7' ) }
									>
										<Select
											value={ redirect.method || 'assign' }
											onChange={ ( value ) => setRedirect( { ...redirect, method: value } ) }
											options={ [
												{ value: 'assign', label: __( 'Keep this page in history', 'essentials-for-contact-form-7' ) },
												{ value: 'replace', label: __( 'Replace this page in history', 'essentials-for-contact-form-7' ) },
											] }
										/>
									</LField>
								) }

								<RedirectParams
									redirect={ redirect }
									items={ items }
									onChange={ ( patch ) => setRedirect( { ...redirect, ...patch } ) }
								/>
							</>
						) }
					</div>
				</div>
			) : 'preview' === mode ? (
				<Preview items={ items } title={ title } indicator={ steps.indicator } />
			) : 0 === items.length ? (
				<div className="cf7e-flex cf7e-flex-col cf7e-items-center cf7e-justify-center cf7e-rounded-2xl cf7e-border cf7e-border-dashed cf7e-border-stroke cf7e-bg-white cf7e-py-16 cf7e-text-center">
					<div className="cf7e-mb-4 cf7e-flex cf7e-h-14 cf7e-w-14 cf7e-items-center cf7e-justify-center cf7e-rounded-2xl cf7e-bg-accent-50 cf7e-text-accent">
						<Wand2 className="cf7e-h-7 cf7e-w-7" />
					</div>
					<h3 className="cf7e-m-0 cf7e-text-lg cf7e-font-bold cf7e-text-ink">{ __( 'Build your form', 'essentials-for-contact-form-7' ) }</h3>
					<p className="cf7e-mb-5 cf7e-mt-1 cf7e-text-sm cf7e-text-stone-500">{ __( 'Add your first field to get started.', 'essentials-for-contact-form-7' ) }</p>
					<div className="cf7e-flex cf7e-items-center cf7e-gap-2">
						<button type="button" onClick={ openAdd } className={ accentBtn + ' cf7e-h-10 cf7e-px-5 cf7e-text-sm' }>
							<Plus className="cf7e-h-4 cf7e-w-4" /> { __( 'Add field', 'essentials-for-contact-form-7' ) }
						</button>
						<button type="button" onClick={ addRow } className={ ghostBtn + ' cf7e-h-10 cf7e-px-5 cf7e-text-sm' }>
							<LayoutGrid className="cf7e-h-4 cf7e-w-4" /> { __( 'Add row', 'essentials-for-contact-form-7' ) }
						</button>
					</div>
				</div>
			) : (
				<div className="cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white">
					<div className={ `cf7e-grid ${ COLS } cf7e-items-center cf7e-gap-3 cf7e-border-b cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-4 cf7e-py-2.5 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400` }>
						<span />
						<span>#</span>
						<span>{ __( 'Label', 'essentials-for-contact-form-7' ) }</span>
						<span>{ __( 'Name', 'essentials-for-contact-form-7' ) }</span>
						<span>{ __( 'Type', 'essentials-for-contact-form-7' ) }</span>
						<span />
					</div>
					<DndContext sensors={ sensors } collisionDetection={ collisionDetection } measuring={ { droppable: { strategy: MeasuringStrategy.Always } } } onDragStart={ onDragStart } onDragOver={ onDragOver } onDragEnd={ onDragEnd } onDragCancel={ onDragCancel }>
						<SortableContext items={ items.map( ( it ) => it._id ) } strategy={ verticalListSortingStrategy }>
							{ items.map( ( item, i ) =>
								'row' === item.kind ? (
									<RowBlock
										key={ item._id }
										row={ item }
										onCols={ ( count ) => setRowCols( item._id, count ) }
										onDuplicate={ () => duplicateField( item._id ) }
										onDelete={ () => deleteField( item._id ) }
										onAddField={ ( ci ) => openAddToRow( item._id, ci ) }
										onEditChild={ openEdit }
										onDuplicateChild={ duplicateField }
										onDeleteChild={ deleteField }
									/>
								) : 'pagebreak' === item.kind ? (
									<PageBreakBar
										key={ item._id }
										item={ item }
										step={ stepNumbers( items )[ item._id ] }
										onEdit={ () => openEdit( item ) }
										onDelete={ () => deleteField( item._id ) }
									/>
								) : (
									<FieldRow
										key={ item._id }
										field={ item }
										index={ i }
										onEdit={ () => openEdit( item ) }
										onDelete={ () => deleteField( item._id ) }
										onDuplicate={ () => duplicateField( item._id ) }
									/>
								)
							) }
						</SortableContext>
						<DragOverlay dropAnimation={ { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' } }>
							{ activeId ? <DragPreview item={ findItemDeep( items, activeId ) } /> : null }
						</DragOverlay>
					</DndContext>
				</div>
			) }

			{ ! loading && 'build' === mode && items.length > 0 && (
				<div className="cf7e-mt-3 cf7e-flex cf7e-gap-2">
					<button
						type="button"
						onClick={ openAdd }
						className="cf7e-flex cf7e-flex-1 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-gap-2 cf7e-rounded-xl cf7e-border cf7e-border-dashed cf7e-border-stroke cf7e-bg-white cf7e-py-3 cf7e-text-sm cf7e-font-semibold cf7e-text-stone-500 cf7e-transition-colors hover:cf7e-border-accent hover:cf7e-text-accent"
					>
						<Plus className="cf7e-h-4 cf7e-w-4" />
						{ __( 'Add field', 'essentials-for-contact-form-7' ) }
					</button>
					<button
						type="button"
						onClick={ addRow }
						className="cf7e-flex cf7e-flex-1 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-gap-2 cf7e-rounded-xl cf7e-border cf7e-border-dashed cf7e-border-stroke cf7e-bg-white cf7e-py-3 cf7e-text-sm cf7e-font-semibold cf7e-text-stone-500 cf7e-transition-colors hover:cf7e-border-accent hover:cf7e-text-accent"
					>
						<LayoutGrid className="cf7e-h-4 cf7e-w-4" />
						{ __( 'Add row', 'essentials-for-contact-form-7' ) }
					</button>
					<button
						type="button"
						onClick={ addPageBreak }
						className="cf7e-flex cf7e-flex-1 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-gap-2 cf7e-rounded-xl cf7e-border cf7e-border-dashed cf7e-border-stroke cf7e-bg-white cf7e-py-3 cf7e-text-sm cf7e-font-semibold cf7e-text-stone-500 cf7e-transition-colors hover:cf7e-border-accent hover:cf7e-text-accent"
					>
						<Scissors className="cf7e-h-4 cf7e-w-4" />
						{ __( 'Add page break', 'essentials-for-contact-form-7' ) }
					</button>
				</div>
			) }

			{ modal && (
				<Modal
					title={ showPicker ? __( 'Add a field', 'essentials-for-contact-form-7' ) : isStepDraft ? ( draft.title || sprintf( /* translators: %d: step number. */ __( 'Step %d', 'essentials-for-contact-form-7' ), stepNumbers( items )[ draft._id ] || 1 ) ) : ( draft?.label || __( 'Field settings', 'essentials-for-contact-form-7' ) ) }
					badge={ showPicker || isStepDraft ? null : draft?.type }
					wide={ showPicker }
					onClose={ closeModal }
					footer={
						showPicker ? (
							<>
								<span className="cf7e-flex-1" />
								<button type="button" className={ ghostBtn } onClick={ closeModal }>{ __( 'Cancel', 'essentials-for-contact-form-7' ) }</button>
							</>
						) : (
							<>
								{ 'add' === modal.mode && (
									<button type="button" className={ ghostBtn } onClick={ () => setDraft( null ) }>{ __( '← Back', 'essentials-for-contact-form-7' ) }</button>
								) }
								<span className="cf7e-flex-1" />
								<button type="button" className={ ghostBtn } onClick={ closeModal }>{ __( 'Cancel', 'essentials-for-contact-form-7' ) }</button>
								<button type="button" className={ accentBtn } onClick={ commitDraft }>{ __( 'Done', 'essentials-for-contact-form-7' ) }</button>
							</>
						)
					}
				>
					{ showPicker ? <TypePicker onPick={ pickType } /> : isStepDraft ? (
						<StepSettingsForm step={ draft } nav={ stepNav( items, draft._id ) } onChange={ patchDraft } />
					) : (
						<>
							{ draftError && (
								<div className="cf7e-mb-4 cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-3.5 cf7e-py-2.5 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">{ draftError }</div>
							) }
							<FieldSettingsForm field={ draft } onChange={ patchDraft } availableFields={ collectFields( items ).filter( ( other ) => other._id !== draft?._id ) } tab={ fieldTab } onTab={ setFieldTab } />
						</>
					) }
				</Modal>
			) }

			{ history && (
				<Modal
					title={ __( 'Earlier versions', 'essentials-for-contact-form-7' ) }
					onClose={ () => setHistory( null ) }
					footer={
						<>
							<span className="cf7e-flex-1" />
							<button type="button" onClick={ () => setHistory( null ) } className={ btnGhost }>
								{ __( 'Close', 'essentials-for-contact-form-7' ) }
							</button>
						</>
					}
				>
					<RevisionList state={ history } onPick={ loadRevision } />
				</Modal>
			) }
		</Page>
	);
};

const mount = document.getElementById( 'cf7e-builder-root' );
if ( mount ) {
	const formId = parseInt( mount.dataset.formId || '0', 10 );
	createRoot( mount ).render( <App formId={ formId } /> );
}
