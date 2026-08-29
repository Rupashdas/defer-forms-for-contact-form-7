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
	{ id: 'all',   label: __( 'All time', 'essentials-for-contact-form-7' ),    days: null },
	{ id: 'today', label: __( 'Today', 'essentials-for-contact-form-7' ),       days: 0 },
	{ id: '7d',    label: __( 'Last 7 days', 'essentials-for-contact-form-7' ), days: 7 },
	{ id: '30d',   label: __( 'Last 30 days', 'essentials-for-contact-form-7' ),days: 30 },
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
	const cfg    = window.cf7eSubmissions || {};
	const range  = dateRangeFor( filters.date );
	const params = new URLSearchParams( {
		action:    'cf7e_export_csv',
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
 * A copy is taken at submit time and listed under `_cf7e_files` — a key the
 * field list already skips, so it shows up here and nowhere else.
 */
const attachmentsFor = ( json, field ) => {
	try {
		const kept = JSON.parse( json )._cf7e_files;
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
	const cfg = window.cf7eSubmissions || {};
	const params = new URLSearchParams( {
		action:   'cf7e_attachment',
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
		return sprintf( /* translators: %d: size in bytes. */ __( '%d B', 'essentials-for-contact-form-7' ), size );
	}
	if ( size < 1024 * 1024 ) {
		return sprintf( /* translators: %s: size in kilobytes. */ __( '%s KB', 'essentials-for-contact-form-7' ), ( size / 1024 ).toFixed( 0 ) );
	}
	return sprintf( /* translators: %s: size in megabytes. */ __( '%s MB', 'essentials-for-contact-form-7' ), ( size / 1024 / 1024 ).toFixed( 1 ) );
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
	submitted: { dot: 'cf7e-bg-emerald-500', cls: 'cf7e-bg-emerald-50 cf7e-text-emerald-700', label: __( 'Submitted', 'essentials-for-contact-form-7' ) },
	spam:      { dot: 'cf7e-bg-red-500',     cls: 'cf7e-bg-red-50 cf7e-text-red-700',         label: __( 'Spam', 'essentials-for-contact-form-7' ) },
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
	replied: { cls: 'cf7e-bg-sky-50 cf7e-text-sky-700', label: __( 'Replied', 'essentials-for-contact-form-7' ) },
	done:    { cls: 'cf7e-bg-stone-100 cf7e-text-stone-600', label: __( 'Done', 'essentials-for-contact-form-7' ) },
};

const StagePill = ( { stage } ) => {
	const meta = STAGE_META[ stage ];

	if ( ! meta ) {
		return null;
	}

	return (
		<span className={ `cf7e-inline-flex cf7e-items-center cf7e-rounded-full cf7e-px-2.5 cf7e-py-1 cf7e-text-sm cf7e-font-semibold ${ meta.cls }` }>
			{ meta.label }
		</span>
	);
};

const StatusPill = ( { status } ) => {
	const meta = STATUS_META[ status ] || { dot: 'cf7e-bg-stone-400', cls: 'cf7e-bg-stone-100 cf7e-text-stone-600', label: status };
	return (
		<span className={ `cf7e-inline-flex cf7e-items-center cf7e-gap-1.5 cf7e-rounded-full cf7e-px-2.5 cf7e-py-1 cf7e-text-sm cf7e-font-semibold ${ meta.cls }` }>
			<span className={ `cf7e-h-1.5 cf7e-w-1.5 cf7e-rounded-full ${ meta.dot }` } />
			{ meta.label }
		</span>
	);
};

const StatChip = ( { icon: Icon, label, value, tone } ) => {
	const tones = {
		accent:  'cf7e-bg-accent-50 cf7e-text-accent',
		emerald: 'cf7e-bg-emerald-50 cf7e-text-emerald-600',
		amber:   'cf7e-bg-amber-50 cf7e-text-amber-600',
		red:     'cf7e-bg-red-50 cf7e-text-red-600',
	};
	return (
		<div className="cf7e-flex cf7e-items-center cf7e-gap-3 cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-px-4 cf7e-py-3">
			<div className={ `cf7e-flex cf7e-h-10 cf7e-w-10 cf7e-shrink-0 cf7e-items-center cf7e-justify-center cf7e-rounded-xl ${ tones[ tone ] }` }>
				<Icon className="cf7e-h-5 cf7e-w-5" />
			</div>
			<div className="cf7e-flex cf7e-flex-col cf7e-leading-none">
				<span className="cf7e-text-2xl cf7e-font-bold cf7e-tracking-tight cf7e-text-ink cf7e-tnum">
					{ value.toLocaleString() }
				</span>
				<span className="cf7e-mt-1.5 cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">
					{ label }
				</span>
			</div>
		</div>
	);
};

const StatStrip = ( { stats } ) => (
	<div className="cf7e-mb-5 cf7e-grid cf7e-grid-cols-2 cf7e-gap-3 sm:cf7e-grid-cols-4">
		<StatChip icon={ Inbox }        label={ __( 'Total', 'essentials-for-contact-form-7' ) }     value={ stats.total } tone="accent" />
		<StatChip icon={ CalendarDays } label={ __( 'Today', 'essentials-for-contact-form-7' ) }     value={ stats.today } tone="emerald" />
		<StatChip icon={ CalendarDays } label={ __( 'This week', 'essentials-for-contact-form-7' ) } value={ stats.week }  tone="amber" />
		<StatChip icon={ ShieldAlert }  label={ __( 'Spam', 'essentials-for-contact-form-7' ) }      value={ stats.spam }  tone="red" />
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
			{ id: '',          label: __( 'All', 'essentials-for-contact-form-7' ),       count: stats.total.toLocaleString() },
			{ id: 'submitted', label: __( 'Submitted', 'essentials-for-contact-form-7' ), count: stats.submitted.toLocaleString() },
			{ id: 'spam',      label: __( 'Spam', 'essentials-for-contact-form-7' ),      count: stats.spam.toLocaleString() },
		] }
	/>
);

// The shared `control` token with the padding left off: the search box makes
// room for its icon with `pl-10`, and a `px-3` alongside it would win or lose
// on stylesheet order rather than on intent.
const controlBase =
	`cf7e-h-9 cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-text-sm cf7e-text-ink cf7e-transition-colors ${ focusRing }`;

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
		{ value: 0, label: __( 'All forms', 'essentials-for-contact-form-7' ) },
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
		{ value: '', label: __( 'Any progress', 'essentials-for-contact-form-7' ) },
		{ value: 'new', label: __( 'Not handled yet', 'essentials-for-contact-form-7' ) },
		{ value: 'replied', label: __( 'Replied', 'essentials-for-contact-form-7' ) },
		{ value: 'done', label: __( 'Done', 'essentials-for-contact-form-7' ) },
	];
	const perPageOptions = PER_PAGE_OPTIONS.map( ( size ) => ( {
		value: size,
		label: sprintf( /* translators: %d: rows per page. */ __( '%d / page', 'essentials-for-contact-form-7' ), size ),
	} ) );

	return (
		<div className="cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-gap-2">
			<div className="cf7e-relative cf7e-min-w-[15rem] cf7e-flex-1">
				<Search className="cf7e-pointer-events-none cf7e-absolute cf7e-left-3 cf7e-top-1/2 cf7e-h-4 cf7e-w-4 -cf7e-translate-y-1/2 cf7e-text-stone-400" />
				<input
					type="search"
					value={ search }
					onChange={ ( event ) => onSearchChange( event.target.value ) }
					placeholder={ __( 'Search submissions…', 'essentials-for-contact-form-7' ) }
					className={ `${ controlBase } cf7e-w-full cf7e-pl-10 cf7e-pr-3 placeholder:cf7e-text-stone-400` }
				/>
			</div>

			<Select className="cf7e-w-44" icon={ FileText } value={ formId }  onChange={ onFormChange }    options={ formOptions } />
			<Select className="cf7e-w-44" icon={ CheckCheck } value={ stage } onChange={ onStageChange }  options={ stageOptions } />
			<Select className="cf7e-w-40" icon={ Filter }   value={ date }    onChange={ onDateChange }    options={ dateOptions } />
			<Select className="cf7e-w-32" value={ perPage } onChange={ onPerPageChange } options={ perPageOptions } align="right" />

			<a
				href={ exportHref }
				className="cf7e-inline-flex cf7e-h-9 cf7e-cursor-pointer cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border-0 cf7e-bg-ink cf7e-px-4 cf7e-text-sm cf7e-font-semibold cf7e-text-white cf7e-no-underline cf7e-transition-opacity hover:cf7e-opacity-90 active:cf7e-opacity-100"
			>
				<Download className="cf7e-h-4 cf7e-w-4 cf7e-text-white/70" />
				{ __( 'Export CSV', 'essentials-for-contact-form-7' ) }
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
			className="cf7e-flex cf7e-cursor-pointer cf7e-items-center cf7e-gap-1 cf7e-border-0 cf7e-bg-transparent cf7e-p-0 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400 cf7e-transition-colors hover:cf7e-text-ink"
		>
			{ label }
			<Icon className={ `cf7e-h-3 cf7e-w-3 ${ isActive ? 'cf7e-text-accent' : 'cf7e-text-stone-400' }` } />
		</button>
	);
};

const headCellClass = 'cf7e-px-4 cf7e-py-3 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400';

const EmptyState = ( { hasFilters } ) => (
	<div className="cf7e-flex cf7e-flex-col cf7e-items-center cf7e-justify-center cf7e-py-24 cf7e-text-center">
		<div className="cf7e-mb-4 cf7e-flex cf7e-h-16 cf7e-w-16 cf7e-items-center cf7e-justify-center cf7e-rounded-2xl cf7e-bg-stone-50 cf7e-text-stone-400">
			<Inbox className="cf7e-h-8 cf7e-w-8" />
		</div>
		<h3 className="cf7e-m-0 cf7e-text-lg cf7e-font-bold cf7e-text-ink">
			{ hasFilters
				? __( 'No matching submissions', 'essentials-for-contact-form-7' )
				: __( 'No submissions yet', 'essentials-for-contact-form-7' ) }
		</h3>
		<p className="cf7e-mt-1 cf7e-max-w-xs cf7e-text-sm cf7e-text-stone-500">
			{ hasFilters
				? __( 'Try clearing your filters or a different search term.', 'essentials-for-contact-form-7' )
				: __( 'Entries will appear here as soon as a form is submitted.', 'essentials-for-contact-form-7' ) }
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
			<tr key={ i } className="cf7e-border-b cf7e-border-line last:cf7e-border-0">
				<td className="cf7e-px-4 cf7e-py-3.5"><div className="cf7e-h-4 cf7e-w-4 cf7e-animate-pulse cf7e-rounded cf7e-bg-stone-100" /></td>
				<td className="cf7e-px-4 cf7e-py-3.5"><Shimmer w="cf7e-w-10" text="cf7e-text-sm" /></td>
				<td className="cf7e-px-4 cf7e-py-3.5"><Shimmer w="cf7e-w-28" text="cf7e-text-sm" /></td>
				<td className="cf7e-px-4 cf7e-py-3.5"><Shimmer w="cf7e-w-full" text="cf7e-text-sm" /></td>
				{ /* The status pill: its own padding, so a plain bar is short. */ }
				<td className="cf7e-px-4 cf7e-py-3.5">
					<span className="cf7e-inline-block cf7e-animate-pulse cf7e-rounded-full cf7e-bg-stone-100 cf7e-px-2.5 cf7e-py-1 cf7e-text-sm cf7e-text-transparent">
						{ '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0' }
					</span>
				</td>
				<td className="cf7e-px-4 cf7e-py-3.5"><Shimmer w="cf7e-w-20" text="cf7e-text-[14px]" /></td>
				{ /* The delete button, and the reason a row is 57px rather than 49. */ }
				<td className="cf7e-px-4 cf7e-py-3.5"><div className="cf7e-h-7 cf7e-w-7 cf7e-animate-pulse cf7e-rounded-md cf7e-bg-stone-100" /></td>
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
			<div className="cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-4 cf7e-py-3 cf7e-text-[15px] cf7e-text-stone-500">
				{ __( 'This form did not ask for an email address, so there is nobody to reply to.', 'essentials-for-contact-form-7' ) }
			</div>
		);
	}

	const send = () => {
		setState( { sending: true } );

		apiFetch( {
			path:   `cf7e/v1/submissions/${ item.id }/reply`,
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
			<div className="cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-gap-3">
			<button type="button" onClick={ () => setOpen( true ) } className={ btnGhost }>
				<Reply className="cf7e-h-4 cf7e-w-4 cf7e-text-stone-400" />
				{ sprintf(
					/* translators: %s: the visitor's email address. */
					__( 'Reply to %s', 'essentials-for-contact-form-7' ),
					item.reply_to
				) }
			</button>
			{ state?.sent && (
				<span className="cf7e-text-sm cf7e-font-medium cf7e-text-emerald-700">{ __( 'Sent.', 'essentials-for-contact-form-7' ) }</span>
			) }
			</div>
		);
	}

	return (
		<div className="cf7e-flex cf7e-flex-col cf7e-gap-2">
			<label className="cf7e-text-[14px] cf7e-font-semibold cf7e-text-ink">
				{ sprintf(
					/* translators: %s: the visitor's email address. */
					__( 'Reply to %s', 'essentials-for-contact-form-7' ),
					item.reply_to
				) }
			</label>

			<input
				type="text"
				value={ subject }
				onChange={ ( event ) => setSubject( event.target.value ) }
				placeholder={ __( 'Subject', 'essentials-for-contact-form-7' ) }
				className={ `${ controlBase } cf7e-w-full cf7e-px-3 placeholder:cf7e-text-stone-400` }
			/>

			<textarea
				rows={ 4 }
				value={ message }
				onChange={ ( event ) => setMessage( event.target.value ) }
				placeholder={ __( 'Your reply…', 'essentials-for-contact-form-7' ) }
				className={ `cf7e-w-full cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-px-3 cf7e-py-2 cf7e-text-sm cf7e-leading-relaxed cf7e-text-ink cf7e-transition-colors placeholder:cf7e-text-stone-400 ${ focusRing }` }
			/>

			<div className="cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-gap-3">
				<button
					type="button"
					onClick={ send }
					disabled={ state?.sending || '' === subject.trim() || '' === message.trim() }
					className={ `${ btnGhost } disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-50` }
				>
					<Reply className="cf7e-h-4 cf7e-w-4 cf7e-text-stone-400" />
					{ state?.sending ? __( 'Sending…', 'essentials-for-contact-form-7' ) : __( 'Send reply', 'essentials-for-contact-form-7' ) }
				</button>

				{ state?.sent && (
					<span className="cf7e-text-sm cf7e-font-medium cf7e-text-emerald-700">{ __( 'Sent.', 'essentials-for-contact-form-7' ) }</span>
				) }
			</div>

			{ /* WordPress's own words when it could not send, which on most sites
			     means SMTP is not set up — and that is the thing to go and fix. */ }
			{ state?.error && (
				<div className="cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-3 cf7e-py-2 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">
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
						className="cf7e-fixed cf7e-inset-0 cf7e-z-[99998] cf7e-bg-ink/30 cf7e-backdrop-blur-sm"
					/>
					<aside
						className="cf7e-fixed cf7e-right-0 cf7e-top-0 cf7e-z-[99999] cf7e-flex cf7e-h-full cf7e-w-full cf7e-max-w-[38rem] cf7e-flex-col cf7e-bg-white cf7e-shadow-drawer"
					>
						<header className="cf7e-flex cf7e-items-start cf7e-justify-between cf7e-gap-4 cf7e-border-b cf7e-border-line cf7e-bg-accent-50 cf7e-px-6 cf7e-py-5">
							<div className="cf7e-flex cf7e-min-w-0 cf7e-flex-col">
								<span className="cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wider cf7e-text-accent">
									{ __( 'Submission', 'essentials-for-contact-form-7' ) }
								</span>
								<span className="cf7e-text-2xl cf7e-font-bold cf7e-text-ink cf7e-tnum">#{ item.id }</span>

							</div>
							<button
								type="button"
								onClick={ onClose }
								aria-label={ __( 'Close', 'essentials-for-contact-form-7' ) }
								className="cf7e-flex cf7e-h-9 cf7e-w-9 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-white/70 cf7e-text-stone-500 cf7e-transition-colors hover:cf7e-bg-white hover:cf7e-text-ink"
							>
								<X className="cf7e-h-4 cf7e-w-4" />
							</button>
						</header>

						<div className="cf7e-scroll cf7e-flex-1 cf7e-overflow-y-auto cf7e-px-3.5 cf7e-py-5" style={ { scrollbarGutter: 'stable both-edges' } }>
							<div className="cf7e-mb-6 cf7e-grid cf7e-grid-cols-2 cf7e-gap-4 cf7e-text-sm sm:cf7e-grid-cols-4">
								<div className="cf7e-flex cf7e-flex-col cf7e-gap-1.5">
									<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">{ __( 'Status', 'essentials-for-contact-form-7' ) }</span>
									<StatusPill status={ item.status } />
								</div>
								<div className="cf7e-flex cf7e-flex-col cf7e-gap-1.5">
									<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">{ __( 'Form ID', 'essentials-for-contact-form-7' ) }</span>
									<span className="cf7e-font-semibold cf7e-text-ink cf7e-tnum">{ item.form_id }</span>
								</div>
								<div className="cf7e-flex cf7e-flex-col cf7e-gap-1.5">
									<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">{ __( 'Date', 'essentials-for-contact-form-7' ) }</span>
									<span className="cf7e-text-[14px] cf7e-font-medium cf7e-text-ink">{ formatDate( item.created_at ) }</span>
								</div>
								{ item.ip && (
									<div className="cf7e-flex cf7e-flex-col cf7e-gap-1.5">
										<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">{ __( 'IP address', 'essentials-for-contact-form-7' ) }</span>
										<span className="cf7e-text-[14px] cf7e-font-medium cf7e-text-ink">{ item.ip }</span>
									</div>
								) }
							</div>

							<div className="cf7e-flex cf7e-flex-col cf7e-divide-y cf7e-divide-line cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line">
								{ parseFields( item.data ).map( ( [ key, value ] ) => {
									const files = attachmentsFor( item.data, key );

									return (
										<div key={ key } className="cf7e-grid cf7e-gap-1 cf7e-px-4 cf7e-py-3.5 hover:cf7e-bg-stone-50/60 sm:cf7e-grid-cols-[minmax(0,9rem)_1fr] sm:cf7e-gap-4">
											<span className="cf7e-break-words cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">{ key }</span>
											{ files ? (
												<div className="cf7e-flex cf7e-min-w-0 cf7e-flex-col cf7e-items-start cf7e-gap-1.5">
													{ files.map( ( file ) => (
														<a
															key={ file.file }
															href={ attachmentUrl( files.dir, file ) }
															className="cf7e-inline-flex cf7e-w-fit cf7e-max-w-full cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-white cf7e-px-2.5 cf7e-py-1.5 cf7e-text-sm cf7e-font-medium cf7e-text-ink cf7e-no-underline cf7e-transition-colors hover:cf7e-border-stroke hover:cf7e-bg-stone-50"
														>
															<Paperclip className="cf7e-h-3.5 cf7e-w-3.5 cf7e-shrink-0 cf7e-text-stone-400" />
															<span className="cf7e-min-w-0 cf7e-truncate">{ file.name }</span>
															<span className="cf7e-shrink-0 cf7e-text-[14px] cf7e-text-stone-400 cf7e-tnum">{ fileSize( file.size ) }</span>
															<Download className="cf7e-h-3.5 cf7e-w-3.5 cf7e-shrink-0 cf7e-text-stone-400" />
														</a>
													) ) }
												</div>
											) : (
												<span className="cf7e-whitespace-pre-wrap cf7e-break-words cf7e-text-sm cf7e-text-ink">
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
						<div className="cf7e-border-t cf7e-border-line cf7e-px-6 cf7e-py-5">
							<ReplyBox item={ item } onSent={ onReplied } />
						</div>

						{ /* Where you got to, and the one thing you cannot undo,
						     at opposite ends of the same row. */ }
						<footer className="cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-justify-between cf7e-gap-3 cf7e-border-t cf7e-border-line cf7e-px-6 cf7e-py-4">
							<div className="cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-gap-2">
								{ [ 'replied', 'done' ].map( ( stage ) => (
									<button
										key={ stage }
										type="button"
										onClick={ () => onStage( item.id, item.stage === stage ? 'new' : stage ) }
										aria-pressed={ item.stage === stage }
										className={ `cf7e-flex cf7e-cursor-pointer cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-px-3 cf7e-py-2 cf7e-text-sm cf7e-font-semibold cf7e-transition-colors ${
											item.stage === stage
												? 'cf7e-border-ink cf7e-bg-ink cf7e-text-white'
												: 'cf7e-border-line cf7e-bg-white cf7e-text-stone-500 hover:cf7e-border-stroke hover:cf7e-bg-stone-50 hover:cf7e-text-ink'
										}` }
									>
										{ 'replied' === stage ? <Reply className="cf7e-h-4 cf7e-w-4" /> : <Check className="cf7e-h-4 cf7e-w-4" /> }
										{ 'replied' === stage ? __( 'Replied', 'essentials-for-contact-form-7' ) : __( 'Done', 'essentials-for-contact-form-7' ) }
									</button>
								) ) }
							</div>
							<button
								type="button"
								onClick={ () => onDelete( item.id ) }
								className="cf7e-flex cf7e-cursor-pointer cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border-0 cf7e-bg-red-50 cf7e-px-3 cf7e-py-2 cf7e-text-sm cf7e-font-semibold cf7e-text-red-700 cf7e-transition-colors hover:cf7e-bg-red-100"
							>
								<Trash2 className="cf7e-h-4 cf7e-w-4" />
								{ __( 'Delete submission', 'essentials-for-contact-form-7' ) }
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
		`cf7e-inline-flex cf7e-h-9 cf7e-w-9 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-text-ink cf7e-transition-colors hover:cf7e-bg-stone-50 active:cf7e-bg-stone-100 disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-40`;

	return (
		<div className="cf7e-flex cf7e-items-center cf7e-gap-1.5">
			<button
				type="button"
				disabled={ page <= 1 }
				onClick={ () => onChange( page - 1 ) }
				aria-label={ __( 'Previous page', 'essentials-for-contact-form-7' ) }
				className={ navBtn }
			>
				<ChevronLeft className="cf7e-h-4 cf7e-w-4" />
			</button>

			{ pageList( page, totalPages ).map( ( entry ) =>
				'number' === typeof entry ? (
					<button
						key={ entry }
						type="button"
						onClick={ () => onChange( entry ) }
						aria-current={ entry === page ? 'page' : undefined }
						className={ `cf7e-inline-flex cf7e-h-9 cf7e-min-w-[2.25rem] cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-px-2 cf7e-text-sm cf7e-font-semibold cf7e-tnum cf7e-transition-colors ${
							entry === page
								? 'cf7e-border-0 cf7e-bg-ink cf7e-text-white'
								: 'cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-text-ink hover:cf7e-bg-stone-50'
						}` }
					>
						{ entry }
					</button>
				) : (
					<span key={ entry } className="cf7e-inline-flex cf7e-h-9 cf7e-w-6 cf7e-items-center cf7e-justify-center cf7e-text-sm cf7e-text-stone-400">
						…
					</span>
				)
			) }

			<button
				type="button"
				disabled={ page >= totalPages }
				onClick={ () => onChange( page + 1 ) }
				aria-label={ __( 'Next page', 'essentials-for-contact-form-7' ) }
				className={ navBtn }
			>
				<ChevronRight className="cf7e-h-4 cf7e-w-4" />
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
				<div className="cf7e-fixed cf7e-inset-0 cf7e-z-[100000] cf7e-flex cf7e-items-start cf7e-justify-center cf7e-px-4 cf7e-pb-4 cf7e-pt-[7vh]">
					<Backdrop
						onClick={ onCancel }
						className="cf7e-absolute cf7e-inset-0 cf7e-bg-ink/40 cf7e-backdrop-blur-sm"
					/>
					<div
						role="alertdialog"
						aria-modal="true"
						className="cf7e-relative cf7e-w-full cf7e-max-w-sm cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-shadow-pop"
					>
						<div className="cf7e-flex cf7e-gap-4 cf7e-p-5">
							<div className="cf7e-flex cf7e-h-11 cf7e-w-11 cf7e-shrink-0 cf7e-items-center cf7e-justify-center cf7e-rounded-full cf7e-bg-red-50 cf7e-text-red-600">
								<AlertTriangle className="cf7e-h-5 cf7e-w-5" />
							</div>
							<div className="cf7e-flex cf7e-flex-col cf7e-gap-1.5">
								<h3 className="cf7e-m-0 cf7e-text-base cf7e-font-bold cf7e-text-ink">{ pending.title }</h3>
								<p className="cf7e-m-0 cf7e-text-sm cf7e-leading-relaxed cf7e-text-stone-500">{ pending.message }</p>
							</div>
						</div>
						<div className="cf7e-flex cf7e-justify-end cf7e-gap-2 cf7e-border-t cf7e-border-line cf7e-bg-stone-50/50 cf7e-px-5 cf7e-py-3.5">
							<button
								type="button"
								onClick={ onCancel }
								className={ btnGhost }
							>
								{ __( 'Cancel', 'essentials-for-contact-form-7' ) }
							</button>
							<button
								type="button"
								onClick={ () => pending.onConfirm && pending.onConfirm() }
								className={ btnDanger }
							>
								<Trash2 className="cf7e-h-4 cf7e-w-4" />
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
		apiFetch( { path: `cf7e/v1/submissions?${ params }` } )
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
		apiFetch( { path: 'cf7e/v1/stats' } ).then( setStats ).catch( () => {} );
		apiFetch( { path: 'cf7e/v1/forms/overview' } ).then( setForms ).catch( () => {} );
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

		apiFetch( { path: 'cf7e/v1/submissions/mark-read', method: 'POST', data: { ids: [ item.id ] } } )
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
		apiFetch( { path: 'cf7e/v1/submissions/stage', method: 'POST', data: { ids: [ id ], stage } } )
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
		apiFetch( { path: 'cf7e/v1/submissions/mark-read', method: 'POST', data: { all: true } } )
			.then( ( res ) => {
				setItems( ( curr ) => curr.map( ( row ) => ( row.read_at ? row : { ...row, read_at: 'read' } ) ) );
				setStats( ( curr ) => ( { ...curr, unread: res.unread } ) );
			} )
			.catch( ( err ) => setError( err.message ) );
	};

	const deleteOne = ( id ) => {
		setConfirm( {
			title:        __( 'Delete submission?', 'essentials-for-contact-form-7' ),
			message:      __( 'This permanently removes the submission. This action cannot be undone.', 'essentials-for-contact-form-7' ),
			confirmLabel: __( 'Delete', 'essentials-for-contact-form-7' ),
			onConfirm:    async () => {
				try {
					await apiFetch( { path: `cf7e/v1/submissions/${ id }`, method: 'DELETE' } );
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
			title:   __( 'Delete selected submissions?', 'essentials-for-contact-form-7' ),
			message: sprintf(
				/* translators: %d: number of submissions. */
				_n(
					'This permanently removes %d submission. This action cannot be undone.',
					'This permanently removes %d submissions. This action cannot be undone.',
					count,
					'essentials-for-contact-form-7'
				),
				count
			),
			confirmLabel: __( 'Delete all', 'essentials-for-contact-form-7' ),
			onConfirm:    async () => {
				try {
					await apiFetch( {
						path:   'cf7e/v1/submissions/bulk-delete',
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
				title={ __( 'Submissions', 'essentials-for-contact-form-7' ) }
				subtitle={ __( 'Every entry your forms have captured.', 'essentials-for-contact-form-7' ) }
			/>
			<StatStrip stats={ stats } />

			<div className="cf7e-mb-4 cf7e-flex cf7e-flex-col cf7e-gap-3">
				<div className="cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-gap-3">
					<StatusTabs active={ status } onChange={ resetPage( setStatus ) } stats={ stats } />
					{ stats.unread > 0 && (
						<button type="button" onClick={ markAllRead } className={ btnGhost }>
							<CheckCheck className="cf7e-h-4 cf7e-w-4 cf7e-text-stone-400" />
							{ sprintf(
								/* translators: %s: number of unread submissions. */
								__( 'Mark %s read', 'essentials-for-contact-form-7' ),
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
				<div className="cf7e-mb-4 cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">
					{ error }
				</div>
			) }

			<AnimatePresence>
				{ selectedIds.length > 0 && (
					<motion.div
						initial={ { opacity: 0, y: -8 } } animate={ { opacity: 1, y: 0 } } exit={ { opacity: 0, y: -8 } }
						className="cf7e-mb-4 cf7e-flex cf7e-items-center cf7e-justify-between cf7e-rounded-xl cf7e-border cf7e-border-accent-200 cf7e-bg-accent-50 cf7e-px-4 cf7e-py-2.5"
					>
						<span className="cf7e-text-sm cf7e-font-semibold cf7e-text-accent-700">
							{ sprintf(
								/* translators: %d: number of selected submissions. */
								__( '%d selected', 'essentials-for-contact-form-7' ),
								selectedIds.length
							) }
						</span>
						<button
							type="button"
							onClick={ deleteSelected }
							className="cf7e-flex cf7e-cursor-pointer cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border-0 cf7e-bg-red-600 cf7e-px-3 cf7e-py-1.5 cf7e-text-sm cf7e-font-semibold cf7e-text-white cf7e-transition-colors hover:cf7e-bg-red-700"
						>
							<Trash2 className="cf7e-h-4 cf7e-w-4" />
							{ __( 'Delete selected', 'essentials-for-contact-form-7' ) }
						</button>
					</motion.div>
				) }
			</AnimatePresence>

			<div className="cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white">
				<table className="cf7e-w-full cf7e-border-collapse cf7e-text-left">
					<thead>
						<tr className="cf7e-border-b cf7e-border-line cf7e-bg-stone-50/70">
							<th className="cf7e-w-10 cf7e-px-4 cf7e-py-3">
								<input
									type="checkbox"
									checked={ allSelected }
									onChange={ toggleSelectAll }
									className="cf7e-h-4 cf7e-w-4 cf7e-cursor-pointer cf7e-accent-accent"
								/>
							</th>
							<th className={ headCellClass }>
								<SortHeader label={ __( 'ID', 'essentials-for-contact-form-7' ) } sortKey="id" currentSort={ sort } onSort={ setSort } />
							</th>
							<th className={ headCellClass }>{ __( 'Form', 'essentials-for-contact-form-7' ) }</th>
							<th className={ headCellClass }>{ __( 'Preview', 'essentials-for-contact-form-7' ) }</th>
							<th className={ headCellClass }>{ __( 'Status', 'essentials-for-contact-form-7' ) }</th>
							<th className={ headCellClass }>
								<SortHeader label={ __( 'Date', 'essentials-for-contact-form-7' ) } sortKey="date" currentSort={ sort } onSort={ setSort } />
							</th>
							<th className="cf7e-w-10 cf7e-px-4 cf7e-py-3"></th>
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
									className={ `cf7e-group cf7e-cursor-pointer cf7e-border-b cf7e-border-line cf7e-transition-colors last:cf7e-border-0 ${
										// Three resting shades, so the ladder reads at a glance: a
										// ticked row is the strongest, an unread one carries a light
										// tint, and a row already read stays plain.
										//
										// Both tints are accent-50, one of them softened. A step
										// darker was tried and measured 4.36:1 for the muted preview
										// text sitting on it — under what small text needs.
										isSelected
											? 'cf7e-bg-accent-50'
											: unread
												? 'cf7e-bg-accent-50/60 hover:cf7e-bg-accent-50'
												: 'hover:cf7e-bg-stone-50/70'
									}` }
								>
									{ /* An unread row is marked three ways, because any one of them
									     alone is easy to miss: a rule down its left edge, a dot
									     beside the id, and its text at full strength while a read
									     row is muted. */ }
									<td className="cf7e-relative cf7e-px-4 cf7e-py-3.5" onClick={ ( event ) => event.stopPropagation() }>
										{ unread && <span className="cf7e-absolute cf7e-inset-y-0 cf7e-left-0 cf7e-w-[3px] cf7e-bg-accent" aria-hidden="true" /> }
										<input
											type="checkbox"
											checked={ isSelected }
											onChange={ () => toggleSelect( item.id ) }
											className="cf7e-h-4 cf7e-w-4 cf7e-cursor-pointer cf7e-accent-accent"
										/>
									</td>
									<td className={ `cf7e-px-4 cf7e-py-3.5 cf7e-text-sm cf7e-tnum ${ unread ? 'cf7e-font-bold cf7e-text-ink' : 'cf7e-font-semibold cf7e-text-stone-500' }` }>
										<span className="cf7e-inline-flex cf7e-items-center cf7e-gap-1.5">
											{ unread
												? <span className="cf7e-h-2 cf7e-w-2 cf7e-shrink-0 cf7e-rounded-full cf7e-bg-accent" aria-hidden="true" />
												: <span className="cf7e-h-2 cf7e-w-2 cf7e-shrink-0" aria-hidden="true" /> }
											#{ item.id }
											<span className="cf7e-sr-only">
												{ unread ? __( 'Unread', 'essentials-for-contact-form-7' ) : __( 'Read', 'essentials-for-contact-form-7' ) }
											</span>
										</span>
									</td>
									<td className={ `cf7e-px-4 cf7e-py-3.5 cf7e-text-sm ${ unread ? 'cf7e-font-semibold cf7e-text-ink' : 'cf7e-font-medium cf7e-text-stone-500' }` }>{ formTitle }</td>
									<td className={ `cf7e-max-w-md cf7e-truncate cf7e-px-4 cf7e-py-3.5 cf7e-text-sm ${ unread ? 'cf7e-text-stone-600' : 'cf7e-text-stone-400' }` }>{ fieldPreview( item.data ) }</td>
									<td className="cf7e-px-4 cf7e-py-3.5">
										<div className="cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-gap-1.5">
											<StatusPill status={ item.status } />
											<StagePill stage={ item.stage } />
										</div>
									</td>
									<td className="cf7e-whitespace-nowrap cf7e-px-4 cf7e-py-3.5 cf7e-text-[14px] cf7e-text-stone-500 cf7e-tnum">{ formatDate( item.created_at ) }</td>
									<td className="cf7e-px-4 cf7e-py-3.5" onClick={ ( event ) => event.stopPropagation() }>
										<button
											type="button"
											onClick={ () => deleteOne( item.id ) }
											aria-label={ __( 'Delete', 'essentials-for-contact-form-7' ) }
											className="cf7e-flex cf7e-h-7 cf7e-w-7 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-md cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 cf7e-opacity-0 cf7e-transition hover:cf7e-bg-red-50 hover:cf7e-text-red-600 group-hover:cf7e-opacity-100"
										>
											<Trash2 className="cf7e-h-4 cf7e-w-4" />
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
				<div className="cf7e-mt-5 cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-justify-between cf7e-gap-3">
					<p className="cf7e-m-0 cf7e-text-sm cf7e-text-stone-500 cf7e-tnum">
						{ sprintf(
							/* translators: 1: total entries, 2: total pages. */
							__( '%1$s entries · %2$d pages', 'essentials-for-contact-form-7' ),
							total.toLocaleString(), totalPages
						) }
					</p>
					<Pagination page={ page } totalPages={ totalPages } onChange={ setPage } />
				</div>
			) }
		</Page>
	);
};

const mount = document.getElementById( 'cf7e-submissions-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
