import { createRoot, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Inbox,
	ArrowRight,
	ArrowUpRight,
	ArrowDownRight,
	ShieldAlert,
	Settings as SettingsIcon,
	CheckCheck,
	X,
	Palette,
	LayoutTemplate,
	FilePlus2,
	LifeBuoy,
	Lightbulb,
	BookOpen,
	ExternalLink,
	Pencil,
	Plus,
} from 'lucide-react';

import { Page, PageHeader } from '@shared/components/page';
import { Shimmer, btnGhost, btnPrimary } from '@shared/components/ui';
import { summarise } from '@shared/submission-fields';
import { ActivityChart } from './activity-chart.jsx';
import '@shared/styles/admin.css';

const RECENT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Two counts handed over by the page that rendered this (see Menu::hand_over):
 * how many forms have at least one entry, and how many forms exist at all.
 * Both describe the site before any fetch answers — the first proves an empty
 * site empty before the request comes back, the second sizes the "Your forms"
 * skeleton to the real row count instead of guessing three.
 */
const FORMS_WITH_ENTRIES = Number( window.deferformsDashboard?.forms ?? 0 );
const TOTAL_FORMS = Number( window.deferformsDashboard?.totalForms ?? 0 );

/** A MySQL UTC datetime, the way every other read of `created_at` here parses one. */
const parseUtc = ( mysqlUtc ) => new Date( mysqlUtc.replace( ' ', 'T' ) + 'Z' );

const when = ( mysqlUtc ) =>
	parseUtc( mysqlUtc ).toLocaleString( undefined, { dateStyle: 'medium', timeStyle: 'short' } );

/**
 * "2 mins ago", for a list that is meant to be glanced at rather than read.
 * The exact moment is not gone — it is the title attribute wherever this is
 * used, a hover away.
 */
const timeAgo = ( mysqlUtc ) => {
	const seconds = Math.max( 0, Math.floor( ( Date.now() - parseUtc( mysqlUtc ).getTime() ) / 1000 ) );

	if ( seconds < 60 ) {
		return __( 'just now', 'defer-forms-for-contact-form-7' );
	}

	const minutes = Math.floor( seconds / 60 );
	if ( minutes < 60 ) {
		return sprintf( _n( '%s min ago', '%s mins ago', minutes, 'defer-forms-for-contact-form-7' ), minutes );
	}

	const hours = Math.floor( minutes / 60 );
	if ( hours < 24 ) {
		return sprintf( _n( '%s hour ago', '%s hours ago', hours, 'defer-forms-for-contact-form-7' ), hours );
	}

	const days = Math.floor( hours / 24 );
	return sprintf( _n( '%s day ago', '%s days ago', days, 'defer-forms-for-contact-form-7' ), days );
};

/** The initial an avatar circle shows, for a submitter with no photo to show instead. */
const initial = ( name ) => ( name || '' ).trim().charAt( 0 ).toUpperCase() || '?';

/** A greeting for the time of day, so the page opens with a person rather than a report. */
const greeting = () => {
	const hour = new Date().getHours();

	if ( hour < 12 ) {
		return __( 'Good morning — here is what your forms have been up to.', 'defer-forms-for-contact-form-7' );
	}

	if ( hour < 18 ) {
		return __( 'Good afternoon — here is what your forms have been up to.', 'defer-forms-for-contact-form-7' );
	}

	return __( 'Good evening — here is what your forms have been up to.', 'defer-forms-for-contact-form-7' );
};

/**
 * One number and what changed under it.
 *
 * No icon and no tinted tile on the number itself — see the note this
 * replaced on the old three-figure row. Colour is spent only on the line
 * underneath, and only when it means something: green for a real gain, amber
 * for a real dip, plain grey where there is nothing to compare against yet.
 */
const StatTile = ( { label, value, loading, children } ) => (
	<div className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-card deferforms-p-5">
		<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">
			{ label }
		</span>
		<div className="deferforms-mt-2">
			{ loading ? (
				<Shimmer w="deferforms-w-16" text="deferforms-text-3xl deferforms-leading-none" />
			) : (
				<span className="deferforms-text-3xl deferforms-font-bold deferforms-leading-none deferforms-tracking-tight deferforms-text-ink deferforms-tnum">
					{ value.toLocaleString() }
				</span>
			) }
		</div>
		<div className="deferforms-mt-1.5 deferforms-min-h-[18px]">
			{ loading ? <Shimmer w="deferforms-w-24" text="deferforms-text-[14px]" /> : children }
		</div>
	</div>
);

/** Submissions in the last 30 days against the 30 before that. */
const PeriodChange = ( { period, previousPeriod } ) => {
	if ( ! previousPeriod ) {
		return (
			<span className="deferforms-text-[14px] deferforms-font-medium deferforms-text-stone-400">
				{ period > 0
					? __( 'new in the last 30 days', 'defer-forms-for-contact-form-7' )
					: __( 'nothing in the 30 days before', 'defer-forms-for-contact-form-7' ) }
			</span>
		);
	}

	const percent = Math.round( ( ( period - previousPeriod ) / previousPeriod ) * 100 );

	if ( 0 === percent ) {
		return (
			<span className="deferforms-text-[14px] deferforms-font-medium deferforms-text-stone-400">
				{ __( 'same as the 30 days before', 'defer-forms-for-contact-form-7' ) }
			</span>
		);
	}

	const Icon = percent > 0 ? ArrowUpRight : ArrowDownRight;
	const tone = percent > 0 ? 'deferforms-text-emerald-700' : 'deferforms-text-amber-600';

	return (
		<span className={ `deferforms-inline-flex deferforms-items-center deferforms-gap-1 deferforms-text-[14px] deferforms-font-medium ${ tone }` }>
			<Icon className="deferforms-h-3.5 deferforms-w-3.5" />
			{ sprintf(
				/* translators: %s: a percentage, without its sign. */
				__( '%s%% vs the 30 days before', 'defer-forms-for-contact-form-7' ),
				Math.abs( percent ).toLocaleString()
			) }
		</span>
	);
};

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
	<div className="deferforms-flex deferforms-items-center deferforms-gap-3 deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-card deferforms-px-5 deferforms-py-4">
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

/** The chart card: the 30-day bars and nothing else — the forms behind them get their own card below. */
const Activity = ( { days, loading } ) => (
	<section className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-card deferforms-p-6">
		<div className="deferforms-mb-4 deferforms-flex deferforms-items-baseline deferforms-justify-between">
			<h2 className="deferforms-m-0 deferforms-text-lg deferforms-font-bold deferforms-text-ink">
				{ __( 'Submission activity', 'defer-forms-for-contact-form-7' ) }
			</h2>
			<span className="deferforms-text-sm deferforms-text-stone-400">{ __( 'Last 30 days', 'defer-forms-for-contact-form-7' ) }</span>
		</div>
		<ActivityChart days={ days } loading={ loading } />
	</section>
);

/** The last few entries, condensed to a glance: who, which form, how long ago. */
const Recent = ( { items, titleFor, loading = false } ) => (
	<section className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-card deferforms-p-6">
		<div className="deferforms-mb-4 deferforms-flex deferforms-items-baseline deferforms-justify-between">
			<h2 className="deferforms-m-0 deferforms-text-lg deferforms-font-bold deferforms-text-ink">
				{ __( 'Recent submissions', 'defer-forms-for-contact-form-7' ) }
			</h2>
			<a
				href="admin.php?page=deferforms-submissions"
				className="deferforms-text-sm deferforms-font-semibold deferforms-text-ink deferforms-no-underline hover:deferforms-underline"
			>
				{ __( 'View all', 'defer-forms-for-contact-form-7' ) }
			</a>
		</div>
		<ul className="deferforms-m-0 deferforms-flex deferforms-list-none deferforms-flex-col deferforms-p-0">
			{ loading
				? Array.from( { length: RECENT } ).map( ( _, index ) => (
					<li key={ index } className="deferforms-flex deferforms-items-center deferforms-gap-3 deferforms-border-b deferforms-border-line deferforms-py-3 last:deferforms-border-0 last:deferforms-pb-0">
						<span className="deferforms-h-9 deferforms-w-9 deferforms-shrink-0 deferforms-animate-pulse deferforms-rounded-full deferforms-bg-stone-100" />
						<Shimmer w="deferforms-w-32" text="deferforms-text-[15px]" className="deferforms-min-w-0 deferforms-flex-1" />
						<Shimmer w="deferforms-w-14" text="deferforms-text-[14px]" className="deferforms-shrink-0" />
					</li>
				) )
				: items.map( ( item ) => {
					const name = summarise( item.data, __( 'No answers were filled in', 'defer-forms-for-contact-form-7' ) );

					return (
						<li key={ item.id } className="deferforms-border-b deferforms-border-line last:deferforms-border-0">
							{ /* Named, so the entry opens rather than the visitor landing on
							     the same list whichever row they clicked. */ }
							<a
								href={ `admin.php?page=deferforms-submissions&entry=${ item.id }` }
								className="deferforms-flex deferforms-items-center deferforms-gap-3 deferforms-py-3 deferforms-no-underline last:deferforms-pb-0"
							>
								<span className="deferforms-flex deferforms-h-9 deferforms-w-9 deferforms-shrink-0 deferforms-items-center deferforms-justify-center deferforms-rounded-full deferforms-bg-stone-100 deferforms-text-sm deferforms-font-semibold deferforms-text-stone-500">
									{ initial( name ) }
								</span>
								<span className="deferforms-min-w-0 deferforms-flex-1">
									<span
										className={ `deferforms-block deferforms-truncate deferforms-text-[15px] deferforms-text-ink ${
											item.read_at ? '' : 'deferforms-font-semibold'
										}` }
									>
										{ name }
									</span>
									<span className="deferforms-block deferforms-truncate deferforms-text-[14px] deferforms-text-stone-400">
										{ titleFor( item.form_id ) }
									</span>
								</span>
								<span className="deferforms-shrink-0 deferforms-text-[14px] deferforms-text-stone-400" title={ when( item.created_at ) }>
									{ timeAgo( item.created_at ) }
								</span>
							</a>
						</li>
					);
				} ) }
		</ul>
	</section>
);

/** Every form, whether or not it has entries — the count above only proves at least one does. */
const YourForms = ( { forms, loading = false } ) => (
	<section className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-card deferforms-p-6">
		<div className="deferforms-mb-4 deferforms-flex deferforms-items-baseline deferforms-justify-between">
			<h2 className="deferforms-m-0 deferforms-text-lg deferforms-font-bold deferforms-text-ink">
				{ __( 'Your forms', 'defer-forms-for-contact-form-7' ) }
			</h2>
			{ ! loading && (
				<span className="deferforms-text-sm deferforms-text-stone-400">
					{ sprintf(
						/* translators: %s: number of forms. */
						_n( '%s form', '%s forms', forms.length, 'defer-forms-for-contact-form-7' ),
						forms.length.toLocaleString()
					) }
				</span>
			) }
		</div>
		<ul className="deferforms-m-0 deferforms-flex deferforms-list-none deferforms-flex-col deferforms-p-0">
			{ loading
				? Array.from( { length: TOTAL_FORMS || 3 } ).map( ( _, index ) => (
					<li key={ index } className="deferforms-flex deferforms-items-center deferforms-justify-between deferforms-gap-3 deferforms-border-b deferforms-border-line deferforms-py-3 last:deferforms-border-0 last:deferforms-pb-0">
						<Shimmer w="deferforms-w-40" text="deferforms-text-[15px]" />
						<Shimmer w="deferforms-w-20" text="deferforms-text-[14px]" />
					</li>
				) )
				: forms.map( ( form ) => (
					<li
						key={ form.form_id }
						className="deferforms-flex deferforms-items-center deferforms-justify-between deferforms-gap-3 deferforms-border-b deferforms-border-line deferforms-py-3 last:deferforms-border-0 last:deferforms-pb-0"
					>
						<a
							href={ `admin.php?page=deferforms-submissions&form=${ form.form_id }` }
							className="deferforms-min-w-0 deferforms-flex-1 deferforms-truncate deferforms-text-[15px] deferforms-font-medium deferforms-text-ink deferforms-no-underline hover:deferforms-underline"
							title={ form.title }
						>
							{ form.title }
						</a>
						<span className="deferforms-shrink-0 deferforms-text-[14px] deferforms-text-stone-400">
							{ sprintf(
								/* translators: %s: number of submissions. */
								_n( '%s submission', '%s submissions', form.count, 'defer-forms-for-contact-form-7' ),
								form.count.toLocaleString()
							) }
						</span>
						<a
							href={ `admin.php?page=deferforms-builder&form=${ form.form_id }` }
							className="deferforms-inline-flex deferforms-shrink-0 deferforms-items-center deferforms-gap-1 deferforms-text-[14px] deferforms-font-semibold deferforms-text-ink deferforms-no-underline hover:deferforms-underline"
						>
							<Pencil className="deferforms-h-3.5 deferforms-w-3.5" />
							{ __( 'Edit', 'defer-forms-for-contact-form-7' ) }
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
	<div className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-card deferforms-px-6 deferforms-py-10 deferforms-text-center">
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

/** One row of the Quick actions card: an icon tile, a title and description, and where it goes. */
const ActionRow = ( { href, icon: Icon, title, desc, external = false } ) => (
	<a
		href={ href }
		{ ...( external ? { target: '_blank', rel: 'noopener noreferrer' } : {} ) }
		className="deferforms-group deferforms-flex deferforms-items-center deferforms-gap-3 deferforms-border-b deferforms-border-line deferforms-py-3 deferforms-no-underline last:deferforms-border-0 last:deferforms-pb-0"
	>
		<div className="deferforms-flex deferforms-h-9 deferforms-w-9 deferforms-shrink-0 deferforms-items-center deferforms-justify-center deferforms-rounded-lg deferforms-bg-stone-100 deferforms-text-stone-500 deferforms-transition-colors group-hover:deferforms-bg-accent-50 group-hover:deferforms-text-accent">
			<Icon className="deferforms-h-4 deferforms-w-4" />
		</div>
		<div className="deferforms-min-w-0 deferforms-flex-1">
			<span className="deferforms-block deferforms-truncate deferforms-text-[15px] deferforms-font-semibold deferforms-text-ink">{ title }</span>
			<span className="deferforms-block deferforms-truncate deferforms-text-[14px] deferforms-text-stone-500">{ desc }</span>
		</div>
		{ external
			? <ExternalLink className="deferforms-h-4 deferforms-w-4 deferforms-shrink-0 deferforms-text-stone-400 group-hover:deferforms-text-accent" />
			: <ArrowRight className="deferforms-h-4 deferforms-w-4 deferforms-shrink-0 deferforms-transition-transform deferforms-text-stone-400 group-hover:deferforms-translate-x-0.5 group-hover:deferforms-text-accent" /> }
	</a>
);

/** In-plugin shortcuts and community links, one card, one list — not six competing cards. */
const QuickActions = () => (
	<section className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-card deferforms-p-6">
		<h2 className="deferforms-mb-3 deferforms-text-lg deferforms-font-bold deferforms-text-ink">
			{ __( 'Quick actions', 'defer-forms-for-contact-form-7' ) }
		</h2>
		<div className="deferforms-flex deferforms-flex-col">
			<ActionRow
				href="admin.php?page=deferforms-forms"
				icon={ FilePlus2 }
				title={ __( 'Forms', 'defer-forms-for-contact-form-7' ) }
				desc={ __( 'Build and edit them.', 'defer-forms-for-contact-form-7' ) }
			/>
			<ActionRow
				href="admin.php?page=deferforms-styling"
				icon={ Palette }
				title={ __( 'Styling', 'defer-forms-for-contact-form-7' ) }
				desc={ __( 'Colours, shape and spacing.', 'defer-forms-for-contact-form-7' ) }
			/>
			<ActionRow
				href="admin.php?page=deferforms-settings"
				icon={ SettingsIcon }
				title={ __( 'Settings', 'defer-forms-for-contact-form-7' ) }
				desc={ __( 'Spam, privacy and retention.', 'defer-forms-for-contact-form-7' ) }
			/>
			<ActionRow
				href="https://rupashdas.github.io/defer-forms-for-contact-form-7/"
				external
				icon={ BookOpen }
				title={ __( 'Documentation', 'defer-forms-for-contact-form-7' ) }
				desc={ __( 'How every feature works, in one page.', 'defer-forms-for-contact-form-7' ) }
			/>
			<ActionRow
				href="https://wordpress.org/support/plugin/defer-forms-for-contact-form-7/"
				external
				icon={ LifeBuoy }
				title={ __( 'Get Support', 'defer-forms-for-contact-form-7' ) }
				desc={ __( 'Ask a question on the wordpress.org forum.', 'defer-forms-for-contact-form-7' ) }
			/>
			<ActionRow
				href="https://wordpress.org/support/plugin/defer-forms-for-contact-form-7/"
				external
				icon={ Lightbulb }
				title={ __( 'Request a Feature', 'defer-forms-for-contact-form-7' ) }
				desc={ __( 'Tell us what you would like to see next.', 'defer-forms-for-contact-form-7' ) }
			/>
		</div>
	</section>
);

const App = () => {
	const [ stats, setStats ] = useState( {
		total: 0,
		today: 0,
		week: 0,
		spam: 0,
		unread: 0,
		period: 0,
		previous_period: 0,
		needs_reply: 0,
		daily: [],
	} );
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
			// Every form, not just the ones with entries — "Your forms" draws a
			// row for each, and a form that has never been used is still one of
			// them.
			apiFetch( { path: 'deferforms/v1/forms/overview' } ),
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
	const titleFor = ( id ) =>
		forms.find( ( form ) => form.form_id === Number( id ) )?.title || __( 'Deleted form', 'defer-forms-for-contact-form-7' );

	const newForms = forms.filter(
		( form ) => form.created_at && parseUtc( form.created_at ).getTime() >= Date.now() - 30 * DAY_MS
	).length;

	/*
	 * FORMS_WITH_ENTRIES only counts forms with at least one submission (see
	 * Menu::hand_over), so it being zero already proves `stats.total` will be
	 * too — no need to wait for the fetch to know this site has nothing yet.
	 * Guessing "has data" here regardless of the count is what used to draw
	 * the full stats-and-chart skeleton on every empty site, then swap it for
	 * the small centered panel the moment the real, foreseeable zero arrived.
	 */
	const empty = loading ? 0 === FORMS_WITH_ENTRIES : 0 === stats.total;

	return (
		<Page>
			<PageHeader
				title={ __( 'Dashboard', 'defer-forms-for-contact-form-7' ) }
				subtitle={ greeting() }
				actions={
					<a href="admin.php?page=deferforms-forms" className={ btnPrimary }>
						<Plus className="deferforms-h-4 deferforms-w-4" />
						{ __( 'Create Form', 'defer-forms-for-contact-form-7' ) }
					</a>
				}
			/>

			{ error && (
				<div className="deferforms-mb-4 deferforms-rounded-lg deferforms-border deferforms-border-red-200 deferforms-bg-red-50 deferforms-px-4 deferforms-py-3 deferforms-text-sm deferforms-font-medium deferforms-text-red-700">
					{ error }
				</div>
			) }

			{ empty ? (
				<>
					<NothingYet />
					<div className="deferforms-mt-8">
						<QuickActions />
					</div>
				</>
			) : (
				<>
					<div className="deferforms-mb-6 deferforms-grid deferforms-grid-cols-2 deferforms-gap-4 lg:deferforms-grid-cols-4">
						<StatTile label={ __( 'Total Forms', 'defer-forms-for-contact-form-7' ) } value={ forms.length } loading={ loading }>
							{ newForms > 0
								? sprintf(
									/* translators: %s: number of forms created in the last 30 days. */
									__( '%s new in the last 30 days', 'defer-forms-for-contact-form-7' ),
									newForms.toLocaleString()
								)
								: __( 'No new forms in the last 30 days', 'defer-forms-for-contact-form-7' ) }
						</StatTile>

						<StatTile label={ __( 'Submissions', 'defer-forms-for-contact-form-7' ) } value={ stats.period } loading={ loading }>
							<PeriodChange period={ stats.period } previousPeriod={ stats.previous_period } />
						</StatTile>

						<StatTile label={ __( 'Unread', 'defer-forms-for-contact-form-7' ) } value={ stats.unread } loading={ loading }>
							<span className="deferforms-text-[14px] deferforms-font-medium deferforms-text-stone-400">
								{ stats.unread > 0
									? __( 'Waiting to be opened.', 'defer-forms-for-contact-form-7' )
									: __( 'All caught up.', 'defer-forms-for-contact-form-7' ) }
							</span>
						</StatTile>

						<StatTile label={ __( 'Needs a reply', 'defer-forms-for-contact-form-7' ) } value={ stats.needs_reply } loading={ loading }>
							<span className="deferforms-text-[14px] deferforms-font-medium deferforms-text-stone-400">
								{ stats.needs_reply > 0
									? __( 'Not yet answered.', 'defer-forms-for-contact-form-7' )
									: __( 'Nothing pending.', 'defer-forms-for-contact-form-7' ) }
							</span>
						</StatTile>
					</div>

					{ ( stats.unread > 0 || showSpam ) && (
						<div className="deferforms-mb-6 deferforms-flex deferforms-flex-col deferforms-gap-3">
							{ stats.unread > 0 && (
								<UnreadBanner count={ stats.unread } onMarkRead={ markAllRead } marking={ marking } />
							) }
							{ showSpam && <SpamNote count={ stats.spam } onDismiss={ dismissSpam } /> }
						</div>
					) }

					<div className="deferforms-mb-6 deferforms-grid deferforms-gap-6 lg:deferforms-grid-cols-[minmax(0,1fr)_360px]">
						<Activity days={ days } loading={ loading } />
						<Recent items={ recent } titleFor={ titleFor } loading={ loading } />
					</div>

					<div className="deferforms-grid deferforms-gap-6 lg:deferforms-grid-cols-[minmax(0,1fr)_360px]">
						<YourForms forms={ forms } loading={ loading } />
						<QuickActions />
					</div>
				</>
			) }
		</Page>
	);
};

const mount = document.getElementById( 'deferforms-dashboard-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
