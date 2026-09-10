import { createRoot, useEffect, useMemo, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Search,
	Inbox,
	ChevronLeft,
	ChevronRight,
	X,
	Trash2,
	Download,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	AlertTriangle,
	CalendarDays,
	ShieldAlert,
	FileText,
	Filter,
	CheckCheck,
	Check,
	Reply,
	Paperclip,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Page, PageHeader } from '@shared/components/page';
import { Backdrop, btnDanger, btnGhost, Select, Tabs, focusRing, Shimmer } from '@shared/components/ui';
import { parseFields } from '@shared/submission-fields';
import '@shared/styles/admin.css';

const PER_PAGE_OPTIONS = [ 20, 50, 100 ];

const DATE_PRESETS = [
	{ id: 'all',   label: __( 'All time', 'defer-forms-for-contact-form-7' ),    days: null },
	{ id: 'today', label: __( 'Today', 'defer-forms-for-contact-form-7' ),       days: 0 },
	{ id: '7d',    label: __( 'Last 7 days', 'defer-forms-for-contact-form-7' ), days: 7 },
	{ id: '30d',   label: __( 'Last 30 days', 'defer-forms-for-contact-form-7' ),days: 30 },
];

const dateRangeFor = ( presetId ) => {
	const preset = DATE_PRESETS.find( ( candidate ) => candidate.id === presetId );
	if ( ! preset || preset.days === null ) {
		return { from: '', to: '' };
	}
	// Midnight where the reader is, then converted to UTC for the query — the
	// column is UTC but "today" is a local idea. Setting UTC midnight instead put
	// the boundary hours away from the dates this same screen prints, so entries
	// stamped today were missing from "Today".
	const from = new Date();
	from.setDate( from.getDate() - preset.days );
	from.setHours( 0, 0, 0, 0 );
	return {
		from: from.toISOString().slice( 0, 19 ).replace( 'T', ' ' ),
		to:   '',
	};
};

const buildExportUrl = ( filters ) => {
	const cfg    = window.deferformsSubmissions || {};
	const range  = dateRangeFor( filters.date );
	const params = new URLSearchParams( {
		action:    'deferforms_export_csv',
		_wpnonce:  cfg.exportNonce || '',
		search:    filters.search || '',
		status:    filters.status || '',
		form_id:   String( filters.formId || 0 ),
		date_from: range.from,
		date_to:   range.to,
	} );
	return `${ cfg.exportUrl || '' }?${ params.toString() }`;
};

const formatDate = ( mysqlUtc ) => {
	const date = new Date( mysqlUtc.replace( ' ', 'T' ) + 'Z' );
	return date.toLocaleString( undefined, { dateStyle: 'medium', timeStyle: 'short' } );
};

// Allow the Forms page to deep-link into a pre-filtered list via ?form=ID.
const getInitialFormId = () => {
	const value = parseInt( new URLSearchParams( window.location.search ).get( 'form' ) || '0', 10 );
	return Number.isNaN( value ) ? 0 : value;
};

/**
 * Which tab a link asked for.
 *
 * The dashboard has always sent ?status=spam with its "1 spam entry was caught"
 * link, and this page has always ignored it — so it opened on All, where the
 * spam sits among everything else and the reader has to find it. The link named
 * the right thing; nothing read it.
 *
 * An allow-list, because this decides which tab is lit and goes on to the query
 * as a filter. Anything else is treated as no filter at all, which is the tab
 * the page opens on anyway.
 */
const getInitialStatus = () => {
	const value = new URLSearchParams( window.location.search ).get( 'status' ) || '';

	return [ 'submitted', 'spam' ].includes( value ) ? value : '';
};

/**
 * One entry, named in the address by whoever linked here.
 *
 * The dashboard lists the five newest and every one of them used to arrive at
 * this page unopened — the same screen whichever row was clicked, with nothing
 * to say which. It opens now.
 *
 * Read out of the loaded page rather than fetched on its own: there is no route
 * for a single entry, and the five newest are always on the first page of a
 * list that starts at twenty, newest first. A link to something older finds
 * nothing and leaves the list alone, which is what it can honestly do.
 */
const getRequestedEntry = () => {
	const value = parseInt( new URLSearchParams( window.location.search ).get( 'entry' ) || '0', 10 );
	return Number.isNaN( value ) ? 0 : value;
};

/**
 * Put the open entry in the address, or take it out again.
 *
 * The link the dashboard sends worked in one direction only: arrive at
 * ?entry=79 and the drawer opened, but open one by clicking and the address
 * still said whatever it said before. So the page could be linked to and could
 * not be linked FROM — no copying the address of the entry in front of you, and
 * Back left the site rather than closing the drawer.
 *
 * pushState, not replaceState: each entry opened is somewhere the reader has
 * been, and Back should walk back through them.
 */
const pushEntry = ( id ) => {
	const url = new URL( window.location.href );

	if ( id ) {
		url.searchParams.set( 'entry', String( id ) );
	} else {
		url.searchParams.delete( 'entry' );
	}

	if ( url.href !== window.location.href ) {
		window.history.pushState( { entry: id || 0 }, '', url.href );
	}
};

/**
 * The files kept for one field, or null when it is an ordinary answer.
 *
 * Contact Form 7 stores a file field's value as a sha256 of the file's contents
 * and then deletes the file, so the row on its own can never show what was sent.
 * A copy is taken at submit time and listed under `_deferforms_files` — a key the
 * field list already skips, so it shows up here and nowhere else.
 */
const attachmentsFor = ( json, field ) => {
	try {
		const kept = JSON.parse( json )._deferforms_files;
		const files = kept && kept.fields && kept.fields[ field ];

		if ( ! files || ! files.length ) {
			return null;
		}

		files.dir = kept.dir;
		return files;
	} catch {
		return null;
	}
};

const attachmentUrl = ( dir, file ) => {
	const cfg = window.deferformsSubmissions || {};
	const params = new URLSearchParams( {
		action:   'deferforms_attachment',
		_wpnonce: cfg.attachmentNonce || '',
		dir:      dir || '',
		file:     file.file,
		name:     file.name,
	} );
	return `${ cfg.exportUrl || '' }?${ params.toString() }`;
};

const fileSize = ( bytes ) => {
	const size = Number( bytes ) || 0;
	if ( size < 1024 ) {
		return sprintf( /* translators: %d: size in bytes. */ __( '%d B', 'defer-forms-for-contact-form-7' ), size );
	}
	if ( size < 1024 * 1024 ) {
		return sprintf( /* translators: %s: size in kilobytes. */ __( '%s KB', 'defer-forms-for-contact-form-7' ), ( size / 1024 ).toFixed( 0 ) );
	}
	return sprintf( /* translators: %s: size in megabytes. */ __( '%s MB', 'defer-forms-for-contact-form-7' ), ( size / 1024 / 1024 ).toFixed( 1 ) );
};

const fieldPreview = ( json ) => {
	const entries = parseFields( json );
	if ( ! entries.length ) {
		return '—';
	}
	return entries
		.slice( 0, 2 )
		.map( ( [ key, value ] ) => `${ key }: ${ Array.isArray( value ) ? value.join( ', ' ) : String( value ) }` )
		.join( '  ·  ' );
};

const STATUS_META = {
	submitted: { dot: 'deferforms-bg-emerald-500', cls: 'deferforms-bg-emerald-50 deferforms-text-emerald-700', label: __( 'Submitted', 'defer-forms-for-contact-form-7' ) },
	spam:      { dot: 'deferforms-bg-red-500',     cls: 'deferforms-bg-red-50 deferforms-text-red-700',         label: __( 'Spam', 'defer-forms-for-contact-form-7' ) },
};

/**
 * How far somebody has got with an entry.
 *
 * A different question from the pill beside it: that one says what the entry is
 * — submitted or spam — and this says what you have done about it. Twenty
 * enquiries and no way to tell which are dealt with was the whole complaint.
 *
 * 'new' is drawn as nothing at all. Most rows are new, and a badge on most rows
 * is a badge that stops being read.
 */
const STAGE_META = {
	replied: { cls: 'deferforms-bg-sky-50 deferforms-text-sky-700', label: __( 'Replied', 'defer-forms-for-contact-form-7' ) },
	done:    { cls: 'deferforms-bg-stone-100 deferforms-text-stone-600', label: __( 'Done', 'defer-forms-for-contact-form-7' ) },
};

const StagePill = ( { stage } ) => {
	const meta = STAGE_META[ stage ];

	if ( ! meta ) {
		return null;
	}

	return (
		<span className={ `deferforms-inline-flex deferforms-items-center deferforms-rounded-full deferforms-px-2.5 deferforms-py-1 deferforms-text-sm deferforms-font-semibold ${ meta.cls }` }>
			{ meta.label }
		</span>
	);
};

const StatusPill = ( { status } ) => {
	const meta = STATUS_META[ status ] || { dot: 'deferforms-bg-stone-400', cls: 'deferforms-bg-stone-100 deferforms-text-stone-600', label: status };
	return (
		<span className={ `deferforms-inline-flex deferforms-items-center deferforms-gap-1.5 deferforms-rounded-full deferforms-px-2.5 deferforms-py-1 deferforms-text-sm deferforms-font-semibold ${ meta.cls }` }>
			<span className={ `deferforms-h-1.5 deferforms-w-1.5 deferforms-rounded-full ${ meta.dot }` } />
			{ meta.label }
		</span>
	);
};

const StatChip = ( { icon: Icon, label, value, tone } ) => {
	const tones = {
		accent:  'deferforms-bg-accent-50 deferforms-text-accent',
		emerald: 'deferforms-bg-emerald-50 deferforms-text-emerald-600',
		amber:   'deferforms-bg-amber-50 deferforms-text-amber-600',
		red:     'deferforms-bg-red-50 deferforms-text-red-600',
	};
	return (
		<div className="deferforms-flex deferforms-items-center deferforms-gap-3 deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-px-4 deferforms-py-3">
			<div className={ `deferforms-flex deferforms-h-10 deferforms-w-10 deferforms-shrink-0 deferforms-items-center deferforms-justify-center deferforms-rounded-xl ${ tones[ tone ] }` }>
				<Icon className="deferforms-h-5 deferforms-w-5" />
			</div>
			<div className="deferforms-flex deferforms-flex-col deferforms-leading-none">
				<span className="deferforms-text-2xl deferforms-font-bold deferforms-tracking-tight deferforms-text-ink deferforms-tnum">
					{ value.toLocaleString() }
				</span>
				<span className="deferforms-mt-1.5 deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">
					{ label }
				</span>
			</div>
		</div>
	);
};

const StatStrip = ( { stats } ) => (
	<div className="deferforms-mb-5 deferforms-grid deferforms-grid-cols-2 deferforms-gap-3 sm:deferforms-grid-cols-4">
		<StatChip icon={ Inbox }        label={ __( 'Total', 'defer-forms-for-contact-form-7' ) }     value={ stats.total } tone="accent" />
		<StatChip icon={ CalendarDays } label={ __( 'Today', 'defer-forms-for-contact-form-7' ) }     value={ stats.today } tone="emerald" />
		<StatChip icon={ CalendarDays } label={ __( 'This week', 'defer-forms-for-contact-form-7' ) } value={ stats.week }  tone="amber" />
		<StatChip icon={ ShieldAlert }  label={ __( 'Spam', 'defer-forms-for-contact-form-7' ) }      value={ stats.spam }  tone="red" />
	</div>
);

/**
 * The All / Submitted / Spam filter.
 *
 * This was a hand-written copy of the shared Tabs that had drifted: the shared
 * one slides an ink marker between the tabs, the copy only recoloured the
 * button, so the highlight faded in place instead of moving. Counts are
 * formatted here because Tabs prints whatever it is given.
 */
const StatusTabs = ( { active, onChange, stats } ) => (
	<Tabs
		active={ active }
		onChange={ onChange }
		tabs={ [
			{ id: '',          label: __( 'All', 'defer-forms-for-contact-form-7' ),       count: stats.total.toLocaleString() },
			{ id: 'submitted', label: __( 'Submitted', 'defer-forms-for-contact-form-7' ), count: stats.submitted.toLocaleString() },
			{ id: 'spam',      label: __( 'Spam', 'defer-forms-for-contact-form-7' ),      count: stats.spam.toLocaleString() },
		] }
	/>
);

// The shared `control` token with the padding left off: the search box makes
// room for its icon with `pl-10`, and a `px-3` alongside it would win or lose
// on stylesheet order rather than on intent.
const controlBase =
	`deferforms-h-9 deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-text-sm deferforms-text-ink deferforms-transition-colors ${ focusRing }`;

const FilterBar = ( {
	search, onSearchChange,
	formId, onFormChange,
	stage,  onStageChange,
	date,   onDateChange,
	perPage, onPerPageChange,
	exportHref,
	forms,
} ) => {
	const formOptions = [
		{ value: 0, label: __( 'All forms', 'defer-forms-for-contact-form-7' ) },
		...forms.map( ( form ) => ( { value: form.form_id, label: `${ form.title } (${ form.count })` } ) ),
	];
	const dateOptions    = DATE_PRESETS.map( ( preset ) => ( { value: preset.id, label: preset.label } ) );

	/*
	 * "Anything" first, then the one people actually come here for.
	 *
	 * Not handled yet is the question this whole column exists to answer: with
	 * twenty enquiries in the list, which ones still need me.
	 */
	const stageOptions = [
		{ value: '', label: __( 'Any progress', 'defer-forms-for-contact-form-7' ) },
		{ value: 'new', label: __( 'Not handled yet', 'defer-forms-for-contact-form-7' ) },
		{ value: 'replied', label: __( 'Replied', 'defer-forms-for-contact-form-7' ) },
		{ value: 'done', label: __( 'Done', 'defer-forms-for-contact-form-7' ) },
	];
	const perPageOptions = PER_PAGE_OPTIONS.map( ( size ) => ( {
		value: size,
		label: sprintf( /* translators: %d: rows per page. */ __( '%d / page', 'defer-forms-for-contact-form-7' ), size ),
	} ) );

	return (
		<div className="deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-gap-2">
			<div className="deferforms-relative deferforms-min-w-[15rem] deferforms-flex-1">
				<Search className="deferforms-pointer-events-none deferforms-absolute deferforms-left-3 deferforms-top-1/2 deferforms-h-4 deferforms-w-4 -deferforms-translate-y-1/2 deferforms-text-stone-400" />
				<input
					type="search"
					value={ search }
					onChange={ ( event ) => onSearchChange( event.target.value ) }
					placeholder={ __( 'Search submissions…', 'defer-forms-for-contact-form-7' ) }
					className={ `${ controlBase } deferforms-w-full deferforms-pl-10 deferforms-pr-3 placeholder:deferforms-text-stone-400` }
				/>
			</div>

			<Select className="deferforms-w-44" icon={ FileText } value={ formId }  onChange={ onFormChange }    options={ formOptions } />
			<Select className="deferforms-w-44" icon={ CheckCheck } value={ stage } onChange={ onStageChange }  options={ stageOptions } />
			<Select className="deferforms-w-40" icon={ Filter }   value={ date }    onChange={ onDateChange }    options={ dateOptions } />
			<Select className="deferforms-w-32" value={ perPage } onChange={ onPerPageChange } options={ perPageOptions } align="right" />

			<a
				href={ exportHref }
				className="deferforms-inline-flex deferforms-h-9 deferforms-cursor-pointer deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border-0 deferforms-bg-ink deferforms-px-4 deferforms-text-sm deferforms-font-semibold deferforms-text-white deferforms-no-underline deferforms-transition-opacity hover:deferforms-opacity-90 active:deferforms-opacity-100"
			>
				<Download className="deferforms-h-4 deferforms-w-4 deferforms-text-white/70" />
				{ __( 'Export CSV', 'defer-forms-for-contact-form-7' ) }
			</a>
		</div>
	);
};

const SortHeader = ( { label, sortKey, currentSort, onSort } ) => {
	const isActive = currentSort.startsWith( sortKey );
	const isDesc   = currentSort === `${ sortKey }_desc`;
	const Icon     = ! isActive ? ArrowUpDown : isDesc ? ArrowDown : ArrowUp;
	const next     = isActive && isDesc ? `${ sortKey }_asc` : `${ sortKey }_desc`;

	return (
		<button
			type="button"
			onClick={ () => onSort( next ) }
			className="deferforms-flex deferforms-cursor-pointer deferforms-items-center deferforms-gap-1 deferforms-border-0 deferforms-bg-transparent deferforms-p-0 deferforms-text-[14px] deferforms-font-bold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400 deferforms-transition-colors hover:deferforms-text-ink"
		>
			{ label }
			<Icon className={ `deferforms-h-3 deferforms-w-3 ${ isActive ? 'deferforms-text-accent' : 'deferforms-text-stone-400' }` } />
		</button>
	);
};

const headCellClass = 'deferforms-px-4 deferforms-py-3 deferforms-text-[14px] deferforms-font-bold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400';

const EmptyState = ( { hasFilters } ) => (
	<div className="deferforms-flex deferforms-flex-col deferforms-items-center deferforms-justify-center deferforms-py-24 deferforms-text-center">
		<div className="deferforms-mb-4 deferforms-flex deferforms-h-16 deferforms-w-16 deferforms-items-center deferforms-justify-center deferforms-rounded-2xl deferforms-bg-stone-50 deferforms-text-stone-400">
			<Inbox className="deferforms-h-8 deferforms-w-8" />
		</div>
		<h3 className="deferforms-m-0 deferforms-text-lg deferforms-font-bold deferforms-text-ink">
			{ hasFilters
				? __( 'No matching submissions', 'defer-forms-for-contact-form-7' )
				: __( 'No submissions yet', 'defer-forms-for-contact-form-7' ) }
		</h3>
		<p className="deferforms-mt-1 deferforms-max-w-xs deferforms-text-sm deferforms-text-stone-500">
			{ hasFilters
				? __( 'Try clearing your filters or a different search term.', 'defer-forms-for-contact-form-7' )
				: __( 'Entries will appear here as soon as a form is submitted.', 'defer-forms-for-contact-form-7' ) }
		</p>
	</div>
);

/**
 * The table, before the rows arrive.
 *
 * Cell for cell with the real row, and the last cell is the one that matters:
 * the row's height is set by the 28px delete button in it, not by any of the
 * text. A 16px bar there made every row 49px against the real 57 — eight pixels
 * each, and twenty rows of it moved the pager half a screen when the fetch
 * returned.
 */
const SkeletonRows = ( { perPage } ) => (
	<>
		{ Array.from( { length: Math.min( perPage, 8 ) } ).map( ( _, i ) => (
			<tr key={ i } className="deferforms-border-b deferforms-border-line last:deferforms-border-0">
				<td className="deferforms-px-4 deferforms-py-3.5"><div className="deferforms-h-4 deferforms-w-4 deferforms-animate-pulse deferforms-rounded deferforms-bg-stone-100" /></td>
				<td className="deferforms-px-4 deferforms-py-3.5"><Shimmer w="deferforms-w-10" text="deferforms-text-sm" /></td>
				<td className="deferforms-px-4 deferforms-py-3.5"><Shimmer w="deferforms-w-28" text="deferforms-text-sm" /></td>
				<td className="deferforms-px-4 deferforms-py-3.5"><Shimmer w="deferforms-w-full" text="deferforms-text-sm" /></td>
				{ /* The status pill: its own padding, so a plain bar is short. */ }
				<td className="deferforms-px-4 deferforms-py-3.5">
					<span className="deferforms-inline-block deferforms-animate-pulse deferforms-rounded-full deferforms-bg-stone-100 deferforms-px-2.5 deferforms-py-1 deferforms-text-sm deferforms-text-transparent">
						{ '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0' }
					</span>
				</td>
				<td className="deferforms-px-4 deferforms-py-3.5"><Shimmer w="deferforms-w-20" text="deferforms-text-[14px]" /></td>
				{ /* The delete button, and the reason a row is 57px rather than 49. */ }
				<td className="deferforms-px-4 deferforms-py-3.5"><div className="deferforms-h-7 deferforms-w-7 deferforms-animate-pulse deferforms-rounded-md deferforms-bg-stone-100" /></td>
			</tr>
		) ) }
	</>
);

/**
 * Answering the enquiry, from the enquiry.
 *
 * The address is not typed and cannot be changed: it is the one found in the
 * entry, shown here so there is no doubt where this is going, and found again
 * on the server when it sends. A box you can type any address into would be a
 * mail client, and a way to send mail from somebody's site to anywhere.
 *
 * A form that never asked for an address has nobody to answer, so there is no
 * box — with a line saying why, because a control that is missing on some
 * entries and not others is a question if it does not explain itself.
 */
const ReplyBox = ( { item, onSent } ) => {
	const [ open, setOpen ]       = useState( false );
	const [ subject, setSubject ] = useState( '' );
	const [ message, setMessage ] = useState( '' );
	const [ state, setState ]     = useState( null );

	if ( ! item.reply_to ) {
		return (
			<div className="deferforms-rounded-lg deferforms-border deferforms-border-line deferforms-bg-stone-50/60 deferforms-px-4 deferforms-py-3 deferforms-text-[15px] deferforms-text-stone-500">
				{ __( 'This form did not ask for an email address, so there is nobody to reply to.', 'defer-forms-for-contact-form-7' ) }
			</div>
		);
	}

	const send = () => {
		setState( { sending: true } );

		apiFetch( {
			path:   `deferforms/v1/submissions/${ item.id }/reply`,
			method: 'POST',
			data:   { subject, message },
		} )
			.then( () => {
				setState( { sent: true } );
				setSubject( '' );
				setMessage( '' );
				setOpen( false );
				onSent();
			} )
			.catch( ( err ) => setState( { error: err.message } ) );
	};

	/*
	 * Shut until you want it.
	 *
	 * Open, this was 268px of a 598px drawer — more room than the entry it is
	 * about, permanently, whether or not anybody was going to write anything.
	 * Reading comes first and replying is a decision made after it, so the
	 * decision gets one line until it is made.
	 */
	if ( ! open ) {
		return (
			<div className="deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-gap-3">
			<button type="button" onClick={ () => setOpen( true ) } className={ btnGhost }>
				<Reply className="deferforms-h-4 deferforms-w-4 deferforms-text-stone-400" />
				{ sprintf(
					/* translators: %s: the visitor's email address. */
					__( 'Reply to %s', 'defer-forms-for-contact-form-7' ),
					item.reply_to
				) }
			</button>
			{ state?.sent && (
				<span className="deferforms-text-sm deferforms-font-medium deferforms-text-emerald-700">{ __( 'Sent.', 'defer-forms-for-contact-form-7' ) }</span>
			) }
			</div>
		);
	}

	return (
		<div className="deferforms-flex deferforms-flex-col deferforms-gap-2">
			<label className="deferforms-text-[14px] deferforms-font-semibold deferforms-text-ink">
				{ sprintf(
					/* translators: %s: the visitor's email address. */
					__( 'Reply to %s', 'defer-forms-for-contact-form-7' ),
					item.reply_to
				) }
			</label>

			<input
				type="text"
				value={ subject }
				onChange={ ( event ) => setSubject( event.target.value ) }
				placeholder={ __( 'Subject', 'defer-forms-for-contact-form-7' ) }
				className={ `${ controlBase } deferforms-w-full deferforms-px-3 placeholder:deferforms-text-stone-400` }
			/>

			<textarea
				rows={ 4 }
				value={ message }
				onChange={ ( event ) => setMessage( event.target.value ) }
				placeholder={ __( 'Your reply…', 'defer-forms-for-contact-form-7' ) }
				className={ `deferforms-w-full deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-px-3 deferforms-py-2 deferforms-text-sm deferforms-leading-relaxed deferforms-text-ink deferforms-transition-colors placeholder:deferforms-text-stone-400 ${ focusRing }` }
			/>

			<div className="deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-gap-3">
				<button
					type="button"
					onClick={ send }
					disabled={ state?.sending || '' === subject.trim() || '' === message.trim() }
					className={ `${ btnGhost } disabled:deferforms-cursor-not-allowed disabled:deferforms-opacity-50` }
				>
					<Reply className="deferforms-h-4 deferforms-w-4 deferforms-text-stone-400" />
					{ state?.sending ? __( 'Sending…', 'defer-forms-for-contact-form-7' ) : __( 'Send reply', 'defer-forms-for-contact-form-7' ) }
				</button>

				{ state?.sent && (
					<span className="deferforms-text-sm deferforms-font-medium deferforms-text-emerald-700">{ __( 'Sent.', 'defer-forms-for-contact-form-7' ) }</span>
				) }
			</div>

			{ /* WordPress's own words when it could not send, which on most sites
			     means SMTP is not set up — and that is the thing to go and fix. */ }
			{ state?.error && (
				<div className="deferforms-rounded-lg deferforms-border deferforms-border-red-200 deferforms-bg-red-50 deferforms-px-3 deferforms-py-2 deferforms-text-sm deferforms-font-medium deferforms-text-red-700">
					{ state.error }
				</div>
			) }
		</div>
	);
};

const SubmissionDrawer = ( { item, onClose, onDelete, onStage, onReplied } ) => {
	useEffect( () => {
		if ( ! item ) {
			return;
		}
		const onKey = ( event ) => 'Escape' === event.key && onClose();
		window.addEventListener( 'keydown', onKey );
		return () => window.removeEventListener( 'keydown', onKey );
	}, [ item, onClose ] );

	return (
		<>
			{ item && (
				<>
					<Backdrop
						onClick={ onClose }
						className="deferforms-fixed deferforms-inset-0 deferforms-z-[99998] deferforms-bg-ink/30 deferforms-backdrop-blur-sm"
					/>
					<aside
						className="deferforms-fixed deferforms-right-0 deferforms-top-0 deferforms-z-[99999] deferforms-flex deferforms-h-full deferforms-w-full deferforms-max-w-[38rem] deferforms-flex-col deferforms-bg-white deferforms-shadow-drawer"
					>
						<header className="deferforms-flex deferforms-items-start deferforms-justify-between deferforms-gap-4 deferforms-border-b deferforms-border-line deferforms-bg-accent-50 deferforms-px-6 deferforms-py-5">
							<div className="deferforms-flex deferforms-min-w-0 deferforms-flex-col">
								<span className="deferforms-text-[14px] deferforms-font-bold deferforms-uppercase deferforms-tracking-wider deferforms-text-accent">
									{ __( 'Submission', 'defer-forms-for-contact-form-7' ) }
								</span>
								<span className="deferforms-text-2xl deferforms-font-bold deferforms-text-ink deferforms-tnum">#{ item.id }</span>

							</div>
							<button
								type="button"
								onClick={ onClose }
								aria-label={ __( 'Close', 'defer-forms-for-contact-form-7' ) }
								className="deferforms-flex deferforms-h-9 deferforms-w-9 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-rounded-lg deferforms-border-0 deferforms-bg-white/70 deferforms-text-stone-500 deferforms-transition-colors hover:deferforms-bg-white hover:deferforms-text-ink"
							>
								<X className="deferforms-h-4 deferforms-w-4" />
							</button>
						</header>

						<div className="deferforms-scroll deferforms-flex-1 deferforms-overflow-y-auto deferforms-px-3.5 deferforms-py-5" style={ { scrollbarGutter: 'stable both-edges' } }>
							<div className="deferforms-mb-6 deferforms-grid deferforms-grid-cols-2 deferforms-gap-4 deferforms-text-sm sm:deferforms-grid-cols-4">
								<div className="deferforms-flex deferforms-flex-col deferforms-gap-1.5">
									<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">{ __( 'Status', 'defer-forms-for-contact-form-7' ) }</span>
									<StatusPill status={ item.status } />
								</div>
								<div className="deferforms-flex deferforms-flex-col deferforms-gap-1.5">
									<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">{ __( 'Form ID', 'defer-forms-for-contact-form-7' ) }</span>
									<span className="deferforms-font-semibold deferforms-text-ink deferforms-tnum">{ item.form_id }</span>
								</div>
								<div className="deferforms-flex deferforms-flex-col deferforms-gap-1.5">
									<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">{ __( 'Date', 'defer-forms-for-contact-form-7' ) }</span>
									<span className="deferforms-text-[14px] deferforms-font-medium deferforms-text-ink">{ formatDate( item.created_at ) }</span>
								</div>
								{ item.ip && (
									<div className="deferforms-flex deferforms-flex-col deferforms-gap-1.5">
										<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">{ __( 'IP address', 'defer-forms-for-contact-form-7' ) }</span>
										<span className="deferforms-text-[14px] deferforms-font-medium deferforms-text-ink">{ item.ip }</span>
									</div>
								) }
							</div>

							<div className="deferforms-flex deferforms-flex-col deferforms-divide-y deferforms-divide-line deferforms-overflow-hidden deferforms-rounded-2xl deferforms-border deferforms-border-line">
								{ parseFields( item.data ).map( ( [ key, value ] ) => {
									const files = attachmentsFor( item.data, key );

									return (
										<div key={ key } className="deferforms-grid deferforms-gap-1 deferforms-px-4 deferforms-py-3.5 hover:deferforms-bg-stone-50/60 sm:deferforms-grid-cols-[minmax(0,9rem)_1fr] sm:deferforms-gap-4">
											<span className="deferforms-break-words deferforms-text-[14px] deferforms-font-bold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">{ key }</span>
											{ files ? (
												<div className="deferforms-flex deferforms-min-w-0 deferforms-flex-col deferforms-items-start deferforms-gap-1.5">
													{ files.map( ( file ) => (
														<a
															key={ file.file }
															href={ attachmentUrl( files.dir, file ) }
															className="deferforms-inline-flex deferforms-w-fit deferforms-max-w-full deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border deferforms-border-line deferforms-bg-white deferforms-px-2.5 deferforms-py-1.5 deferforms-text-sm deferforms-font-medium deferforms-text-ink deferforms-no-underline deferforms-transition-colors hover:deferforms-border-stroke hover:deferforms-bg-stone-50"
														>
															<Paperclip className="deferforms-h-3.5 deferforms-w-3.5 deferforms-shrink-0 deferforms-text-stone-400" />
															<span className="deferforms-min-w-0 deferforms-truncate">{ file.name }</span>
															<span className="deferforms-shrink-0 deferforms-text-[14px] deferforms-text-stone-400 deferforms-tnum">{ fileSize( file.size ) }</span>
															<Download className="deferforms-h-3.5 deferforms-w-3.5 deferforms-shrink-0 deferforms-text-stone-400" />
														</a>
													) ) }
												</div>
											) : (
												<span className="deferforms-whitespace-pre-wrap deferforms-break-words deferforms-text-sm deferforms-text-ink">
													{ Array.isArray( value ) ? value.join( ', ' ) : String( value ) }
												</span>
											) }
										</div>
									);
								} ) }
							</div>
						</div>

						{ /* Under the answers, above the actions: you read what they
						     wrote, then you write back. */ }
						<div className="deferforms-border-t deferforms-border-line deferforms-px-6 deferforms-py-5">
							<ReplyBox item={ item } onSent={ onReplied } />
						</div>

						{ /* Where you got to, and the one thing you cannot undo,
						     at opposite ends of the same row. */ }
						<footer className="deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-justify-between deferforms-gap-3 deferforms-border-t deferforms-border-line deferforms-px-6 deferforms-py-4">
							<div className="deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-gap-2">
								{ [ 'replied', 'done' ].map( ( stage ) => (
									<button
										key={ stage }
										type="button"
										onClick={ () => onStage( item.id, item.stage === stage ? 'new' : stage ) }
										aria-pressed={ item.stage === stage }
										className={ `deferforms-flex deferforms-cursor-pointer deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border deferforms-px-3 deferforms-py-2 deferforms-text-sm deferforms-font-semibold deferforms-transition-colors ${
											item.stage === stage
												? 'deferforms-border-ink deferforms-bg-ink deferforms-text-white'
												: 'deferforms-border-line deferforms-bg-white deferforms-text-stone-500 hover:deferforms-border-stroke hover:deferforms-bg-stone-50 hover:deferforms-text-ink'
										}` }
									>
										{ 'replied' === stage ? <Reply className="deferforms-h-4 deferforms-w-4" /> : <Check className="deferforms-h-4 deferforms-w-4" /> }
										{ 'replied' === stage ? __( 'Replied', 'defer-forms-for-contact-form-7' ) : __( 'Done', 'defer-forms-for-contact-form-7' ) }
									</button>
								) ) }
							</div>
							<button
								type="button"
								onClick={ () => onDelete( item.id ) }
								className="deferforms-flex deferforms-cursor-pointer deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border-0 deferforms-bg-red-50 deferforms-px-3 deferforms-py-2 deferforms-text-sm deferforms-font-semibold deferforms-text-red-700 deferforms-transition-colors hover:deferforms-bg-red-100"
							>
								<Trash2 className="deferforms-h-4 deferforms-w-4" />
								{ __( 'Delete submission', 'defer-forms-for-contact-form-7' ) }
							</button>
						</footer>
					</aside>
				</>
			) }
		</>
	);
};

// Build a compact page list with ellipsis: 1 … 4 5 6 … 20
const pageList = ( current, total ) => {
	const out   = [];
	const left  = Math.max( 2, current - 1 );
	const right = Math.min( total - 1, current + 1 );

	out.push( 1 );
	if ( left > 2 ) {
		out.push( 'gap-l' );
	}
	for ( let i = left; i <= right; i++ ) {
		out.push( i );
	}
	if ( right < total - 1 ) {
		out.push( 'gap-r' );
	}
	out.push( total );
	return out;
};

const Pagination = ( { page, totalPages, onChange } ) => {
	const navBtn =
		`deferforms-inline-flex deferforms-h-9 deferforms-w-9 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-text-ink deferforms-transition-colors hover:deferforms-bg-stone-50 active:deferforms-bg-stone-100 disabled:deferforms-cursor-not-allowed disabled:deferforms-opacity-40`;

	return (
		<div className="deferforms-flex deferforms-items-center deferforms-gap-1.5">
			<button
				type="button"
				disabled={ page <= 1 }
				onClick={ () => onChange( page - 1 ) }
				aria-label={ __( 'Previous page', 'defer-forms-for-contact-form-7' ) }
				className={ navBtn }
			>
				<ChevronLeft className="deferforms-h-4 deferforms-w-4" />
			</button>

			{ pageList( page, totalPages ).map( ( entry ) =>
				'number' === typeof entry ? (
					<button
						key={ entry }
						type="button"
						onClick={ () => onChange( entry ) }
						aria-current={ entry === page ? 'page' : undefined }
						className={ `deferforms-inline-flex deferforms-h-9 deferforms-min-w-[2.25rem] deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-rounded-lg deferforms-px-2 deferforms-text-sm deferforms-font-semibold deferforms-tnum deferforms-transition-colors ${
							entry === page
								? 'deferforms-border-0 deferforms-bg-ink deferforms-text-white'
								: 'deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-text-ink hover:deferforms-bg-stone-50'
						}` }
					>
						{ entry }
					</button>
				) : (
					<span key={ entry } className="deferforms-inline-flex deferforms-h-9 deferforms-w-6 deferforms-items-center deferforms-justify-center deferforms-text-sm deferforms-text-stone-400">
						…
					</span>
				)
			) }

			<button
				type="button"
				disabled={ page >= totalPages }
				onClick={ () => onChange( page + 1 ) }
				aria-label={ __( 'Next page', 'defer-forms-for-contact-form-7' ) }
				className={ navBtn }
			>
				<ChevronRight className="deferforms-h-4 deferforms-w-4" />
			</button>
		</div>
	);
};

// Branded confirmation modal. `data` holds the pending action; it is cached
// internally so the content stays visible through the exit animation.
const ConfirmDialog = ( { data, onCancel } ) => {
	const open = !! data;
	const [ cache, setCache ] = useState( data );

	useEffect( () => {
		if ( data ) {
			setCache( data );
		}
	}, [ data ] );

	useEffect( () => {
		if ( ! open ) {
			return;
		}
		const onKey = ( event ) => 'Escape' === event.key && onCancel();
		window.addEventListener( 'keydown', onKey );
		return () => window.removeEventListener( 'keydown', onKey );
	}, [ open, onCancel ] );

	const pending = cache || {};

	return (
		<>
			{ open && (
				<div className="deferforms-fixed deferforms-inset-0 deferforms-z-[100000] deferforms-flex deferforms-items-start deferforms-justify-center deferforms-px-4 deferforms-pb-4 deferforms-pt-[7vh]">
					<Backdrop
						onClick={ onCancel }
						className="deferforms-absolute deferforms-inset-0 deferforms-bg-ink/40 deferforms-backdrop-blur-sm"
					/>
					<div
						role="alertdialog"
						aria-modal="true"
						className="deferforms-relative deferforms-w-full deferforms-max-w-sm deferforms-overflow-hidden deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-pop"
					>
						<div className="deferforms-flex deferforms-gap-4 deferforms-p-5">
							<div className="deferforms-flex deferforms-h-11 deferforms-w-11 deferforms-shrink-0 deferforms-items-center deferforms-justify-center deferforms-rounded-full deferforms-bg-red-50 deferforms-text-red-600">
								<AlertTriangle className="deferforms-h-5 deferforms-w-5" />
							</div>
							<div className="deferforms-flex deferforms-flex-col deferforms-gap-1.5">
								<h3 className="deferforms-m-0 deferforms-text-base deferforms-font-bold deferforms-text-ink">{ pending.title }</h3>
								<p className="deferforms-m-0 deferforms-text-sm deferforms-leading-relaxed deferforms-text-stone-500">{ pending.message }</p>
							</div>
						</div>
						<div className="deferforms-flex deferforms-justify-end deferforms-gap-2 deferforms-border-t deferforms-border-line deferforms-bg-stone-50/50 deferforms-px-5 deferforms-py-3.5">
							<button
								type="button"
								onClick={ onCancel }
								className={ btnGhost }
							>
								{ __( 'Cancel', 'defer-forms-for-contact-form-7' ) }
							</button>
							<button
								type="button"
								onClick={ () => pending.onConfirm && pending.onConfirm() }
								className={ btnDanger }
							>
								<Trash2 className="deferforms-h-4 deferforms-w-4" />
								{ pending.confirmLabel }
							</button>
						</div>
					</div>
				</div>
			) }
		</>
	);
};

const App = () => {
	const [ query, setQuery ]             = useState( '' );
	const [ search, setSearch ]           = useState( '' );
	const [ status, setStatus ]           = useState( getInitialStatus );
	// The filter, not the value on a row — setStage() below moves one entry.
	const [ stageFilter, setStageFilter ] = useState( '' );
	const [ formId, setFormId ]           = useState( getInitialFormId );
	const [ date, setDate ]               = useState( 'all' );
	const [ sort, setSort ]               = useState( 'date_desc' );
	const [ perPage, setPerPage ]         = useState( 20 );
	const [ page, setPage ]               = useState( 1 );
	const [ items, setItems ]             = useState( [] );
	const [ total, setTotal ]             = useState( 0 );
	const [ loading, setLoading ]         = useState( true );
	const [ error, setError ]             = useState( null );
	const [ selected, setSelected ]       = useState( null );
	const [ wantedEntry, setWantedEntry ] = useState( getRequestedEntry );
	const [ selectedIds, setSelectedIds ] = useState( [] );
	const [ refreshKey, setRefreshKey ]   = useState( 0 );
	const [ stats, setStats ]             = useState( { total: 0, submitted: 0, today: 0, week: 0, spam: 0, unread: 0 } );
	const [ forms, setForms ]             = useState( [] );
	const [ confirm, setConfirm ]         = useState( null );

	const closeConfirm = () => setConfirm( null );

	// Debounce search input → committed search.
	useEffect( () => {
		const timer = setTimeout( () => {
			setSearch( query );
			setPage( 1 );
		}, 400 );
		return () => clearTimeout( timer );
	}, [ query ] );

	// Refetch list whenever any filter / page / sort / refresh changes.
	useEffect( () => {
		setLoading( true );
		const range  = dateRangeFor( date );
		const params = new URLSearchParams( {
			per_page:  perPage,
			page,
			search,
			status,
			stage: stageFilter,
			form_id:   formId,
			date_from: range.from,
			date_to:   range.to,
			sort,
		} );
		apiFetch( { path: `deferforms/v1/submissions?${ params }` } )
			.then( ( res ) => {
				setItems( res.items );
				setTotal( res.total );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message ) )
			.finally( () => setLoading( false ) );
	}, [ search, status, stageFilter, formId, date, sort, perPage, page, refreshKey ] );

	// Fetch stats + forms (only on filter-affecting changes).
	useEffect( () => {
		apiFetch( { path: 'deferforms/v1/stats' } ).then( setStats ).catch( () => {} );
		apiFetch( { path: 'deferforms/v1/forms/overview' } ).then( setForms ).catch( () => {} );
	}, [ refreshKey ] );

	const totalPages = Math.max( 1, Math.ceil( total / perPage ) );

	const refresh = () => {
		setSelectedIds( [] );
		setRefreshKey( ( key ) => key + 1 );
	};

	const toggleSelect = ( id ) =>
		setSelectedIds( ( prev ) =>
			prev.includes( id ) ? prev.filter( ( other ) => other !== id ) : [ ...prev, id ]
		);

	const pageIds     = items.map( ( item ) => item.id );
	const allSelected = pageIds.length > 0 && pageIds.every( ( id ) => selectedIds.includes( id ) );
	const toggleSelectAll = () => setSelectedIds( allSelected ? [] : pageIds );

	/**
	 * Opening an entry is what marks it read — the same promise an inbox makes.
	 *
	 * The row is updated here rather than by refetching the page: a refetch would
	 * reorder nothing but would flash the whole table, and the only thing that
	 * changed is one field on one row.
	 */
	const openItem = ( item ) => {
		setSelected( item );

		if ( item.read_at ) {
			return;
		}

		apiFetch( { path: 'deferforms/v1/submissions/mark-read', method: 'POST', data: { ids: [ item.id ] } } )
			.then( ( res ) => {
				setItems( ( curr ) => curr.map( ( row ) => ( row.id === item.id ? { ...row, read_at: 'read' } : row ) ) );
				setStats( ( curr ) => ( { ...curr, unread: res.unread } ) );
			} )
			.catch( () => {} );
	};

	/*
	 * Clicking a row is the only thing that writes to history. Arriving on a
	 * link, and going Back, are already at the address they should be, and
	 * pushing from there would trap the reader on this page.
	 */
	const openFromClick = ( item ) => {
		pushEntry( item.id );
		openItem( item );
	};

	const closeEntry = () => {
		setSelected( null );
		pushEntry( 0 );
	};

	/**
	 * Open the entry the address named, once the list it is in has arrived.
	 *
	 * Cleared whether or not it was found, so a link to something that has
	 * scrolled off the first page does not sit here reopening the drawer every
	 * time the list refreshes.
	 */
	useEffect( () => {
		if ( ! wantedEntry || ! items.length ) {
			return;
		}

		// Ids come back from the REST layer as strings.
		const wanted = items.find( ( row ) => Number( row.id ) === wantedEntry );

		setWantedEntry( 0 );

		if ( wanted ) {
			openItem( wanted );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ items, wantedEntry ] );

	/**
	 * Back and Forward move through the entries the reader opened.
	 *
	 * Without this the address would change and nothing else would: the buttons
	 * would rewrite the URL under a drawer that stayed exactly as it was, which
	 * is worse than not putting the entry in the address at all.
	 *
	 * It sets the wanted entry rather than opening one, so the effect above stays
	 * the single place that decides what a named entry does when the list has not
	 * arrived, or no longer holds it.
	 */
	useEffect( () => {
		const follow = () => {
			const id = getRequestedEntry();

			if ( id ) {
				setWantedEntry( id );
				return;
			}

			setSelected( null );
		};

		window.addEventListener( 'popstate', follow );
		return () => window.removeEventListener( 'popstate', follow );
	}, [] );

	/*
	 * Updated in place rather than by refetching: nothing about the list changes
	 * except one column on one row, and a refetch would reorder nothing while
	 * flashing the whole table.
	 *
	 * The open drawer is the same object, so it has to be moved too — otherwise
	 * the button you just pressed goes back to looking unpressed.
	 */
	const setStage = ( id, stage ) => {
		apiFetch( { path: 'deferforms/v1/submissions/stage', method: 'POST', data: { ids: [ id ], stage } } )
			.then( () => {
				const value = 'new' === stage ? '' : stage;

				setItems( ( curr ) => curr.map( ( row ) => ( row.id === id ? { ...row, stage: value } : row ) ) );
				setSelected( ( curr ) => ( curr && curr.id === id ? { ...curr, stage: value } : curr ) );
			} )
			.catch( ( err ) => setError( err.message ) );
	};

	/*
	 * The server moves the entry to 'replied' when a reply goes, so the screen
	 * follows rather than asking again — unless it was already 'done', which is
	 * further along and must not be walked back. The same rule, on both sides.
	 */
	const markReplied = () => {
		setSelected( ( curr ) => {
			if ( ! curr || 'done' === curr.stage ) {
				return curr;
			}

			setItems( ( rows ) => rows.map( ( row ) => ( row.id === curr.id ? { ...row, stage: 'replied' } : row ) ) );

			return { ...curr, stage: 'replied' };
		} );
	};

	const markAllRead = () => {
		apiFetch( { path: 'deferforms/v1/submissions/mark-read', method: 'POST', data: { all: true } } )
			.then( ( res ) => {
				setItems( ( curr ) => curr.map( ( row ) => ( row.read_at ? row : { ...row, read_at: 'read' } ) ) );
				setStats( ( curr ) => ( { ...curr, unread: res.unread } ) );
			} )
			.catch( ( err ) => setError( err.message ) );
	};

	const deleteOne = ( id ) => {
		setConfirm( {
			title:        __( 'Delete submission?', 'defer-forms-for-contact-form-7' ),
			message:      __( 'This permanently removes the submission. This action cannot be undone.', 'defer-forms-for-contact-form-7' ),
			confirmLabel: __( 'Delete', 'defer-forms-for-contact-form-7' ),
			onConfirm:    async () => {
				try {
					await apiFetch( { path: `deferforms/v1/submissions/${ id }`, method: 'DELETE' } );
					closeEntry();
					refresh();
				} catch ( err ) {
					setError( err.message );
				} finally {
					closeConfirm();
				}
			},
		} );
	};

	const deleteSelected = () => {
		const count = selectedIds.length;
		setConfirm( {
			title:   __( 'Delete selected submissions?', 'defer-forms-for-contact-form-7' ),
			message: sprintf(
				/* translators: %d: number of submissions. */
				_n(
					'This permanently removes %d submission. This action cannot be undone.',
					'This permanently removes %d submissions. This action cannot be undone.',
					count,
					'defer-forms-for-contact-form-7'
				),
				count
			),
			confirmLabel: __( 'Delete all', 'defer-forms-for-contact-form-7' ),
			onConfirm:    async () => {
				try {
					await apiFetch( {
						path:   'deferforms/v1/submissions/bulk-delete',
						method: 'POST',
						data:   { ids: selectedIds },
					} );
					refresh();
				} catch ( err ) {
					setError( err.message );
				} finally {
					closeConfirm();
				}
			},
		} );
	};

	const exportHref = useMemo(
		() => buildExportUrl( { search, status, formId, date } ),
		[ search, status, formId, date ]
	);

	const resetPage = ( fn ) => ( ...args ) => {
		setPage( 1 );
		fn( ...args );
	};

	const hasFilters = search !== '' || status !== '' || formId !== 0 || date !== 'all';

	return (
		<Page>
			<PageHeader
				title={ __( 'Submissions', 'defer-forms-for-contact-form-7' ) }
				subtitle={ __( 'Every entry your forms have captured.', 'defer-forms-for-contact-form-7' ) }
			/>
			<StatStrip stats={ stats } />

			<div className="deferforms-mb-4 deferforms-flex deferforms-flex-col deferforms-gap-3">
				<div className="deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-gap-3">
					<StatusTabs active={ status } onChange={ resetPage( setStatus ) } stats={ stats } />
					{ stats.unread > 0 && (
						<button type="button" onClick={ markAllRead } className={ btnGhost }>
							<CheckCheck className="deferforms-h-4 deferforms-w-4 deferforms-text-stone-400" />
							{ sprintf(
								/* translators: %s: number of unread submissions. */
								__( 'Mark %s read', 'defer-forms-for-contact-form-7' ),
								stats.unread.toLocaleString()
							) }
						</button>
					) }
				</div>
				<FilterBar
					search={ query }            onSearchChange={ setQuery }
					formId={ formId }           onFormChange={ resetPage( setFormId ) }
					stage={ stageFilter }       onStageChange={ resetPage( setStageFilter ) }
					date={ date }               onDateChange={ resetPage( setDate ) }
					perPage={ perPage }         onPerPageChange={ resetPage( setPerPage ) }
					exportHref={ exportHref }
					forms={ forms }
				/>
			</div>

			{ error && (
				<div className="deferforms-mb-4 deferforms-rounded-lg deferforms-border deferforms-border-red-200 deferforms-bg-red-50 deferforms-px-4 deferforms-py-3 deferforms-text-sm deferforms-font-medium deferforms-text-red-700">
					{ error }
				</div>
			) }

			<AnimatePresence>
				{ selectedIds.length > 0 && (
					<motion.div
						initial={ { opacity: 0, y: -8 } } animate={ { opacity: 1, y: 0 } } exit={ { opacity: 0, y: -8 } }
						className="deferforms-mb-4 deferforms-flex deferforms-items-center deferforms-justify-between deferforms-rounded-xl deferforms-border deferforms-border-accent-200 deferforms-bg-accent-50 deferforms-px-4 deferforms-py-2.5"
					>
						<span className="deferforms-text-sm deferforms-font-semibold deferforms-text-accent-700">
							{ sprintf(
								/* translators: %d: number of selected submissions. */
								__( '%d selected', 'defer-forms-for-contact-form-7' ),
								selectedIds.length
							) }
						</span>
						<button
							type="button"
							onClick={ deleteSelected }
							className="deferforms-flex deferforms-cursor-pointer deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border-0 deferforms-bg-red-600 deferforms-px-3 deferforms-py-1.5 deferforms-text-sm deferforms-font-semibold deferforms-text-white deferforms-transition-colors hover:deferforms-bg-red-700"
						>
							<Trash2 className="deferforms-h-4 deferforms-w-4" />
							{ __( 'Delete selected', 'defer-forms-for-contact-form-7' ) }
						</button>
					</motion.div>
				) }
			</AnimatePresence>

			<div className="deferforms-overflow-hidden deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white">
				<table className="deferforms-w-full deferforms-border-collapse deferforms-text-left">
					<thead>
						<tr className="deferforms-border-b deferforms-border-line deferforms-bg-stone-50/70">
							<th className="deferforms-w-10 deferforms-px-4 deferforms-py-3">
								<input
									type="checkbox"
									checked={ allSelected }
									onChange={ toggleSelectAll }
									className="deferforms-h-4 deferforms-w-4 deferforms-cursor-pointer deferforms-accent-accent"
								/>
							</th>
							<th className={ headCellClass }>
								<SortHeader label={ __( 'ID', 'defer-forms-for-contact-form-7' ) } sortKey="id" currentSort={ sort } onSort={ setSort } />
							</th>
							<th className={ headCellClass }>{ __( 'Form', 'defer-forms-for-contact-form-7' ) }</th>
							<th className={ headCellClass }>{ __( 'Preview', 'defer-forms-for-contact-form-7' ) }</th>
							<th className={ headCellClass }>{ __( 'Status', 'defer-forms-for-contact-form-7' ) }</th>
							<th className={ headCellClass }>
								<SortHeader label={ __( 'Date', 'defer-forms-for-contact-form-7' ) } sortKey="date" currentSort={ sort } onSort={ setSort } />
							</th>
							<th className="deferforms-w-10 deferforms-px-4 deferforms-py-3"></th>
						</tr>
					</thead>
					<tbody>
						{ loading && <SkeletonRows perPage={ perPage } /> }

						{ ! loading && items.length === 0 && (
							<tr>
								<td colSpan={ 7 }><EmptyState hasFilters={ hasFilters } /></td>
							</tr>
						) }

						{ ! loading && items.map( ( item ) => {
							const formTitle  = forms.find( ( form ) => form.form_id === item.form_id )?.title || `#${ item.form_id }`;
							const isSelected = selectedIds.includes( item.id );
							const unread     = ! item.read_at;

							return (
								<tr
									key={ item.id }
									onClick={ () => openFromClick( item ) }
									className={ `deferforms-group deferforms-cursor-pointer deferforms-border-b deferforms-border-line deferforms-transition-colors last:deferforms-border-0 ${
										// Three resting shades, so the ladder reads at a glance: a
										// ticked row is the strongest, an unread one carries a light
										// tint, and a row already read stays plain.
										//
										// Both tints are accent-50, one of them softened. A step
										// darker was tried and measured 4.36:1 for the muted preview
										// text sitting on it — under what small text needs.
										isSelected
											? 'deferforms-bg-accent-50'
											: unread
												? 'deferforms-bg-accent-50/60 hover:deferforms-bg-accent-50'
												: 'hover:deferforms-bg-stone-50/70'
									}` }
								>
									{ /* An unread row is marked three ways, because any one of them
									     alone is easy to miss: a rule down its left edge, a dot
									     beside the id, and its text at full strength while a read
									     row is muted. */ }
									<td className="deferforms-relative deferforms-px-4 deferforms-py-3.5" onClick={ ( event ) => event.stopPropagation() }>
										{ unread && <span className="deferforms-absolute deferforms-inset-y-0 deferforms-left-0 deferforms-w-[3px] deferforms-bg-accent" aria-hidden="true" /> }
										<input
											type="checkbox"
											checked={ isSelected }
											onChange={ () => toggleSelect( item.id ) }
											className="deferforms-h-4 deferforms-w-4 deferforms-cursor-pointer deferforms-accent-accent"
										/>
									</td>
									<td className={ `deferforms-px-4 deferforms-py-3.5 deferforms-text-sm deferforms-tnum ${ unread ? 'deferforms-font-bold deferforms-text-ink' : 'deferforms-font-semibold deferforms-text-stone-500' }` }>
										<span className="deferforms-inline-flex deferforms-items-center deferforms-gap-1.5">
											{ unread
												? <span className="deferforms-h-2 deferforms-w-2 deferforms-shrink-0 deferforms-rounded-full deferforms-bg-accent" aria-hidden="true" />
												: <span className="deferforms-h-2 deferforms-w-2 deferforms-shrink-0" aria-hidden="true" /> }
											#{ item.id }
											<span className="deferforms-sr-only">
												{ unread ? __( 'Unread', 'defer-forms-for-contact-form-7' ) : __( 'Read', 'defer-forms-for-contact-form-7' ) }
											</span>
										</span>
									</td>
									<td className={ `deferforms-px-4 deferforms-py-3.5 deferforms-text-sm ${ unread ? 'deferforms-font-semibold deferforms-text-ink' : 'deferforms-font-medium deferforms-text-stone-500' }` }>{ formTitle }</td>
									<td className={ `deferforms-max-w-md deferforms-truncate deferforms-px-4 deferforms-py-3.5 deferforms-text-sm ${ unread ? 'deferforms-text-stone-600' : 'deferforms-text-stone-400' }` }>{ fieldPreview( item.data ) }</td>
									<td className="deferforms-px-4 deferforms-py-3.5">
										<div className="deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-gap-1.5">
											<StatusPill status={ item.status } />
											<StagePill stage={ item.stage } />
										</div>
									</td>
									<td className="deferforms-whitespace-nowrap deferforms-px-4 deferforms-py-3.5 deferforms-text-[14px] deferforms-text-stone-500 deferforms-tnum">{ formatDate( item.created_at ) }</td>
									<td className="deferforms-px-4 deferforms-py-3.5" onClick={ ( event ) => event.stopPropagation() }>
										<button
											type="button"
											onClick={ () => deleteOne( item.id ) }
											aria-label={ __( 'Delete', 'defer-forms-for-contact-form-7' ) }
											className="deferforms-flex deferforms-h-7 deferforms-w-7 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-rounded-md deferforms-border-0 deferforms-bg-transparent deferforms-text-stone-400 deferforms-opacity-0 deferforms-transition hover:deferforms-bg-red-50 hover:deferforms-text-red-600 group-hover:deferforms-opacity-100"
										>
											<Trash2 className="deferforms-h-4 deferforms-w-4" />
										</button>
									</td>
								</tr>
							);
						} ) }
					</tbody>
				</table>
			</div>

			<SubmissionDrawer item={ selected } onClose={ closeEntry } onDelete={ deleteOne } onStage={ setStage } onReplied={ markReplied } />

			<ConfirmDialog data={ confirm } onCancel={ closeConfirm } />

			{ totalPages > 1 && (
				<div className="deferforms-mt-5 deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-justify-between deferforms-gap-3">
					<p className="deferforms-m-0 deferforms-text-sm deferforms-text-stone-500 deferforms-tnum">
						{ sprintf(
							/* translators: 1: total entries, 2: total pages. */
							__( '%1$s entries · %2$d pages', 'defer-forms-for-contact-form-7' ),
							total.toLocaleString(), totalPages
						) }
					</p>
					<Pagination page={ page } totalPages={ totalPages } onChange={ setPage } />
				</div>
			) }
		</Page>
	);
};

const mount = document.getElementById( 'deferforms-submissions-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
