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
const FORM_COUNT = Number( window.cf7eDashboard?.forms ?? 0 );

const Trend = ( { of } ) => {
	if ( ! of ) {
		return null;
	}

	if ( 'new' === of.direction ) {
		return (
			<span className="cf7e-text-[14px] cf7e-font-medium cf7e-text-stone-400">
				{ __( 'nothing the week before', 'essentials-for-contact-form-7' ) }
			</span>
		);
	}

	const Icon = { up: ArrowUpRight, down: ArrowDownRight, level: Minus }[ of.direction ];

	return (
		<span className="cf7e-inline-flex cf7e-items-center cf7e-gap-1 cf7e-text-[14px] cf7e-font-medium cf7e-text-stone-400">
			<Icon className="cf7e-h-3.5 cf7e-w-3.5" />
			{ 'level' === of.direction
				? __( 'same as the week before', 'essentials-for-contact-form-7' )
				: sprintf(
					/* translators: %1$s: a percentage, without its sign. */
					__( '%1$s%% on the week before', 'essentials-for-contact-form-7' ),
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
	<div className="cf7e-flex cf7e-flex-col cf7e-gap-1">
		<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">
			{ label }
		</span>
		{ loading ? (
			<Shimmer w="cf7e-w-16" text="cf7e-text-3xl cf7e-leading-none" />
		) : (
			<span className="cf7e-text-3xl cf7e-font-bold cf7e-leading-none cf7e-tracking-tight cf7e-text-ink cf7e-tnum">
				{ value.toLocaleString() }
			</span>
		) }
		{ /* The comparison line under This week. Reserved while loading, or the
		     figure is twenty pixels shorter than it is about to be. */ }
		{ loading ? <Shimmer w="cf7e-w-32" text="cf7e-text-[14px]" /> : children }
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
	<div className="cf7e-flex cf7e-items-center cf7e-gap-4 cf7e-rounded-2xl cf7e-border cf7e-border-accent-200 cf7e-bg-accent-50 cf7e-p-5">
		<div className="cf7e-relative cf7e-flex cf7e-h-12 cf7e-w-12 cf7e-shrink-0 cf7e-items-center cf7e-justify-center cf7e-rounded-xl cf7e-bg-ink cf7e-text-white">
			<Inbox className="cf7e-h-6 cf7e-w-6" />
			<span className="cf7e-absolute -cf7e-right-1 -cf7e-top-1 cf7e-flex cf7e-h-5 cf7e-min-w-[1.25rem] cf7e-items-center cf7e-justify-center cf7e-rounded-full cf7e-bg-red-600 cf7e-px-1 cf7e-text-[14px] cf7e-font-bold cf7e-leading-none cf7e-text-white cf7e-tnum">
				{ count > 99 ? '99+' : count }
			</span>
		</div>
		<div className="cf7e-flex cf7e-flex-1 cf7e-flex-col cf7e-gap-0.5">
			<span className="cf7e-text-base cf7e-font-semibold cf7e-text-ink">
				{ sprintf(
					/* translators: %s: number of new submissions. */
					_n( '%s entry you have not read', '%s entries you have not read', count, 'essentials-for-contact-form-7' ),
					count.toLocaleString()
				) }
			</span>
			<span className="cf7e-text-[15px] cf7e-text-stone-500">
				{ __( 'Opening one marks it read.', 'essentials-for-contact-form-7' ) }
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
			className={ `${ btnGhost } cf7e-shrink-0` }
		>
			<CheckCheck className="cf7e-h-4 cf7e-w-4 cf7e-text-stone-400" />
			{ marking ? __( 'Marking…', 'essentials-for-contact-form-7' ) : __( 'Mark all read', 'essentials-for-contact-form-7' ) }
		</button>

		<a
			href="admin.php?page=cf7-essentials-submissions&status=submitted"
			className="cf7e-group cf7e-inline-flex cf7e-shrink-0 cf7e-items-center cf7e-gap-1.5 cf7e-text-sm cf7e-font-semibold cf7e-text-ink cf7e-no-underline"
		>
			{ __( 'Read them', 'essentials-for-contact-form-7' ) }
			<ArrowRight className="cf7e-h-4 cf7e-w-4 cf7e-transition-transform group-hover:cf7e-translate-x-0.5" />
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
	<div className="cf7e-flex cf7e-items-center cf7e-gap-3 cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-px-5 cf7e-py-4">
		<ShieldAlert className="cf7e-h-5 cf7e-w-5 cf7e-shrink-0 cf7e-text-amber-600" />
		<span className="cf7e-flex-1 cf7e-text-[15px] cf7e-text-stone-500">
			{ sprintf(
				/* translators: %s: number of spam submissions. */
				_n( '%s spam entry was caught and kept out of your inbox.', '%s spam entries were caught and kept out of your inbox.', count, 'essentials-for-contact-form-7' ),
				count.toLocaleString()
			) }
		</span>
		<a href="admin.php?page=cf7-essentials-submissions&status=spam" className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink cf7e-no-underline">
			{ __( 'See them', 'essentials-for-contact-form-7' ) }
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
			aria-label={ __( 'Dismiss', 'essentials-for-contact-form-7' ) }
			title={ __( 'Hide this until more arrives', 'essentials-for-contact-form-7' ) }
			className="cf7e-flex cf7e-h-7 cf7e-w-7 cf7e-shrink-0 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-text-stone-400 cf7e-transition-colors hover:cf7e-bg-stone-100 hover:cf7e-text-ink"
		>
			<X className="cf7e-h-4 cf7e-w-4" />
		</button>
	</div>
);

/**
 * The spam count this browser has already been shown.
 *
 * Per person and per browser, which is what "I have seen this" means — it is
 * not a site setting and the next admin has not seen it.
 */
const SEEN_SPAM = 'cf7e-spam-seen';

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
			<div className="cf7e-mt-6 cf7e-border-t cf7e-border-line cf7e-pt-5">
				<Shimmer w="cf7e-w-40" text="cf7e-text-[14px]" />
				<ul className="cf7e-m-0 cf7e-mt-3 cf7e-flex cf7e-list-none cf7e-flex-col cf7e-gap-2.5 cf7e-p-0">
					{ Array.from( { length: rows } ).map( ( _, index ) => (
						<li key={ index } className="cf7e-flex cf7e-items-center cf7e-gap-3">
							<Shimmer w="cf7e-w-40" text="cf7e-text-[15px]" className="cf7e-shrink-0" />
							<span className="cf7e-h-2 cf7e-flex-1 cf7e-animate-pulse cf7e-rounded-full cf7e-bg-stone-100" />
							<Shimmer w="cf7e-w-10" text="cf7e-text-[15px]" className="cf7e-shrink-0" />
						</li>
					) ) }
				</ul>
			</div>
		);
	}

	const most = Math.max( ...forms.map( ( form ) => form.count ) );

	return (
		<div className="cf7e-mt-6 cf7e-border-t cf7e-border-line cf7e-pt-5">
			<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">
				{ __( 'Where they came from', 'essentials-for-contact-form-7' ) }
			</span>
			<ul className="cf7e-m-0 cf7e-mt-3 cf7e-flex cf7e-list-none cf7e-flex-col cf7e-gap-2.5 cf7e-p-0">
				{ forms.map( ( form ) => (
					<li key={ form.form_id } className="cf7e-flex cf7e-items-center cf7e-gap-3">
						<a
							href={ `admin.php?page=cf7-essentials-submissions&form=${ form.form_id }` }
							className="cf7e-w-40 cf7e-shrink-0 cf7e-truncate cf7e-text-[15px] cf7e-text-ink cf7e-no-underline hover:cf7e-underline"
							title={ form.title }
						>
							{ form.title }
						</a>
						<span className="cf7e-h-2 cf7e-flex-1 cf7e-overflow-hidden cf7e-rounded-full cf7e-bg-stone-100">
							<span
								className="cf7e-block cf7e-h-full cf7e-rounded-full cf7e-bg-ink"
								style={ { width: `${ Math.max( 4, ( form.count / most ) * 100 ) }%` } }
							/>
						</span>
						<span className="cf7e-w-10 cf7e-shrink-0 cf7e-text-right cf7e-text-[15px] cf7e-font-semibold cf7e-text-ink cf7e-tnum">
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
	<section className="cf7e-mt-8">
		<div className="cf7e-mb-3 cf7e-flex cf7e-items-baseline cf7e-justify-between">
			<h2 className="cf7e-m-0 cf7e-text-xl cf7e-font-bold cf7e-text-ink">{ __( 'Latest entries', 'essentials-for-contact-form-7' ) }</h2>
			<a
				href="admin.php?page=cf7-essentials-submissions"
				className="cf7e-text-sm cf7e-font-semibold cf7e-text-ink cf7e-no-underline hover:cf7e-underline"
			>
				{ __( 'All entries', 'essentials-for-contact-form-7' ) }
			</a>
		</div>
		<ul className="cf7e-m-0 cf7e-list-none cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-0">
			{ loading
				? Array.from( { length: RECENT } ).map( ( _, index ) => (
					<li key={ index } className="cf7e-border-b cf7e-border-line last:cf7e-border-0">
						<div className="cf7e-flex cf7e-items-center cf7e-gap-4 cf7e-px-5 cf7e-py-3.5">
							<span className="cf7e-h-2 cf7e-w-2 cf7e-shrink-0 cf7e-animate-pulse cf7e-rounded-full cf7e-bg-stone-100" />
							<Shimmer w="cf7e-w-48" text="cf7e-text-[15px]" className="cf7e-min-w-0 cf7e-flex-1" />
							<Shimmer w="cf7e-w-28" text="cf7e-text-[14px]" className="cf7e-hidden cf7e-shrink-0 sm:cf7e-block" />
							<Shimmer w="cf7e-w-36" text="cf7e-text-[14px]" className="cf7e-shrink-0" />
						</div>
					</li>
				) )
				: items.map( ( item ) => (
				<li key={ item.id } className="cf7e-border-b cf7e-border-line last:cf7e-border-0">
					{ /* Named, so the entry opens rather than the visitor landing on
					     the same list whichever row they clicked. */ }
					<a
						href={ `admin.php?page=cf7-essentials-submissions&entry=${ item.id }` }
						className="cf7e-flex cf7e-items-center cf7e-gap-4 cf7e-px-5 cf7e-py-3.5 cf7e-no-underline cf7e-transition-colors hover:cf7e-bg-stone-50/70"
					>
						{ ! item.read_at && (
							<span
								className="cf7e-h-2 cf7e-w-2 cf7e-shrink-0 cf7e-rounded-full cf7e-bg-ink"
								title={ __( 'Not read yet', 'essentials-for-contact-form-7' ) }
							/>
						) }
						<span
							className={ `cf7e-min-w-0 cf7e-flex-1 cf7e-truncate cf7e-text-[15px] cf7e-text-ink ${
								item.read_at ? 'cf7e-ml-5' : 'cf7e-font-semibold'
							}` }
						>
							{ summarise( item.data, __( 'No answers were filled in', 'essentials-for-contact-form-7' ) ) }
						</span>
						<span className="cf7e-hidden cf7e-shrink-0 cf7e-truncate cf7e-text-[14px] cf7e-text-stone-400 sm:cf7e-block sm:cf7e-max-w-[10rem]">
							{ titleFor( item.form_id ) }
						</span>
						<span className="cf7e-shrink-0 cf7e-text-[14px] cf7e-text-stone-400">{ when( item.created_at ) }</span>
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
	<div className="cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-px-6 cf7e-py-10 cf7e-text-center">
		<div className="cf7e-mx-auto cf7e-flex cf7e-h-14 cf7e-w-14 cf7e-items-center cf7e-justify-center cf7e-rounded-2xl cf7e-bg-accent-50 cf7e-text-accent">
			<Inbox className="cf7e-h-7 cf7e-w-7" />
		</div>
		<h2 className="cf7e-mb-0 cf7e-mt-4 cf7e-text-xl cf7e-font-bold cf7e-text-ink">
			{ __( 'No entries yet', 'essentials-for-contact-form-7' ) }
		</h2>
		<p className="cf7e-mx-auto cf7e-mb-0 cf7e-mt-2 cf7e-max-w-md cf7e-text-[15px] cf7e-text-stone-500">
			{ __(
				'Everything sent through your forms is kept here, with its attachments. Put a form on a page and the first one will show up.',
				'essentials-for-contact-form-7'
			) }
		</p>
		<div className="cf7e-mt-6 cf7e-flex cf7e-flex-wrap cf7e-justify-center cf7e-gap-3">
			<a
				href="admin.php?page=cf7-essentials-templates"
				className="cf7e-inline-flex cf7e-h-10 cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-bg-ink cf7e-px-4 cf7e-text-sm cf7e-font-semibold cf7e-text-white cf7e-no-underline"
			>
				<LayoutTemplate className="cf7e-h-4 cf7e-w-4" />
				{ __( 'Start from a template', 'essentials-for-contact-form-7' ) }
			</a>
			<a
				href="admin.php?page=cf7-essentials-forms"
				className="cf7e-inline-flex cf7e-h-10 cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-px-4 cf7e-text-sm cf7e-font-semibold cf7e-text-ink cf7e-no-underline hover:cf7e-bg-stone-50"
			>
				<FilePlus2 className="cf7e-h-4 cf7e-w-4" />
				{ __( 'Build one from scratch', 'essentials-for-contact-form-7' ) }
			</a>
		</div>
	</div>
);

const QuickLink = ( { href, icon: Icon, title, desc } ) => (
	<a
		href={ href }
		className="cf7e-group cf7e-flex cf7e-items-center cf7e-gap-4 cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-5 cf7e-no-underline cf7e-transition-colors hover:cf7e-border-stroke hover:cf7e-bg-stone-50"
	>
		<div className="cf7e-flex cf7e-h-11 cf7e-w-11 cf7e-shrink-0 cf7e-items-center cf7e-justify-center cf7e-rounded-xl cf7e-bg-stone-100 cf7e-text-stone-500 cf7e-transition-colors group-hover:cf7e-bg-accent-50 group-hover:cf7e-text-accent">
			<Icon className="cf7e-h-5 cf7e-w-5" />
		</div>
		<div className="cf7e-flex cf7e-flex-1 cf7e-flex-col cf7e-gap-0.5">
			<span className="cf7e-text-base cf7e-font-semibold cf7e-text-ink">{ title }</span>
			<span className="cf7e-text-[15px] cf7e-text-stone-500">{ desc }</span>
		</div>
		<ArrowRight className="cf7e-h-5 cf7e-w-5 cf7e-text-stone-400 cf7e-transition-transform group-hover:cf7e-translate-x-0.5 group-hover:cf7e-text-accent" />
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

		apiFetch( { path: 'cf7e/v1/submissions/mark-read', method: 'POST', data: { all: true } } )
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
			apiFetch( { path: 'cf7e/v1/stats' } ),
			// Submitted only. Spam has its own notice above with its own count,
			// and this list is what came in — a caught bot sitting among the
			// newest enquiries is the one thing it should not be showing.
			apiFetch( { path: `cf7e/v1/submissions?per_page=${ RECENT }&status=submitted` } ),
			apiFetch( { path: 'cf7e/v1/forms' } ),
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
		forms.find( ( form ) => form.form_id === Number( id ) )?.title || __( 'Deleted form', 'essentials-for-contact-form-7' );

	return (
		<Page>
			<PageHeader
				title={ __( 'Dashboard', 'essentials-for-contact-form-7' ) }
				subtitle={ __( 'What your forms have been receiving.', 'essentials-for-contact-form-7' ) }
			/>

			{ error && (
				<div className="cf7e-mb-4 cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">
					{ error }
				</div>
			) }

			{ ! loading && ! stats.total ? (
				<NothingYet />
			) : (
				<>
					{ ( stats.unread > 0 || showSpam ) && (
						<div className="cf7e-mb-6 cf7e-flex cf7e-flex-col cf7e-gap-3">
							{ stats.unread > 0 && (
								<UnreadBanner count={ stats.unread } onMarkRead={ markAllRead } marking={ marking } />
							) }
							{ showSpam && <SpamNote count={ stats.spam } onDismiss={ dismissSpam } /> }
						</div>
					) }

					<section className="cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-6">
						<div className="cf7e-mb-6 cf7e-grid cf7e-grid-cols-3 cf7e-gap-6">
							<Figure label={ __( 'Today', 'essentials-for-contact-form-7' ) } value={ stats.today } loading={ loading } />
							<Figure label={ __( 'This week', 'essentials-for-contact-form-7' ) } value={ stats.week } loading={ loading }>
								{ ! loading && <Trend of={ trend( days ) } /> }
							</Figure>
							<Figure label={ __( 'All time', 'essentials-for-contact-form-7' ) } value={ stats.total } loading={ loading } />
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

			<h2 className="cf7e-mb-3 cf7e-mt-8 cf7e-text-xl cf7e-font-bold cf7e-text-ink">
				{ __( 'Set things up', 'essentials-for-contact-form-7' ) }
			</h2>
			<div className="cf7e-grid cf7e-grid-cols-1 cf7e-gap-4 sm:cf7e-grid-cols-3">
				<QuickLink
					href="admin.php?page=cf7-essentials-forms"
					icon={ FilePlus2 }
					title={ __( 'Forms', 'essentials-for-contact-form-7' ) }
					desc={ __( 'Build and edit them.', 'essentials-for-contact-form-7' ) }
				/>
				<QuickLink
					href="admin.php?page=cf7-essentials-styling"
					icon={ Palette }
					title={ __( 'Styling', 'essentials-for-contact-form-7' ) }
					desc={ __( 'Colours, shape and spacing.', 'essentials-for-contact-form-7' ) }
				/>
				<QuickLink
					href="admin.php?page=cf7-essentials-settings"
					icon={ SettingsIcon }
					title={ __( 'Settings', 'essentials-for-contact-form-7' ) }
					desc={ __( 'Spam, privacy and retention.', 'essentials-for-contact-form-7' ) }
				/>
			</div>
		</Page>
	);
};

const mount = document.getElementById( 'cf7e-dashboard-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
