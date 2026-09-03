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
	const cfg    = window.df7Submissions || {};
	const range  = dateRangeFor( filters.date );
	const params = new URLSearchParams( {
		action:    'df7_export_csv',
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
 * A copy is taken at submit time and listed under `_df7_files` — a key the
 * field list already skips, so it shows up here and nowhere else.
 */
const attachmentsFor = ( json, field ) => {
	try {
		const kept = JSON.parse( json )._df7_files;
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
	const cfg = window.df7Submissions || {};
	const params = new URLSearchParams( {
		action:   'df7_attachment',
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
	submitted: { dot: 'df7-bg-emerald-500', cls: 'df7-bg-emerald-50 df7-text-emerald-700', label: __( 'Submitted', 'defer-forms-for-contact-form-7' ) },
	spam:      { dot: 'df7-bg-red-500',     cls: 'df7-bg-red-50 df7-text-red-700',         label: __( 'Spam', 'defer-forms-for-contact-form-7' ) },
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
	replied: { cls: 'df7-bg-sky-50 df7-text-sky-700', label: __( 'Replied', 'defer-forms-for-contact-form-7' ) },
	done:    { cls: 'df7-bg-stone-100 df7-text-stone-600', label: __( 'Done', 'defer-forms-for-contact-form-7' ) },
};

const StagePill = ( { stage } ) => {
	const meta = STAGE_META[ stage ];

	if ( ! meta ) {
		return null;
	}

	return (
		<span className={ `df7-inline-flex df7-items-center df7-rounded-full df7-px-2.5 df7-py-1 df7-text-sm df7-font-semibold ${ meta.cls }` }>
			{ meta.label }
		</span>
	);
};

const StatusPill = ( { status } ) => {
	const meta = STATUS_META[ status ] || { dot: 'df7-bg-stone-400', cls: 'df7-bg-stone-100 df7-text-stone-600', label: status };
	return (
		<span className={ `df7-inline-flex df7-items-center df7-gap-1.5 df7-rounded-full df7-px-2.5 df7-py-1 df7-text-sm df7-font-semibold ${ meta.cls }` }>
			<span className={ `df7-h-1.5 df7-w-1.5 df7-rounded-full ${ meta.dot }` } />
			{ meta.label }
		</span>
	);
};

const StatChip = ( { icon: Icon, label, value, tone } ) => {
	const tones = {
		accent:  'df7-bg-accent-50 df7-text-accent',
		emerald: 'df7-bg-emerald-50 df7-text-emerald-600',
		amber:   'df7-bg-amber-50 df7-text-amber-600',
		red:     'df7-bg-red-50 df7-text-red-600',
	};
	return (
		<div className="df7-flex df7-items-center df7-gap-3 df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-px-4 df7-py-3">
			<div className={ `df7-flex df7-h-10 df7-w-10 df7-shrink-0 df7-items-center df7-justify-center df7-rounded-xl ${ tones[ tone ] }` }>
				<Icon className="df7-h-5 df7-w-5" />
			</div>
			<div className="df7-flex df7-flex-col df7-leading-none">
				<span className="df7-text-2xl df7-font-bold df7-tracking-tight df7-text-ink df7-tnum">
					{ value.toLocaleString() }
				</span>
				<span className="df7-mt-1.5 df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">
					{ label }
				</span>
			</div>
		</div>
	);
};

const StatStrip = ( { stats } ) => (
	<div className="df7-mb-5 df7-grid df7-grid-cols-2 df7-gap-3 sm:df7-grid-cols-4">
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
	`df7-h-9 df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-text-sm df7-text-ink df7-transition-colors ${ focusRing }`;

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
		<div className="df7-flex df7-flex-wrap df7-items-center df7-gap-2">
			<div className="df7-relative df7-min-w-[15rem] df7-flex-1">
				<Search className="df7-pointer-events-none df7-absolute df7-left-3 df7-top-1/2 df7-h-4 df7-w-4 -df7-translate-y-1/2 df7-text-stone-400" />
				<input
					type="search"
					value={ search }
					onChange={ ( event ) => onSearchChange( event.target.value ) }
					placeholder={ __( 'Search submissions…', 'defer-forms-for-contact-form-7' ) }
					className={ `${ controlBase } df7-w-full df7-pl-10 df7-pr-3 placeholder:df7-text-stone-400` }
				/>
			</div>

			<Select className="df7-w-44" icon={ FileText } value={ formId }  onChange={ onFormChange }    options={ formOptions } />
			<Select className="df7-w-44" icon={ CheckCheck } value={ stage } onChange={ onStageChange }  options={ stageOptions } />
			<Select className="df7-w-40" icon={ Filter }   value={ date }    onChange={ onDateChange }    options={ dateOptions } />
			<Select className="df7-w-32" value={ perPage } onChange={ onPerPageChange } options={ perPageOptions } align="right" />

			<a
				href={ exportHref }
				className="df7-inline-flex df7-h-9 df7-cursor-pointer df7-items-center df7-gap-2 df7-rounded-lg df7-border-0 df7-bg-ink df7-px-4 df7-text-sm df7-font-semibold df7-text-white df7-no-underline df7-transition-opacity hover:df7-opacity-90 active:df7-opacity-100"
			>
				<Download className="df7-h-4 df7-w-4 df7-text-white/70" />
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
			className="df7-flex df7-cursor-pointer df7-items-center df7-gap-1 df7-border-0 df7-bg-transparent df7-p-0 df7-text-[14px] df7-font-bold df7-uppercase df7-tracking-wider df7-text-stone-400 df7-transition-colors hover:df7-text-ink"
		>
			{ label }
			<Icon className={ `df7-h-3 df7-w-3 ${ isActive ? 'df7-text-accent' : 'df7-text-stone-400' }` } />
		</button>
	);
};

const headCellClass = 'df7-px-4 df7-py-3 df7-text-[14px] df7-font-bold df7-uppercase df7-tracking-wider df7-text-stone-400';

const EmptyState = ( { hasFilters } ) => (
	<div className="df7-flex df7-flex-col df7-items-center df7-justify-center df7-py-24 df7-text-center">
		<div className="df7-mb-4 df7-flex df7-h-16 df7-w-16 df7-items-center df7-justify-center df7-rounded-2xl df7-bg-stone-50 df7-text-stone-400">
			<Inbox className="df7-h-8 df7-w-8" />
		</div>
		<h3 className="df7-m-0 df7-text-lg df7-font-bold df7-text-ink">
			{ hasFilters
				? __( 'No matching submissions', 'defer-forms-for-contact-form-7' )
				: __( 'No submissions yet', 'defer-forms-for-contact-form-7' ) }
		</h3>
		<p className="df7-mt-1 df7-max-w-xs df7-text-sm df7-text-stone-500">
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
			<tr key={ i } className="df7-border-b df7-border-line last:df7-border-0">
				<td className="df7-px-4 df7-py-3.5"><div className="df7-h-4 df7-w-4 df7-animate-pulse df7-rounded df7-bg-stone-100" /></td>
				<td className="df7-px-4 df7-py-3.5"><Shimmer w="df7-w-10" text="df7-text-sm" /></td>
				<td className="df7-px-4 df7-py-3.5"><Shimmer w="df7-w-28" text="df7-text-sm" /></td>
				<td className="df7-px-4 df7-py-3.5"><Shimmer w="df7-w-full" text="df7-text-sm" /></td>
				{ /* The status pill: its own padding, so a plain bar is short. */ }
				<td className="df7-px-4 df7-py-3.5">
					<span className="df7-inline-block df7-animate-pulse df7-rounded-full df7-bg-stone-100 df7-px-2.5 df7-py-1 df7-text-sm df7-text-transparent">
						{ '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0' }
					</span>
				</td>
				<td className="df7-px-4 df7-py-3.5"><Shimmer w="df7-w-20" text="df7-text-[14px]" /></td>
				{ /* The delete button, and the reason a row is 57px rather than 49. */ }
				<td className="df7-px-4 df7-py-3.5"><div className="df7-h-7 df7-w-7 df7-animate-pulse df7-rounded-md df7-bg-stone-100" /></td>
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
			<div className="df7-rounded-lg df7-border df7-border-line df7-bg-stone-50/60 df7-px-4 df7-py-3 df7-text-[15px] df7-text-stone-500">
				{ __( 'This form did not ask for an email address, so there is nobody to reply to.', 'defer-forms-for-contact-form-7' ) }
			</div>
		);
	}

	const send = () => {
		setState( { sending: true } );

		apiFetch( {
			path:   `df7/v1/submissions/${ item.id }/reply`,
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
			<div className="df7-flex df7-flex-wrap df7-items-center df7-gap-3">
			<button type="button" onClick={ () => setOpen( true ) } className={ btnGhost }>
				<Reply className="df7-h-4 df7-w-4 df7-text-stone-400" />
				{ sprintf(
					/* translators: %s: the visitor's email address. */
					__( 'Reply to %s', 'defer-forms-for-contact-form-7' ),
					item.reply_to
				) }
			</button>
			{ state?.sent && (
				<span className="df7-text-sm df7-font-medium df7-text-emerald-700">{ __( 'Sent.', 'defer-forms-for-contact-form-7' ) }</span>
			) }
			</div>
		);
	}

	return (
		<div className="df7-flex df7-flex-col df7-gap-2">
			<label className="df7-text-[14px] df7-font-semibold df7-text-ink">
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
				className={ `${ controlBase } df7-w-full df7-px-3 placeholder:df7-text-stone-400` }
			/>

			<textarea
				rows={ 4 }
				value={ message }
				onChange={ ( event ) => setMessage( event.target.value ) }
				placeholder={ __( 'Your reply…', 'defer-forms-for-contact-form-7' ) }
				className={ `df7-w-full df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-px-3 df7-py-2 df7-text-sm df7-leading-relaxed df7-text-ink df7-transition-colors placeholder:df7-text-stone-400 ${ focusRing }` }
			/>

			<div className="df7-flex df7-flex-wrap df7-items-center df7-gap-3">
				<button
					type="button"
					onClick={ send }
					disabled={ state?.sending || '' === subject.trim() || '' === message.trim() }
					className={ `${ btnGhost } disabled:df7-cursor-not-allowed disabled:df7-opacity-50` }
				>
					<Reply className="df7-h-4 df7-w-4 df7-text-stone-400" />
					{ state?.sending ? __( 'Sending…', 'defer-forms-for-contact-form-7' ) : __( 'Send reply', 'defer-forms-for-contact-form-7' ) }
				</button>

				{ state?.sent && (
					<span className="df7-text-sm df7-font-medium df7-text-emerald-700">{ __( 'Sent.', 'defer-forms-for-contact-form-7' ) }</span>
				) }
			</div>

			{ /* WordPress's own words when it could not send, which on most sites
			     means SMTP is not set up — and that is the thing to go and fix. */ }
			{ state?.error && (
				<div className="df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-3 df7-py-2 df7-text-sm df7-font-medium df7-text-red-700">
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
						className="df7-fixed df7-inset-0 df7-z-[99998] df7-bg-ink/30 df7-backdrop-blur-sm"
					/>
					<aside
						className="df7-fixed df7-right-0 df7-top-0 df7-z-[99999] df7-flex df7-h-full df7-w-full df7-max-w-[38rem] df7-flex-col df7-bg-white df7-shadow-drawer"
					>
						<header className="df7-flex df7-items-start df7-justify-between df7-gap-4 df7-border-b df7-border-line df7-bg-accent-50 df7-px-6 df7-py-5">
							<div className="df7-flex df7-min-w-0 df7-flex-col">
								<span className="df7-text-[14px] df7-font-bold df7-uppercase df7-tracking-wider df7-text-accent">
									{ __( 'Submission', 'defer-forms-for-contact-form-7' ) }
								</span>
								<span className="df7-text-2xl df7-font-bold df7-text-ink df7-tnum">#{ item.id }</span>

							</div>
							<button
								type="button"
								onClick={ onClose }
								aria-label={ __( 'Close', 'defer-forms-for-contact-form-7' ) }
								className="df7-flex df7-h-9 df7-w-9 df7-cursor-pointer df7-items-center df7-justify-center df7-rounded-lg df7-border-0 df7-bg-white/70 df7-text-stone-500 df7-transition-colors hover:df7-bg-white hover:df7-text-ink"
							>
								<X className="df7-h-4 df7-w-4" />
							</button>
						</header>

						<div className="df7-scroll df7-flex-1 df7-overflow-y-auto df7-px-3.5 df7-py-5" style={ { scrollbarGutter: 'stable both-edges' } }>
							<div className="df7-mb-6 df7-grid df7-grid-cols-2 df7-gap-4 df7-text-sm sm:df7-grid-cols-4">
								<div className="df7-flex df7-flex-col df7-gap-1.5">
									<span className="df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">{ __( 'Status', 'defer-forms-for-contact-form-7' ) }</span>
									<StatusPill status={ item.status } />
								</div>
								<div className="df7-flex df7-flex-col df7-gap-1.5">
									<span className="df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">{ __( 'Form ID', 'defer-forms-for-contact-form-7' ) }</span>
									<span className="df7-font-semibold df7-text-ink df7-tnum">{ item.form_id }</span>
								</div>
								<div className="df7-flex df7-flex-col df7-gap-1.5">
									<span className="df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">{ __( 'Date', 'defer-forms-for-contact-form-7' ) }</span>
									<span className="df7-text-[14px] df7-font-medium df7-text-ink">{ formatDate( item.created_at ) }</span>
								</div>
								{ item.ip && (
									<div className="df7-flex df7-flex-col df7-gap-1.5">
										<span className="df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">{ __( 'IP address', 'defer-forms-for-contact-form-7' ) }</span>
										<span className="df7-text-[14px] df7-font-medium df7-text-ink">{ item.ip }</span>
									</div>
								) }
							</div>

							<div className="df7-flex df7-flex-col df7-divide-y df7-divide-line df7-overflow-hidden df7-rounded-2xl df7-border df7-border-line">
								{ parseFields( item.data ).map( ( [ key, value ] ) => {
									const files = attachmentsFor( item.data, key );

									return (
										<div key={ key } className="df7-grid df7-gap-1 df7-px-4 df7-py-3.5 hover:df7-bg-stone-50/60 sm:df7-grid-cols-[minmax(0,9rem)_1fr] sm:df7-gap-4">
											<span className="df7-break-words df7-text-[14px] df7-font-bold df7-uppercase df7-tracking-wider df7-text-stone-400">{ key }</span>
											{ files ? (
												<div className="df7-flex df7-min-w-0 df7-flex-col df7-items-start df7-gap-1.5">
													{ files.map( ( file ) => (
														<a
															key={ file.file }
															href={ attachmentUrl( files.dir, file ) }
															className="df7-inline-flex df7-w-fit df7-max-w-full df7-items-center df7-gap-2 df7-rounded-lg df7-border df7-border-line df7-bg-white df7-px-2.5 df7-py-1.5 df7-text-sm df7-font-medium df7-text-ink df7-no-underline df7-transition-colors hover:df7-border-stroke hover:df7-bg-stone-50"
														>
															<Paperclip className="df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-stone-400" />
															<span className="df7-min-w-0 df7-truncate">{ file.name }</span>
															<span className="df7-shrink-0 df7-text-[14px] df7-text-stone-400 df7-tnum">{ fileSize( file.size ) }</span>
															<Download className="df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-stone-400" />
														</a>
													) ) }
												</div>
											) : (
												<span className="df7-whitespace-pre-wrap df7-break-words df7-text-sm df7-text-ink">
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
						<div className="df7-border-t df7-border-line df7-px-6 df7-py-5">
							<ReplyBox item={ item } onSent={ onReplied } />
						</div>

						{ /* Where you got to, and the one thing you cannot undo,
						     at opposite ends of the same row. */ }
						<footer className="df7-flex df7-flex-wrap df7-items-center df7-justify-between df7-gap-3 df7-border-t df7-border-line df7-px-6 df7-py-4">
							<div className="df7-flex df7-flex-wrap df7-items-center df7-gap-2">
								{ [ 'replied', 'done' ].map( ( stage ) => (
									<button
										key={ stage }
										type="button"
										onClick={ () => onStage( item.id, item.stage === stage ? 'new' : stage ) }
										aria-pressed={ item.stage === stage }
										className={ `df7-flex df7-cursor-pointer df7-items-center df7-gap-2 df7-rounded-lg df7-border df7-px-3 df7-py-2 df7-text-sm df7-font-semibold df7-transition-colors ${
											item.stage === stage
												? 'df7-border-ink df7-bg-ink df7-text-white'
												: 'df7-border-line df7-bg-white df7-text-stone-500 hover:df7-border-stroke hover:df7-bg-stone-50 hover:df7-text-ink'
										}` }
									>
										{ 'replied' === stage ? <Reply className="df7-h-4 df7-w-4" /> : <Check className="df7-h-4 df7-w-4" /> }
										{ 'replied' === stage ? __( 'Replied', 'defer-forms-for-contact-form-7' ) : __( 'Done', 'defer-forms-for-contact-form-7' ) }
									</button>
								) ) }
							</div>
							<button
								type="button"
								onClick={ () => onDelete( item.id ) }
								className="df7-flex df7-cursor-pointer df7-items-center df7-gap-2 df7-rounded-lg df7-border-0 df7-bg-red-50 df7-px-3 df7-py-2 df7-text-sm df7-font-semibold df7-text-red-700 df7-transition-colors hover:df7-bg-red-100"
							>
								<Trash2 className="df7-h-4 df7-w-4" />
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
		`df7-inline-flex df7-h-9 df7-w-9 df7-cursor-pointer df7-items-center df7-justify-center df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-text-ink df7-transition-colors hover:df7-bg-stone-50 active:df7-bg-stone-100 disabled:df7-cursor-not-allowed disabled:df7-opacity-40`;

	return (
		<div className="df7-flex df7-items-center df7-gap-1.5">
			<button
				type="button"
				disabled={ page <= 1 }
				onClick={ () => onChange( page - 1 ) }
				aria-label={ __( 'Previous page', 'defer-forms-for-contact-form-7' ) }
				className={ navBtn }
			>
				<ChevronLeft className="df7-h-4 df7-w-4" />
			</button>

			{ pageList( page, totalPages ).map( ( entry ) =>
				'number' === typeof entry ? (
					<button
						key={ entry }
						type="button"
						onClick={ () => onChange( entry ) }
						aria-current={ entry === page ? 'page' : undefined }
						className={ `df7-inline-flex df7-h-9 df7-min-w-[2.25rem] df7-cursor-pointer df7-items-center df7-justify-center df7-rounded-lg df7-px-2 df7-text-sm df7-font-semibold df7-tnum df7-transition-colors ${
							entry === page
								? 'df7-border-0 df7-bg-ink df7-text-white'
								: 'df7-border df7-border-stroke df7-bg-white df7-text-ink hover:df7-bg-stone-50'
						}` }
					>
						{ entry }
					</button>
				) : (
					<span key={ entry } className="df7-inline-flex df7-h-9 df7-w-6 df7-items-center df7-justify-center df7-text-sm df7-text-stone-400">
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
				<ChevronRight className="df7-h-4 df7-w-4" />
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
				<div className="df7-fixed df7-inset-0 df7-z-[100000] df7-flex df7-items-start df7-justify-center df7-px-4 df7-pb-4 df7-pt-[7vh]">
					<Backdrop
						onClick={ onCancel }
						className="df7-absolute df7-inset-0 df7-bg-ink/40 df7-backdrop-blur-sm"
					/>
					<div
						role="alertdialog"
						aria-modal="true"
						className="df7-relative df7-w-full df7-max-w-sm df7-overflow-hidden df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-shadow-pop"
					>
						<div className="df7-flex df7-gap-4 df7-p-5">
							<div className="df7-flex df7-h-11 df7-w-11 df7-shrink-0 df7-items-center df7-justify-center df7-rounded-full df7-bg-red-50 df7-text-red-600">
								<AlertTriangle className="df7-h-5 df7-w-5" />
							</div>
							<div className="df7-flex df7-flex-col df7-gap-1.5">
								<h3 className="df7-m-0 df7-text-base df7-font-bold df7-text-ink">{ pending.title }</h3>
								<p className="df7-m-0 df7-text-sm df7-leading-relaxed df7-text-stone-500">{ pending.message }</p>
							</div>
						</div>
						<div className="df7-flex df7-justify-end df7-gap-2 df7-border-t df7-border-line df7-bg-stone-50/50 df7-px-5 df7-py-3.5">
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
								<Trash2 className="df7-h-4 df7-w-4" />
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
		apiFetch( { path: `df7/v1/submissions?${ params }` } )
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
		apiFetch( { path: 'df7/v1/stats' } ).then( setStats ).catch( () => {} );
		apiFetch( { path: 'df7/v1/forms/overview' } ).then( setForms ).catch( () => {} );
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

		apiFetch( { path: 'df7/v1/submissions/mark-read', method: 'POST', data: { ids: [ item.id ] } } )
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
		apiFetch( { path: 'df7/v1/submissions/stage', method: 'POST', data: { ids: [ id ], stage } } )
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
		apiFetch( { path: 'df7/v1/submissions/mark-read', method: 'POST', data: { all: true } } )
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
					await apiFetch( { path: `df7/v1/submissions/${ id }`, method: 'DELETE' } );
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
						path:   'df7/v1/submissions/bulk-delete',
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

			<div className="df7-mb-4 df7-flex df7-flex-col df7-gap-3">
				<div className="df7-flex df7-flex-wrap df7-items-center df7-gap-3">
					<StatusTabs active={ status } onChange={ resetPage( setStatus ) } stats={ stats } />
					{ stats.unread > 0 && (
						<button type="button" onClick={ markAllRead } className={ btnGhost }>
							<CheckCheck className="df7-h-4 df7-w-4 df7-text-stone-400" />
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
				<div className="df7-mb-4 df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-4 df7-py-3 df7-text-sm df7-font-medium df7-text-red-700">
					{ error }
				</div>
			) }

			<AnimatePresence>
				{ selectedIds.length > 0 && (
					<motion.div
						initial={ { opacity: 0, y: -8 } } animate={ { opacity: 1, y: 0 } } exit={ { opacity: 0, y: -8 } }
						className="df7-mb-4 df7-flex df7-items-center df7-justify-between df7-rounded-xl df7-border df7-border-accent-200 df7-bg-accent-50 df7-px-4 df7-py-2.5"
					>
						<span className="df7-text-sm df7-font-semibold df7-text-accent-700">
							{ sprintf(
								/* translators: %d: number of selected submissions. */
								__( '%d selected', 'defer-forms-for-contact-form-7' ),
								selectedIds.length
							) }
						</span>
						<button
							type="button"
							onClick={ deleteSelected }
							className="df7-flex df7-cursor-pointer df7-items-center df7-gap-2 df7-rounded-lg df7-border-0 df7-bg-red-600 df7-px-3 df7-py-1.5 df7-text-sm df7-font-semibold df7-text-white df7-transition-colors hover:df7-bg-red-700"
						>
							<Trash2 className="df7-h-4 df7-w-4" />
							{ __( 'Delete selected', 'defer-forms-for-contact-form-7' ) }
						</button>
					</motion.div>
				) }
			</AnimatePresence>

			<div className="df7-overflow-hidden df7-rounded-2xl df7-border df7-border-line df7-bg-white">
				<table className="df7-w-full df7-border-collapse df7-text-left">
					<thead>
						<tr className="df7-border-b df7-border-line df7-bg-stone-50/70">
							<th className="df7-w-10 df7-px-4 df7-py-3">
								<input
									type="checkbox"
									checked={ allSelected }
									onChange={ toggleSelectAll }
									className="df7-h-4 df7-w-4 df7-cursor-pointer df7-accent-accent"
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
							<th className="df7-w-10 df7-px-4 df7-py-3"></th>
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
									className={ `df7-group df7-cursor-pointer df7-border-b df7-border-line df7-transition-colors last:df7-border-0 ${
										// Three resting shades, so the ladder reads at a glance: a
										// ticked row is the strongest, an unread one carries a light
										// tint, and a row already read stays plain.
										//
										// Both tints are accent-50, one of them softened. A step
										// darker was tried and measured 4.36:1 for the muted preview
										// text sitting on it — under what small text needs.
										isSelected
											? 'df7-bg-accent-50'
											: unread
												? 'df7-bg-accent-50/60 hover:df7-bg-accent-50'
												: 'hover:df7-bg-stone-50/70'
									}` }
								>
									{ /* An unread row is marked three ways, because any one of them
									     alone is easy to miss: a rule down its left edge, a dot
									     beside the id, and its text at full strength while a read
									     row is muted. */ }
									<td className="df7-relative df7-px-4 df7-py-3.5" onClick={ ( event ) => event.stopPropagation() }>
										{ unread && <span className="df7-absolute df7-inset-y-0 df7-left-0 df7-w-[3px] df7-bg-accent" aria-hidden="true" /> }
										<input
											type="checkbox"
											checked={ isSelected }
											onChange={ () => toggleSelect( item.id ) }
											className="df7-h-4 df7-w-4 df7-cursor-pointer df7-accent-accent"
										/>
									</td>
									<td className={ `df7-px-4 df7-py-3.5 df7-text-sm df7-tnum ${ unread ? 'df7-font-bold df7-text-ink' : 'df7-font-semibold df7-text-stone-500' }` }>
										<span className="df7-inline-flex df7-items-center df7-gap-1.5">
											{ unread
												? <span className="df7-h-2 df7-w-2 df7-shrink-0 df7-rounded-full df7-bg-accent" aria-hidden="true" />
												: <span className="df7-h-2 df7-w-2 df7-shrink-0" aria-hidden="true" /> }
											#{ item.id }
											<span className="df7-sr-only">
												{ unread ? __( 'Unread', 'defer-forms-for-contact-form-7' ) : __( 'Read', 'defer-forms-for-contact-form-7' ) }
											</span>
										</span>
									</td>
									<td className={ `df7-px-4 df7-py-3.5 df7-text-sm ${ unread ? 'df7-font-semibold df7-text-ink' : 'df7-font-medium df7-text-stone-500' }` }>{ formTitle }</td>
									<td className={ `df7-max-w-md df7-truncate df7-px-4 df7-py-3.5 df7-text-sm ${ unread ? 'df7-text-stone-600' : 'df7-text-stone-400' }` }>{ fieldPreview( item.data ) }</td>
									<td className="df7-px-4 df7-py-3.5">
										<div className="df7-flex df7-flex-wrap df7-items-center df7-gap-1.5">
											<StatusPill status={ item.status } />
											<StagePill stage={ item.stage } />
										</div>
									</td>
									<td className="df7-whitespace-nowrap df7-px-4 df7-py-3.5 df7-text-[14px] df7-text-stone-500 df7-tnum">{ formatDate( item.created_at ) }</td>
									<td className="df7-px-4 df7-py-3.5" onClick={ ( event ) => event.stopPropagation() }>
										<button
											type="button"
											onClick={ () => deleteOne( item.id ) }
											aria-label={ __( 'Delete', 'defer-forms-for-contact-form-7' ) }
											className="df7-flex df7-h-7 df7-w-7 df7-cursor-pointer df7-items-center df7-justify-center df7-rounded-md df7-border-0 df7-bg-transparent df7-text-stone-400 df7-opacity-0 df7-transition hover:df7-bg-red-50 hover:df7-text-red-600 group-hover:df7-opacity-100"
										>
											<Trash2 className="df7-h-4 df7-w-4" />
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
				<div className="df7-mt-5 df7-flex df7-flex-wrap df7-items-center df7-justify-between df7-gap-3">
					<p className="df7-m-0 df7-text-sm df7-text-stone-500 df7-tnum">
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

const mount = document.getElementById( 'df7-submissions-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
