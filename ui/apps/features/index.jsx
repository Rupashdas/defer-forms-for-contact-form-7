import { createRoot, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import {
	Database,
	Layout,
	Paperclip,
	Reply,
	Grid3x3,
	ListOrdered,
	GitBranch,
	ExternalLink,
	LayoutTemplate,
	Palette,
	TextCursorInput,
	Shield,
	Lock,
	Send,
	Bot,
	Blocks,
	ArrowDownUp,
	History,
	BarChart3,
	Split,
	CreditCard,
	Users,
	Webhook,
	PenTool,
	FileText,
	Save,
	RefreshCw,
	GitFork,
	Workflow,
	MessageSquare,
	Tag,
	Sparkles,
	Boxes,
	Check,
} from 'lucide-react';

import { Page, PageHeader } from '@shared/components/page';
import { Shimmer } from '@shared/components/ui';
import '@shared/styles/admin.css';

// No link to Pro. There is nowhere to send anybody yet, and a button that
// opens a placeholder domain is worse than no button at all — it reads as a
// fault in the plugin rather than a thing that has not been built yet. When Pro
// exists, put an anchor back in the "In Pro" header below.

const ICONS = {
	database:            Database,
	paperclip:           Paperclip,
	reply:               Reply,
	layout:              Layout,
	grid:                Grid3x3,
	'list-ordered':      ListOrdered,
	'git-branch':        GitBranch,
	'external-link':     ExternalLink,
	'layout-template':   LayoutTemplate,
	palette:             Palette,
	'text-cursor-input': TextCursorInput,
	shield:              Shield,
	lock:                Lock,
	send:                Send,
	bot:                 Bot,
	blocks:              Blocks,
	'arrow-down-up':     ArrowDownUp,
	history:             History,
	'bar-chart':         BarChart3,
	split:               Split,
	'credit-card':       CreditCard,
	users:               Users,
	webhook:             Webhook,
	'pen-tool':          PenTool,
	'file-text':         FileText,
	save:                Save,
	'refresh-cw':        RefreshCw,
	'git-fork':          GitFork,
	workflow:            Workflow,
	'message-square':    MessageSquare,
	tag:                 Tag,
};

/**
 * A feature you already have.
 *
 * No switch. Every one of these is on — see Modules\Registry for why the
 * switches went.
 */
const LiteCard = ( { mod } ) => {
	const Icon = ICONS[ mod.icon ] || Layout;

	return (
		<div className="df7-flex df7-h-full df7-flex-col df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-5 df7-transition-colors hover:df7-border-accent-200">
			<div className="df7-mb-3 df7-flex df7-items-start df7-justify-between">
				<div className="df7-flex df7-h-11 df7-w-11 df7-items-center df7-justify-center df7-rounded-xl df7-bg-accent-50 df7-text-accent">
					<Icon className="df7-h-5 df7-w-5" />
				</div>
				<span className="df7-inline-flex df7-items-center df7-gap-1 df7-rounded-full df7-bg-emerald-50 df7-px-2 df7-py-0.5 df7-text-[14px] df7-font-bold df7-uppercase df7-tracking-wide df7-text-emerald-700">
					<Check className="df7-h-3 df7-w-3" />
					{ __( 'Included', 'defer-forms-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="df7-m-0 df7-text-base df7-font-semibold df7-text-ink">{ mod.name }</h3>
			<p className="df7-mb-0 df7-mt-1.5 df7-text-[14px] df7-leading-relaxed df7-text-stone-500">{ mod.description }</p>
		</div>
	);
};

/** Written down so the list is honest about what is not built yet. */
const PlannedCard = ( { mod } ) => {
	const Icon = ICONS[ mod.icon ] || Layout;

	return (
		<div className="df7-flex df7-h-full df7-flex-col df7-rounded-2xl df7-border df7-border-dashed df7-border-line df7-bg-white df7-p-5">
			<div className="df7-mb-3 df7-flex df7-items-start df7-justify-between">
				<div className="df7-flex df7-h-11 df7-w-11 df7-items-center df7-justify-center df7-rounded-xl df7-bg-stone-100 df7-text-stone-400">
					<Icon className="df7-h-5 df7-w-5" />
				</div>
				<span className="df7-rounded-full df7-bg-stone-100 df7-px-2.5 df7-py-1 df7-text-[14px] df7-font-bold df7-uppercase df7-tracking-wide df7-text-stone-500">
					{ __( 'Coming soon', 'defer-forms-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="df7-m-0 df7-text-base df7-font-semibold df7-text-ink">{ mod.name }</h3>
			<p className="df7-mb-0 df7-mt-1.5 df7-text-[14px] df7-leading-relaxed df7-text-stone-500">{ mod.description }</p>
		</div>
	);
};

const ProCard = ( { mod } ) => {
	const Icon = ICONS[ mod.icon ] || Layout;

	return (
		<div className="df7-flex df7-h-full df7-flex-col df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-5 df7-transition-colors hover:df7-border-amber-200">
			<div className="df7-mb-3 df7-flex df7-items-start df7-justify-between">
				<div className="df7-flex df7-h-11 df7-w-11 df7-items-center df7-justify-center df7-rounded-xl df7-bg-amber-50 df7-text-amber-600">
					<Icon className="df7-h-5 df7-w-5" />
				</div>
				<span className="df7-inline-flex df7-items-center df7-gap-1 df7-rounded-full df7-bg-amber-100 df7-px-2 df7-py-0.5 df7-text-[14px] df7-font-bold df7-uppercase df7-tracking-wide df7-text-amber-700">
					<Sparkles className="df7-h-3 df7-w-3" />
					{ __( 'Pro', 'defer-forms-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="df7-m-0 df7-text-base df7-font-semibold df7-text-ink">{ mod.name }</h3>
			<p className="df7-mb-0 df7-mt-1.5 df7-text-[14px] df7-leading-relaxed df7-text-stone-500">{ mod.description }</p>

			<div className="df7-mt-4 df7-flex df7-items-center df7-gap-1.5 df7-text-[14px] df7-font-semibold df7-text-amber-600">
				<Lock className="df7-h-3.5 df7-w-3.5" />
				{ __( 'Coming in Pro', 'defer-forms-for-contact-form-7' ) }
			</div>
		</div>
	);
};

/**
 * A section's heading and the line under it.
 *
 * Pulled out because the loading state has to draw the same one. It used to
 * draw no headings at all — one unlabelled grid of six cards, which the page
 * then replaced with three labelled sections, so the screen rearranged itself
 * on load instead of filling in.
 */
const SectionHead = ( { title, note } ) => (
	<div className="df7-mb-4 df7-flex df7-items-baseline df7-gap-2.5">
		<h2 className="df7-m-0 df7-text-xl df7-font-bold df7-text-ink">{ title }</h2>
		<span className="df7-text-sm df7-text-stone-400">{ note }</span>
	</div>
);

/**
 * How many features are in each section, handed over by the page that rendered
 * this. The catalogue is a fixed list in PHP and nothing about it depends on
 * the site, so the loading state can be the right size rather than a guess.
 */
const HANDED_OVER = Array.isArray( window.df7Features?.items ) ? window.df7Features.items : null;

/**
 * The Pro section's header, which is a banner rather than a heading line.
 *
 * Its own component for the same reason as SectionHead: the loading state has
 * to draw it, and an amber box 26px taller than a plain heading is not
 * something to reproduce by eye in two places.
 */
const ProHead = () => (
	<div className="df7-mb-4 df7-flex df7-flex-wrap df7-items-center df7-justify-between df7-gap-3 df7-rounded-2xl df7-border df7-border-amber-200 df7-bg-amber-50/60 df7-px-5 df7-py-4">
		<div className="df7-flex df7-flex-col">
			<h2 className="df7-m-0 df7-text-xl df7-font-bold df7-text-ink">
				{ __( 'In Pro', 'defer-forms-for-contact-form-7' ) }
			</h2>
			<p className="df7-mb-0 df7-mt-0.5 df7-text-[14px] df7-text-stone-500">
				{ __( 'Everything above, plus these.', 'defer-forms-for-contact-form-7' ) }
			</p>
		</div>
	</div>
);

const SectionGrid = ( { children } ) => (
	<div className="df7-grid df7-grid-cols-1 df7-gap-4 md:df7-grid-cols-2 xl:df7-grid-cols-3">{ children }</div>
);

/**
 * A feature card, before the catalogue arrives.
 *
 * Element for element with the cards above: an h3 for the name and a <p> for
 * the description, each bar taking its height from the line it stands in for.
 * The two 12px bars this used to draw were 16px short of the 23px lines they
 * replaced, and six cards a row made the whole grid step down as it loaded.
 */
const SkeletonCard = () => (
	<div className="df7-flex df7-h-full df7-flex-col df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-5">
		<div className="df7-mb-3 df7-flex df7-items-start df7-justify-between">
			<div className="df7-h-11 df7-w-11 df7-animate-pulse df7-rounded-xl df7-bg-stone-100" />
			<div className="df7-h-6 df7-w-11 df7-animate-pulse df7-rounded-full df7-bg-stone-100" />
		</div>

		<Shimmer as="h3" w="df7-w-1/2" text="df7-text-base" />

		<p className="df7-mb-0 df7-mt-1.5 df7-text-[14px] df7-leading-relaxed">
			<Shimmer w="df7-w-full" />
			<Shimmer w="df7-w-3/4" />
		</p>
	</div>
);

const App = () => {
	const [ features, setFeatures ] = useState( HANDED_OVER || [] );
	const [ loading, setLoading ]   = useState( ! HANDED_OVER );
	const [ error, setError ]       = useState( null );

	// Only when the page did not carry the catalogue — a cached page whose
	// inline script never ran. Everywhere else this screen has its content
	// before React starts, so there is nothing to wait for and nothing to draw
	// a skeleton of.
	useEffect( () => {
		if ( HANDED_OVER ) {
			return;
		}

		let live = true;
		apiFetch( { path: 'df7/v1/modules' } )
			.then( ( res ) => live && setFeatures( res ) )
			.catch( ( err ) => live && setError( err.message ) )
			.finally( () => live && setLoading( false ) );
		return () => { live = false; };
	}, [] );

	/*
	 * No search box.
	 *
	 * There were thirteen cards you have and a dozen you do not, and a search
	 * box above a list that short says the list is long — an instruction to look
	 * for something rather than to read. This page is a catalogue: the reading
	 * IS the point, and scrolling it takes a moment.
	 */
	const withStatus = ( status ) => features.filter( ( feature ) => status === feature.status );
	const lite       = withStatus( 'lite' );
	const planned    = withStatus( 'planned' );
	const pro        = withStatus( 'pro' );

	const included = features.filter( ( feature ) => 'lite' === feature.status ).length;

	const renderBody = () => {
		// Reached only on the fallback path above, where the catalogue has to be
		// fetched. Nothing here can match what arrives — the cards are as tall as
		// their descriptions wrap — so it draws one honest grid rather than
		// pretending to know the shape.
		if ( loading ) {
			return (
				<section>
					<SectionHead
						title={ __( 'What you have', 'defer-forms-for-contact-form-7' ) }
						note={ <Shimmer w="df7-w-32" text="df7-text-sm" /> }
					/>
					<SectionGrid>
						{ Array.from( { length: 6 } ).map( ( _, i ) => <SkeletonCard key={ i } /> ) }
					</SectionGrid>
				</section>
			);
		}

		if ( 0 === lite.length && 0 === planned.length && 0 === pro.length ) {
			return (
				<div className="df7-flex df7-flex-col df7-items-center df7-justify-center df7-py-24 df7-text-center">
					<div className="df7-mb-4 df7-flex df7-h-16 df7-w-16 df7-items-center df7-justify-center df7-rounded-2xl df7-bg-stone-50 df7-text-stone-400">
						<Boxes className="df7-h-8 df7-w-8" />
					</div>
					<h3 className="df7-m-0 df7-text-lg df7-font-bold df7-text-ink">
						{ __( 'The feature list could not be loaded', 'defer-forms-for-contact-form-7' ) }
					</h3>
					<p className="df7-mt-1 df7-text-sm df7-text-stone-500">
						{ __( 'Reload the page to try again.', 'defer-forms-for-contact-form-7' ) }
					</p>
				</div>
			);
		}

		return (
			<>
				{ lite.length > 0 && (
					<section className="df7-mb-10">
						<SectionHead
							title={ __( 'What you have', 'defer-forms-for-contact-form-7' ) }
							note={ sprintf(
									/* translators: %d: number of features included. */
									__( '%d features, all active', 'defer-forms-for-contact-form-7' ),
									included
								) }
						/>
						<SectionGrid>
							{ lite.map( ( feature ) => <LiteCard key={ feature.slug } mod={ feature } /> ) }
						</SectionGrid>
					</section>
				) }

				{ planned.length > 0 && (
					<section className="df7-mb-10">
						<SectionHead
							title={ __( 'On the way', 'defer-forms-for-contact-form-7' ) }
							note={ __( 'Planned for a future release.', 'defer-forms-for-contact-form-7' ) }
						/>
						<SectionGrid>
							{ planned.map( ( feature ) => <PlannedCard key={ feature.slug } mod={ feature } /> ) }
						</SectionGrid>
					</section>
				) }

				{ pro.length > 0 && (
					<section>
						<ProHead />
						<SectionGrid>
							{ pro.map( ( feature ) => <ProCard key={ feature.slug } mod={ feature } /> ) }
						</SectionGrid>
					</section>
				) }
			</>
		);
	};

	return (
		<Page>
			<PageHeader
				title={ __( 'Features', 'defer-forms-for-contact-form-7' ) }
				subtitle={ __( 'Everything this plugin does. All of it is on — there is nothing to switch.', 'defer-forms-for-contact-form-7' ) }
			/>

			{ error && (
				<div className="df7-mb-4 df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-4 df7-py-3 df7-text-sm df7-font-medium df7-text-red-700">
					{ error }
				</div>
			) }

			{ renderBody() }
		</Page>
	);
};

const mount = document.getElementById( 'df7-features-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
