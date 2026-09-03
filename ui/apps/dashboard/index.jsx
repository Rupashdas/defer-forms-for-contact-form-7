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
const FORM_COUNT = Number( window.df7Dashboard?.forms ?? 0 );

const Trend = ( { of } ) => {
	if ( ! of ) {
		return null;
	}

	if ( 'new' === of.direction ) {
		return (
			<span className="df7-text-[14px] df7-font-medium df7-text-stone-400">
				{ __( 'nothing the week before', 'defer-forms-for-contact-form-7' ) }
			</span>
		);
	}

	const Icon = { up: ArrowUpRight, down: ArrowDownRight, level: Minus }[ of.direction ];

	return (
		<span className="df7-inline-flex df7-items-center df7-gap-1 df7-text-[14px] df7-font-medium df7-text-stone-400">
			<Icon className="df7-h-3.5 df7-w-3.5" />
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
	<div className="df7-flex df7-flex-col df7-gap-1">
		<span className="df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">
			{ label }
		</span>
		{ loading ? (
			<Shimmer w="df7-w-16" text="df7-text-3xl df7-leading-none" />
		) : (
			<span className="df7-text-3xl df7-font-bold df7-leading-none df7-tracking-tight df7-text-ink df7-tnum">
				{ value.toLocaleString() }
			</span>
		) }
		{ /* The comparison line under This week. Reserved while loading, or the
		     figure is twenty pixels shorter than it is about to be. */ }
		{ loading ? <Shimmer w="df7-w-32" text="df7-text-[14px]" /> : children }
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
	<div className="df7-flex df7-items-center df7-gap-4 df7-rounded-2xl df7-border df7-border-accent-200 df7-bg-accent-50 df7-p-5">
		<div className="df7-relative df7-flex df7-h-12 df7-w-12 df7-shrink-0 df7-items-center df7-justify-center df7-rounded-xl df7-bg-ink df7-text-white">
			<Inbox className="df7-h-6 df7-w-6" />
			<span className="df7-absolute -df7-right-1 -df7-top-1 df7-flex df7-h-5 df7-min-w-[1.25rem] df7-items-center df7-justify-center df7-rounded-full df7-bg-red-600 df7-px-1 df7-text-[14px] df7-font-bold df7-leading-none df7-text-white df7-tnum">
				{ count > 99 ? '99+' : count }
			</span>
		</div>
		<div className="df7-flex df7-flex-1 df7-flex-col df7-gap-0.5">
			<span className="df7-text-base df7-font-semibold df7-text-ink">
				{ sprintf(
					/* translators: %s: number of new submissions. */
					_n( '%s entry you have not read', '%s entries you have not read', count, 'defer-forms-for-contact-form-7' ),
					count.toLocaleString()
				) }
			</span>
			<span className="df7-text-[15px] df7-text-stone-500">
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
			className={ `${ btnGhost } df7-shrink-0` }
		>
			<CheckCheck className="df7-h-4 df7-w-4 df7-text-stone-400" />
			{ marking ? __( 'Marking…', 'defer-forms-for-contact-form-7' ) : __( 'Mark all read', 'defer-forms-for-contact-form-7' ) }
		</button>

		<a
			href="admin.php?page=df7-submissions&status=submitted"
			className="df7-group df7-inline-flex df7-shrink-0 df7-items-center df7-gap-1.5 df7-text-sm df7-font-semibold df7-text-ink df7-no-underline"
		>
			{ __( 'Read them', 'defer-forms-for-contact-form-7' ) }
			<ArrowRight className="df7-h-4 df7-w-4 df7-transition-transform group-hover:df7-translate-x-0.5" />
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
	<div className="df7-flex df7-items-center df7-gap-3 df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-px-5 df7-py-4">
		<ShieldAlert className="df7-h-5 df7-w-5 df7-shrink-0 df7-text-amber-600" />
		<span className="df7-flex-1 df7-text-[15px] df7-text-stone-500">
			{ sprintf(
				/* translators: %s: number of spam submissions. */
				_n( '%s spam entry was caught and kept out of your inbox.', '%s spam entries were caught and kept out of your inbox.', count, 'defer-forms-for-contact-form-7' ),
				count.toLocaleString()
			) }
		</span>
		<a href="admin.php?page=df7-submissions&status=spam" className="df7-text-sm df7-font-semibold df7-text-ink df7-no-underline">
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
			className="df7-flex df7-h-7 df7-w-7 df7-shrink-0 df7-cursor-pointer df7-items-center df7-justify-center df7-rounded-lg df7-border-0 df7-bg-transparent df7-text-stone-400 df7-transition-colors hover:df7-bg-stone-100 hover:df7-text-ink"
		>
			<X className="df7-h-4 df7-w-4" />
		</button>
	</div>
);

/**
 * The spam count this browser has already been shown.
 *
 * Per person and per browser, which is what "I have seen this" means — it is
 * not a site setting and the next admin has not seen it.
 */
const SEEN_SPAM = 'df7-spam-seen';

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
			<div className="df7-mt-6 df7-border-t df7-border-line df7-pt-5">
				<Shimmer w="df7-w-40" text="df7-text-[14px]" />
				<ul className="df7-m-0 df7-mt-3 df7-flex df7-list-none df7-flex-col df7-gap-2.5 df7-p-0">
					{ Array.from( { length: rows } ).map( ( _, index ) => (
						<li key={ index } className="df7-flex df7-items-center df7-gap-3">
							<Shimmer w="df7-w-40" text="df7-text-[15px]" className="df7-shrink-0" />
							<span className="df7-h-2 df7-flex-1 df7-animate-pulse df7-rounded-full df7-bg-stone-100" />
							<Shimmer w="df7-w-10" text="df7-text-[15px]" className="df7-shrink-0" />
						</li>
					) ) }
				</ul>
			</div>
		);
	}

	const most = Math.max( ...forms.map( ( form ) => form.count ) );

	return (
		<div className="df7-mt-6 df7-border-t df7-border-line df7-pt-5">
			<span className="df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">
				{ __( 'Where they came from', 'defer-forms-for-contact-form-7' ) }
			</span>
			<ul className="df7-m-0 df7-mt-3 df7-flex df7-list-none df7-flex-col df7-gap-2.5 df7-p-0">
				{ forms.map( ( form ) => (
					<li key={ form.form_id } className="df7-flex df7-items-center df7-gap-3">
						<a
							href={ `admin.php?page=df7-submissions&form=${ form.form_id }` }
							className="df7-w-40 df7-shrink-0 df7-truncate df7-text-[15px] df7-text-ink df7-no-underline hover:df7-underline"
							title={ form.title }
						>
							{ form.title }
						</a>
						<span className="df7-h-2 df7-flex-1 df7-overflow-hidden df7-rounded-full df7-bg-stone-100">
							<span
								className="df7-block df7-h-full df7-rounded-full df7-bg-ink"
								style={ { width: `${ Math.max( 4, ( form.count / most ) * 100 ) }%` } }
							/>
						</span>
						<span className="df7-w-10 df7-shrink-0 df7-text-right df7-text-[15px] df7-font-semibold df7-text-ink df7-tnum">
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
	<section className="df7-mt-8">
		<div className="df7-mb-3 df7-flex df7-items-baseline df7-justify-between">
			<h2 className="df7-m-0 df7-text-xl df7-font-bold df7-text-ink">{ __( 'Latest entries', 'defer-forms-for-contact-form-7' ) }</h2>
			<a
				href="admin.php?page=df7-submissions"
				className="df7-text-sm df7-font-semibold df7-text-ink df7-no-underline hover:df7-underline"
			>
				{ __( 'All entries', 'defer-forms-for-contact-form-7' ) }
			</a>
		</div>
		<ul className="df7-m-0 df7-list-none df7-overflow-hidden df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-0">
			{ loading
				? Array.from( { length: RECENT } ).map( ( _, index ) => (
					<li key={ index } className="df7-border-b df7-border-line last:df7-border-0">
						<div className="df7-flex df7-items-center df7-gap-4 df7-px-5 df7-py-3.5">
							<span className="df7-h-2 df7-w-2 df7-shrink-0 df7-animate-pulse df7-rounded-full df7-bg-stone-100" />
							<Shimmer w="df7-w-48" text="df7-text-[15px]" className="df7-min-w-0 df7-flex-1" />
							<Shimmer w="df7-w-28" text="df7-text-[14px]" className="df7-hidden df7-shrink-0 sm:df7-block" />
							<Shimmer w="df7-w-36" text="df7-text-[14px]" className="df7-shrink-0" />
						</div>
					</li>
				) )
				: items.map( ( item ) => (
				<li key={ item.id } className="df7-border-b df7-border-line last:df7-border-0">
					{ /* Named, so the entry opens rather than the visitor landing on
					     the same list whichever row they clicked. */ }
					<a
						href={ `admin.php?page=df7-submissions&entry=${ item.id }` }
						className="df7-flex df7-items-center df7-gap-4 df7-px-5 df7-py-3.5 df7-no-underline df7-transition-colors hover:df7-bg-stone-50/70"
					>
						{ ! item.read_at && (
							<span
								className="df7-h-2 df7-w-2 df7-shrink-0 df7-rounded-full df7-bg-ink"
								title={ __( 'Not read yet', 'defer-forms-for-contact-form-7' ) }
							/>
						) }
						<span
							className={ `df7-min-w-0 df7-flex-1 df7-truncate df7-text-[15px] df7-text-ink ${
								item.read_at ? 'df7-ml-5' : 'df7-font-semibold'
							}` }
						>
							{ summarise( item.data, __( 'No answers were filled in', 'defer-forms-for-contact-form-7' ) ) }
						</span>
						<span className="df7-hidden df7-shrink-0 df7-truncate df7-text-[14px] df7-text-stone-400 sm:df7-block sm:df7-max-w-[10rem]">
							{ titleFor( item.form_id ) }
						</span>
						<span className="df7-shrink-0 df7-text-[14px] df7-text-stone-400">{ when( item.created_at ) }</span>
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
	<div className="df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-px-6 df7-py-10 df7-text-center">
		<div className="df7-mx-auto df7-flex df7-h-14 df7-w-14 df7-items-center df7-justify-center df7-rounded-2xl df7-bg-accent-50 df7-text-accent">
			<Inbox className="df7-h-7 df7-w-7" />
		</div>
		<h2 className="df7-mb-0 df7-mt-4 df7-text-xl df7-font-bold df7-text-ink">
			{ __( 'No entries yet', 'defer-forms-for-contact-form-7' ) }
		</h2>
		<p className="df7-mx-auto df7-mb-0 df7-mt-2 df7-max-w-md df7-text-[15px] df7-text-stone-500">
			{ __(
				'Everything sent through your forms is kept here, with its attachments. Put a form on a page and the first one will show up.',
				'defer-forms-for-contact-form-7'
			) }
		</p>
		<div className="df7-mt-6 df7-flex df7-flex-wrap df7-justify-center df7-gap-3">
			<a
				href="admin.php?page=df7-templates"
				className="df7-inline-flex df7-h-10 df7-items-center df7-gap-2 df7-rounded-lg df7-bg-ink df7-px-4 df7-text-sm df7-font-semibold df7-text-white df7-no-underline"
			>
				<LayoutTemplate className="df7-h-4 df7-w-4" />
				{ __( 'Start from a template', 'defer-forms-for-contact-form-7' ) }
			</a>
			<a
				href="admin.php?page=df7-forms"
				className="df7-inline-flex df7-h-10 df7-items-center df7-gap-2 df7-rounded-lg df7-border df7-border-stroke df7-px-4 df7-text-sm df7-font-semibold df7-text-ink df7-no-underline hover:df7-bg-stone-50"
			>
				<FilePlus2 className="df7-h-4 df7-w-4" />
				{ __( 'Build one from scratch', 'defer-forms-for-contact-form-7' ) }
			</a>
		</div>
	</div>
);

const QuickLink = ( { href, icon: Icon, title, desc } ) => (
	<a
		href={ href }
		className="df7-group df7-flex df7-items-center df7-gap-4 df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-5 df7-no-underline df7-transition-colors hover:df7-border-stroke hover:df7-bg-stone-50"
	>
		<div className="df7-flex df7-h-11 df7-w-11 df7-shrink-0 df7-items-center df7-justify-center df7-rounded-xl df7-bg-stone-100 df7-text-stone-500 df7-transition-colors group-hover:df7-bg-accent-50 group-hover:df7-text-accent">
			<Icon className="df7-h-5 df7-w-5" />
		</div>
		<div className="df7-flex df7-flex-1 df7-flex-col df7-gap-0.5">
			<span className="df7-text-base df7-font-semibold df7-text-ink">{ title }</span>
			<span className="df7-text-[15px] df7-text-stone-500">{ desc }</span>
		</div>
		<ArrowRight className="df7-h-5 df7-w-5 df7-text-stone-400 df7-transition-transform group-hover:df7-translate-x-0.5 group-hover:df7-text-accent" />
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

		apiFetch( { path: 'df7/v1/submissions/mark-read', method: 'POST', data: { all: true } } )
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
			apiFetch( { path: 'df7/v1/stats' } ),
			// Submitted only. Spam has its own notice above with its own count,
			// and this list is what came in — a caught bot sitting among the
			// newest enquiries is the one thing it should not be showing.
			apiFetch( { path: `df7/v1/submissions?per_page=${ RECENT }&status=submitted` } ),
			apiFetch( { path: 'df7/v1/forms' } ),
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
				<div className="df7-mb-4 df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-4 df7-py-3 df7-text-sm df7-font-medium df7-text-red-700">
					{ error }
				</div>
			) }

			{ ! loading && ! stats.total ? (
				<NothingYet />
			) : (
				<>
					{ ( stats.unread > 0 || showSpam ) && (
						<div className="df7-mb-6 df7-flex df7-flex-col df7-gap-3">
							{ stats.unread > 0 && (
								<UnreadBanner count={ stats.unread } onMarkRead={ markAllRead } marking={ marking } />
							) }
							{ showSpam && <SpamNote count={ stats.spam } onDismiss={ dismissSpam } /> }
						</div>
					) }

					<section className="df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-6">
						<div className="df7-mb-6 df7-grid df7-grid-cols-3 df7-gap-6">
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

			<h2 className="df7-mb-3 df7-mt-8 df7-text-xl df7-font-bold df7-text-ink">
				{ __( 'Set things up', 'defer-forms-for-contact-form-7' ) }
			</h2>
			<div className="df7-grid df7-grid-cols-1 df7-gap-4 sm:df7-grid-cols-3">
				<QuickLink
					href="admin.php?page=df7-forms"
					icon={ FilePlus2 }
					title={ __( 'Forms', 'defer-forms-for-contact-form-7' ) }
					desc={ __( 'Build and edit them.', 'defer-forms-for-contact-form-7' ) }
				/>
				<QuickLink
					href="admin.php?page=df7-styling"
					icon={ Palette }
					title={ __( 'Styling', 'defer-forms-for-contact-form-7' ) }
					desc={ __( 'Colours, shape and spacing.', 'defer-forms-for-contact-form-7' ) }
				/>
				<QuickLink
					href="admin.php?page=df7-settings"
					icon={ SettingsIcon }
					title={ __( 'Settings', 'defer-forms-for-contact-form-7' ) }
					desc={ __( 'Spam, privacy and retention.', 'defer-forms-for-contact-form-7' ) }
				/>
			</div>
		</Page>
	);
};

const mount = document.getElementById( 'df7-dashboard-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
