import { createRoot, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Inbox,
	ArrowRight,
	ArrowUpRight,
	ArrowDownRight,
	Minus,
	ShieldAlert,
	Settings as SettingsIcon,
	CheckCheck,
	X,
	Palette,
	LayoutTemplate,
	FilePlus2,
} from 'lucide-react';

import { Page, PageHeader } from '@shared/components/page';
import { Shimmer, btnGhost } from '@shared/components/ui';
import { summarise } from '@shared/submission-fields';
import { ActivityChart } from './activity-chart.jsx';
import { trend } from './trend.js';
import '@shared/styles/admin.css';

const RECENT = 5;

/**
 * How many forms have entries, handed over by the page that rendered this.
 *
 * The loading state can work out its own height from markup for everything
 * except the breakdown, which is as tall as the site has forms — the one number
 * the browser cannot know until the fetch it is waiting on comes back. The
 * server knew it all along, so it says so (see Menu::hand_over).
 */
const FORM_COUNT = Number( window.deferformsDashboard?.forms ?? 0 );

const Trend = ( { of } ) => {
	if ( ! of ) {
		return null;
	}

	if ( 'new' === of.direction ) {
		return (
			<span className="deferforms-text-[14px] deferforms-font-medium deferforms-text-stone-400">
				{ __( 'nothing the week before', 'defer-forms-for-contact-form-7' ) }
			</span>
		);
	}

	const Icon = { up: ArrowUpRight, down: ArrowDownRight, level: Minus }[ of.direction ];

	return (
		<span className="deferforms-inline-flex deferforms-items-center deferforms-gap-1 deferforms-text-[14px] deferforms-font-medium deferforms-text-stone-400">
			<Icon className="deferforms-h-3.5 deferforms-w-3.5" />
			{ 'level' === of.direction
				? __( 'same as the week before', 'defer-forms-for-contact-form-7' )
				: sprintf(
					/* translators: %1$s: a percentage, without its sign. */
					__( '%1$s%% on the week before', 'defer-forms-for-contact-form-7' ),
					of.percent.toLocaleString()
				) }
		</span>
	);
};

/**
 * One figure and what it counts.
 *
 * No icon and no tinted tile. Three of these sit in a row under a chart, and a
 * coloured square beside each one competes with the only mark on the page that
 * is carrying data.
 */
const Figure = ( { label, value, loading, children } ) => (
	<div className="deferforms-flex deferforms-flex-col deferforms-gap-1">
		<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">
			{ label }
		</span>
		{ loading ? (
			<Shimmer w="deferforms-w-16" text="deferforms-text-3xl deferforms-leading-none" />
		) : (
			<span className="deferforms-text-3xl deferforms-font-bold deferforms-leading-none deferforms-tracking-tight deferforms-text-ink deferforms-tnum">
				{ value.toLocaleString() }
			</span>
		) }
		{ /* The comparison line under This week. Reserved while loading, or the
		     figure is twenty pixels shorter than it is about to be. */ }
		{ loading ? <Shimmer w="deferforms-w-32" text="deferforms-text-[14px]" /> : children }
	</div>
);

/**
 * "There are entries you have not seen."
 *
 * Counted from the entries themselves, the same number the menu bubble shows.
 * A link rather than a notice: the only useful response to it is to go and read
 * them.
 *
 * To the Submitted tab, not to All. Unread is counted over submitted entries
 * only — spam is never unread, it was never in the inbox — so All is a list
 * holding the entries this banner is about plus some it is not.
 */
const UnreadBanner = ( { count, onMarkRead, marking } ) => (
	<div className="deferforms-flex deferforms-items-center deferforms-gap-4 deferforms-rounded-2xl deferforms-border deferforms-border-accent-200 deferforms-bg-accent-50 deferforms-p-5">
		<div className="deferforms-relative deferforms-flex deferforms-h-12 deferforms-w-12 deferforms-shrink-0 deferforms-items-center deferforms-justify-center deferforms-rounded-xl deferforms-bg-ink deferforms-text-white">
			<Inbox className="deferforms-h-6 deferforms-w-6" />
			<span className="deferforms-absolute -deferforms-right-1 -deferforms-top-1 deferforms-flex deferforms-h-5 deferforms-min-w-[1.25rem] deferforms-items-center deferforms-justify-center deferforms-rounded-full deferforms-bg-red-600 deferforms-px-1 deferforms-text-[14px] deferforms-font-bold deferforms-leading-none deferforms-text-white deferforms-tnum">
				{ count > 99 ? '99+' : count }
			</span>
		</div>
		<div className="deferforms-flex deferforms-flex-1 deferforms-flex-col deferforms-gap-0.5">
			<span className="deferforms-text-base deferforms-font-semibold deferforms-text-ink">
				{ sprintf(
					/* translators: %s: number of new submissions. */
					_n( '%s entry you have not read', '%s entries you have not read', count, 'defer-forms-for-contact-form-7' ),
					count.toLocaleString()
				) }
			</span>
			<span className="deferforms-text-[15px] deferforms-text-stone-500">
				{ __( 'Opening one marks it read.', 'defer-forms-for-contact-form-7' ) }
			</span>
		</div>

		{ /*
		  * Mark all read rather than a dismiss cross.
		  *
		  * "Four entries you have not read" is a true statement, and a control
		  * that only hides it leaves the badge in the menu, the count on the
		  * Submissions tab and this notice next time — all still saying four,
		  * with one of them now hidden. Asked for as a way to make it go away;
		  * this is the way that also makes it stop being true.
		  */ }
		<button
			type="button"
			onClick={ onMarkRead }
			disabled={ marking }
			className={ `${ btnGhost } deferforms-shrink-0` }
		>
			<CheckCheck className="deferforms-h-4 deferforms-w-4 deferforms-text-stone-400" />
			{ marking ? __( 'Marking…', 'defer-forms-for-contact-form-7' ) : __( 'Mark all read', 'defer-forms-for-contact-form-7' ) }
		</button>

		<a
			href="admin.php?page=deferforms-submissions&status=submitted"
			className="deferforms-group deferforms-inline-flex deferforms-shrink-0 deferforms-items-center deferforms-gap-1.5 deferforms-text-sm deferforms-font-semibold deferforms-text-ink deferforms-no-underline"
		>
			{ __( 'Read them', 'defer-forms-for-contact-form-7' ) }
			<ArrowRight className="deferforms-h-4 deferforms-w-4 deferforms-transition-transform group-hover:deferforms-translate-x-0.5" />
		</a>
	</div>
);

/**
 * Spam, but only once there is some.
 *
 * It used to be a fourth stat card reading 0 on every site that has never been
 * found by a bot, which is most of them — a quarter of the row spent saying
 * nothing happened. Here it appears when the filter has caught something and is
 * absent the rest of the time, which is also the only time the number means
 * anything: it is evidence the trap is working.
 */
const SpamNote = ( { count, onDismiss } ) => (
	<div className="deferforms-flex deferforms-items-center deferforms-gap-3 deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-px-5 deferforms-py-4">
		<ShieldAlert className="deferforms-h-5 deferforms-w-5 deferforms-shrink-0 deferforms-text-amber-600" />
		<span className="deferforms-flex-1 deferforms-text-[15px] deferforms-text-stone-500">
			{ sprintf(
				/* translators: %s: number of spam submissions. */
				_n( '%s spam entry was caught and kept out of your inbox.', '%s spam entries were caught and kept out of your inbox.', count, 'defer-forms-for-contact-form-7' ),
				count.toLocaleString()
			) }
		</span>
		<a href="admin.php?page=deferforms-submissions&status=spam" className="deferforms-text-sm deferforms-font-semibold deferforms-text-ink deferforms-no-underline">
			{ __( 'See them', 'defer-forms-for-contact-form-7' ) }
		</a>

		{ /*
		  * This one does close, and unlike the unread notice it should.
		  *
		  * It is news rather than a task: the spam is already caught and out of
		  * the way, and nothing is waiting on you. So what is remembered is the
		  * count you saw it at — the next one that arrives brings it back, which
		  * is the only time it has anything new to say.
		  */ }
		<button
			type="button"
			onClick={ onDismiss }
			aria-label={ __( 'Dismiss', 'defer-forms-for-contact-form-7' ) }
			title={ __( 'Hide this until more arrives', 'defer-forms-for-contact-form-7' ) }
			className="deferforms-flex deferforms-h-7 deferforms-w-7 deferforms-shrink-0 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-rounded-lg deferforms-border-0 deferforms-bg-transparent deferforms-text-stone-400 deferforms-transition-colors hover:deferforms-bg-stone-100 hover:deferforms-text-ink"
		>
			<X className="deferforms-h-4 deferforms-w-4" />
		</button>
	</div>
);

/**
 * The spam count this browser has already been shown.
 *
 * Per person and per browser, which is what "I have seen this" means — it is
 * not a site setting and the next admin has not seen it.
 */
const SEEN_SPAM = 'deferforms-spam-seen';

const spamSeen = () => {
	const stored = parseInt( window.localStorage?.getItem( SEEN_SPAM ) || '0', 10 );
	return Number.isNaN( stored ) ? 0 : stored;
};

/**
 * Which forms the entries came from.
 *
 * Drawn whenever there is anything to draw, including for a single form. It
 * used to appear only when there was more than one, which reads better on a
 * one-form site and cost the card its height: nothing can reserve room for a
 * section whose existence depends on the answer that has not arrived yet.
 */
const FormSplit = ( { forms, loading = false, rows = 1 } ) => {
	if ( loading ) {
		return (
			<div className="deferforms-mt-6 deferforms-border-t deferforms-border-line deferforms-pt-5">
				<Shimmer w="deferforms-w-40" text="deferforms-text-[14px]" />
				<ul className="deferforms-m-0 deferforms-mt-3 deferforms-flex deferforms-list-none deferforms-flex-col deferforms-gap-2.5 deferforms-p-0">
					{ Array.from( { length: rows } ).map( ( _, index ) => (
						<li key={ index } className="deferforms-flex deferforms-items-center deferforms-gap-3">
							<Shimmer w="deferforms-w-40" text="deferforms-text-[15px]" className="deferforms-shrink-0" />
							<span className="deferforms-h-2 deferforms-flex-1 deferforms-animate-pulse deferforms-rounded-full deferforms-bg-stone-100" />
							<Shimmer w="deferforms-w-10" text="deferforms-text-[15px]" className="deferforms-shrink-0" />
						</li>
					) ) }
				</ul>
			</div>
		);
	}

	const most = Math.max( ...forms.map( ( form ) => form.count ) );

	return (
		<div className="deferforms-mt-6 deferforms-border-t deferforms-border-line deferforms-pt-5">
			<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">
				{ __( 'Where they came from', 'defer-forms-for-contact-form-7' ) }
			</span>
			<ul className="deferforms-m-0 deferforms-mt-3 deferforms-flex deferforms-list-none deferforms-flex-col deferforms-gap-2.5 deferforms-p-0">
				{ forms.map( ( form ) => (
					<li key={ form.form_id } className="deferforms-flex deferforms-items-center deferforms-gap-3">
						<a
							href={ `admin.php?page=deferforms-submissions&form=${ form.form_id }` }
							className="deferforms-w-40 deferforms-shrink-0 deferforms-truncate deferforms-text-[15px] deferforms-text-ink deferforms-no-underline hover:deferforms-underline"
							title={ form.title }
						>
							{ form.title }
						</a>
						<span className="deferforms-h-2 deferforms-flex-1 deferforms-overflow-hidden deferforms-rounded-full deferforms-bg-stone-100">
							<span
								className="deferforms-block deferforms-h-full deferforms-rounded-full deferforms-bg-ink"
								style={ { width: `${ Math.max( 4, ( form.count / most ) * 100 ) }%` } }
							/>
						</span>
						<span className="deferforms-w-10 deferforms-shrink-0 deferforms-text-right deferforms-text-[15px] deferforms-font-semibold deferforms-text-ink deferforms-tnum">
							{ form.count.toLocaleString() }
						</span>
					</li>
				) ) }
			</ul>
		</div>
	);
};

const when = ( mysqlUtc ) =>
	new Date( mysqlUtc.replace( ' ', 'T' ) + 'Z' ).toLocaleString( undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	} );

/** The last few entries, so the newest one is readable without leaving. */
const Recent = ( { items, titleFor, loading = false } ) => (
	<section className="deferforms-mt-8">
		<div className="deferforms-mb-3 deferforms-flex deferforms-items-baseline deferforms-justify-between">
			<h2 className="deferforms-m-0 deferforms-text-xl deferforms-font-bold deferforms-text-ink">{ __( 'Latest entries', 'defer-forms-for-contact-form-7' ) }</h2>
			<a
				href="admin.php?page=deferforms-submissions"
				className="deferforms-text-sm deferforms-font-semibold deferforms-text-ink deferforms-no-underline hover:deferforms-underline"
			>
				{ __( 'All entries', 'defer-forms-for-contact-form-7' ) }
			</a>
		</div>
		<ul className="deferforms-m-0 deferforms-list-none deferforms-overflow-hidden deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-0">
			{ loading
				? Array.from( { length: RECENT } ).map( ( _, index ) => (
					<li key={ index } className="deferforms-border-b deferforms-border-line last:deferforms-border-0">
						<div className="deferforms-flex deferforms-items-center deferforms-gap-4 deferforms-px-5 deferforms-py-3.5">
							<span className="deferforms-h-2 deferforms-w-2 deferforms-shrink-0 deferforms-animate-pulse deferforms-rounded-full deferforms-bg-stone-100" />
							<Shimmer w="deferforms-w-48" text="deferforms-text-[15px]" className="deferforms-min-w-0 deferforms-flex-1" />
							<Shimmer w="deferforms-w-28" text="deferforms-text-[14px]" className="deferforms-hidden deferforms-shrink-0 sm:deferforms-block" />
							<Shimmer w="deferforms-w-36" text="deferforms-text-[14px]" className="deferforms-shrink-0" />
						</div>
					</li>
				) )
				: items.map( ( item ) => (
				<li key={ item.id } className="deferforms-border-b deferforms-border-line last:deferforms-border-0">
					{ /* Named, so the entry opens rather than the visitor landing on
					     the same list whichever row they clicked. */ }
					<a
						href={ `admin.php?page=deferforms-submissions&entry=${ item.id }` }
						className="deferforms-flex deferforms-items-center deferforms-gap-4 deferforms-px-5 deferforms-py-3.5 deferforms-no-underline deferforms-transition-colors hover:deferforms-bg-stone-50/70"
					>
						{ ! item.read_at && (
							<span
								className="deferforms-h-2 deferforms-w-2 deferforms-shrink-0 deferforms-rounded-full deferforms-bg-ink"
								title={ __( 'Not read yet', 'defer-forms-for-contact-form-7' ) }
							/>
						) }
						<span
							className={ `deferforms-min-w-0 deferforms-flex-1 deferforms-truncate deferforms-text-[15px] deferforms-text-ink ${
								item.read_at ? 'deferforms-ml-5' : 'deferforms-font-semibold'
							}` }
						>
							{ summarise( item.data, __( 'No answers were filled in', 'defer-forms-for-contact-form-7' ) ) }
						</span>
						<span className="deferforms-hidden deferforms-shrink-0 deferforms-truncate deferforms-text-[14px] deferforms-text-stone-400 sm:deferforms-block sm:deferforms-max-w-[10rem]">
							{ titleFor( item.form_id ) }
						</span>
						<span className="deferforms-shrink-0 deferforms-text-[14px] deferforms-text-stone-400">{ when( item.created_at ) }</span>
					</a>
				</li>
				) ) }
		</ul>
	</section>
);

/**
 * A site that has never received anything.
 *
 * Four zeroes and an empty chart describe the same situation, but they read as
 * a broken screen rather than a new one. What is useful on day one is the way
 * in, so that is what it says.
 */
const NothingYet = () => (
	<div className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-px-6 deferforms-py-10 deferforms-text-center">
		<div className="deferforms-mx-auto deferforms-flex deferforms-h-14 deferforms-w-14 deferforms-items-center deferforms-justify-center deferforms-rounded-2xl deferforms-bg-accent-50 deferforms-text-accent">
			<Inbox className="deferforms-h-7 deferforms-w-7" />
		</div>
		<h2 className="deferforms-mb-0 deferforms-mt-4 deferforms-text-xl deferforms-font-bold deferforms-text-ink">
			{ __( 'No entries yet', 'defer-forms-for-contact-form-7' ) }
		</h2>
		<p className="deferforms-mx-auto deferforms-mb-0 deferforms-mt-2 deferforms-max-w-md deferforms-text-[15px] deferforms-text-stone-500">
			{ __(
				'Everything sent through your forms is kept here, with its attachments. Put a form on a page and the first one will show up.',
				'defer-forms-for-contact-form-7'
			) }
		</p>
		<div className="deferforms-mt-6 deferforms-flex deferforms-flex-wrap deferforms-justify-center deferforms-gap-3">
			<a
				href="admin.php?page=deferforms-templates"
				className="deferforms-inline-flex deferforms-h-10 deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-bg-ink deferforms-px-4 deferforms-text-sm deferforms-font-semibold deferforms-text-white deferforms-no-underline"
			>
				<LayoutTemplate className="deferforms-h-4 deferforms-w-4" />
				{ __( 'Start from a template', 'defer-forms-for-contact-form-7' ) }
			</a>
			<a
				href="admin.php?page=deferforms-forms"
				className="deferforms-inline-flex deferforms-h-10 deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-px-4 deferforms-text-sm deferforms-font-semibold deferforms-text-ink deferforms-no-underline hover:deferforms-bg-stone-50"
			>
				<FilePlus2 className="deferforms-h-4 deferforms-w-4" />
				{ __( 'Build one from scratch', 'defer-forms-for-contact-form-7' ) }
			</a>
		</div>
	</div>
);

const QuickLink = ( { href, icon: Icon, title, desc } ) => (
	<a
		href={ href }
		className="deferforms-group deferforms-flex deferforms-items-center deferforms-gap-4 deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-5 deferforms-no-underline deferforms-transition-colors hover:deferforms-border-stroke hover:deferforms-bg-stone-50"
	>
		<div className="deferforms-flex deferforms-h-11 deferforms-w-11 deferforms-shrink-0 deferforms-items-center deferforms-justify-center deferforms-rounded-xl deferforms-bg-stone-100 deferforms-text-stone-500 deferforms-transition-colors group-hover:deferforms-bg-accent-50 group-hover:deferforms-text-accent">
			<Icon className="deferforms-h-5 deferforms-w-5" />
		</div>
		<div className="deferforms-flex deferforms-flex-1 deferforms-flex-col deferforms-gap-0.5">
			<span className="deferforms-text-base deferforms-font-semibold deferforms-text-ink">{ title }</span>
			<span className="deferforms-text-[15px] deferforms-text-stone-500">{ desc }</span>
		</div>
		<ArrowRight className="deferforms-h-5 deferforms-w-5 deferforms-text-stone-400 deferforms-transition-transform group-hover:deferforms-translate-x-0.5 group-hover:deferforms-text-accent" />
	</a>
);

const App = () => {
	const [ stats, setStats ]     = useState( { total: 0, today: 0, week: 0, spam: 0, unread: 0, daily: [] } );
	const [ recent, setRecent ]   = useState( [] );
	const [ marking, setMarking ] = useState( false );
	const [ seenSpam, setSeenSpam ] = useState( spamSeen );

	// Shown until it is dismissed, and again as soon as there is more of it than
	// there was when it was dismissed.
	const showSpam = stats.spam > 0 && stats.spam > seenSpam;

	const dismissSpam = () => {
		window.localStorage?.setItem( SEEN_SPAM, String( stats.spam ) );
		setSeenSpam( stats.spam );
	};

	/*
	 * The same route the Submissions page uses for the same button, and the
	 * count it answers with is the one this screen then shows — rather than
	 * assuming zero, which would be a guess that happened to be right.
	 */
	const markAllRead = () => {
		setMarking( true );

		apiFetch( { path: 'deferforms/v1/submissions/mark-read', method: 'POST', data: { all: true } } )
			.then( ( res ) => setStats( ( prev ) => ( { ...prev, unread: res.unread } ) ) )
			.catch( () => {} )
			.finally( () => setMarking( false ) );
	};
	const [ forms, setForms ]     = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ]     = useState( null );

	useEffect( () => {
		// Together, because the page is one answer: a chart drawn from one moment
		// over figures from another is a screen that contradicts itself.
		Promise.all( [
			apiFetch( { path: 'deferforms/v1/stats' } ),
			// Submitted only. Spam has its own notice above with its own count,
			// and this list is what came in — a caught bot sitting among the
			// newest enquiries is the one thing it should not be showing.
			apiFetch( { path: `deferforms/v1/submissions?per_page=${ RECENT }&status=submitted` } ),
			apiFetch( { path: 'deferforms/v1/forms' } ),
		] )
			.then( ( [ figures, entries, allForms ] ) => {
				setStats( figures );
				setRecent( entries.items || [] );
				setForms( allForms || [] );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message ) )
			.finally( () => setLoading( false ) );
	}, [] );

	const days     = stats.daily || [];
	const received = forms.filter( ( form ) => form.count > 0 );
	const titleFor = ( id ) =>
		forms.find( ( form ) => form.form_id === Number( id ) )?.title || __( 'Deleted form', 'defer-forms-for-contact-form-7' );

	return (
		<Page>
			<PageHeader
				title={ __( 'Dashboard', 'defer-forms-for-contact-form-7' ) }
				subtitle={ __( 'What your forms have been receiving.', 'defer-forms-for-contact-form-7' ) }
			/>

			{ error && (
				<div className="deferforms-mb-4 deferforms-rounded-lg deferforms-border deferforms-border-red-200 deferforms-bg-red-50 deferforms-px-4 deferforms-py-3 deferforms-text-sm deferforms-font-medium deferforms-text-red-700">
					{ error }
				</div>
			) }

			{ ! loading && ! stats.total ? (
				<NothingYet />
			) : (
				<>
					{ ( stats.unread > 0 || showSpam ) && (
						<div className="deferforms-mb-6 deferforms-flex deferforms-flex-col deferforms-gap-3">
							{ stats.unread > 0 && (
								<UnreadBanner count={ stats.unread } onMarkRead={ markAllRead } marking={ marking } />
							) }
							{ showSpam && <SpamNote count={ stats.spam } onDismiss={ dismissSpam } /> }
						</div>
					) }

					<section className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-6">
						<div className="deferforms-mb-6 deferforms-grid deferforms-grid-cols-3 deferforms-gap-6">
							<Figure label={ __( 'Today', 'defer-forms-for-contact-form-7' ) } value={ stats.today } loading={ loading } />
							<Figure label={ __( 'This week', 'defer-forms-for-contact-form-7' ) } value={ stats.week } loading={ loading }>
								{ ! loading && <Trend of={ trend( days ) } /> }
							</Figure>
							<Figure label={ __( 'All time', 'defer-forms-for-contact-form-7' ) } value={ stats.total } loading={ loading } />
						</div>

						<ActivityChart days={ days } loading={ loading } />

						{ loading
							? FORM_COUNT > 0 && <FormSplit loading rows={ FORM_COUNT } />
							: received.length > 0 && <FormSplit forms={ received } /> }
					</section>

					{ ( loading || recent.length > 0 ) && (
						<Recent items={ recent } titleFor={ titleFor } loading={ loading } />
					) }
				</>
			) }

			<h2 className="deferforms-mb-3 deferforms-mt-8 deferforms-text-xl deferforms-font-bold deferforms-text-ink">
				{ __( 'Set things up', 'defer-forms-for-contact-form-7' ) }
			</h2>
			<div className="deferforms-grid deferforms-grid-cols-1 deferforms-gap-4 sm:deferforms-grid-cols-3">
				<QuickLink
					href="admin.php?page=deferforms-forms"
					icon={ FilePlus2 }
					title={ __( 'Forms', 'defer-forms-for-contact-form-7' ) }
					desc={ __( 'Build and edit them.', 'defer-forms-for-contact-form-7' ) }
				/>
				<QuickLink
					href="admin.php?page=deferforms-styling"
					icon={ Palette }
					title={ __( 'Styling', 'defer-forms-for-contact-form-7' ) }
					desc={ __( 'Colours, shape and spacing.', 'defer-forms-for-contact-form-7' ) }
				/>
				<QuickLink
					href="admin.php?page=deferforms-settings"
					icon={ SettingsIcon }
					title={ __( 'Settings', 'defer-forms-for-contact-form-7' ) }
					desc={ __( 'Spam, privacy and retention.', 'defer-forms-for-contact-form-7' ) }
				/>
			</div>
		</Page>
	);
};

const mount = document.getElementById( 'deferforms-dashboard-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
