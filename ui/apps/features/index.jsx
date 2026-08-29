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
		<div className="cf7e-flex cf7e-h-full cf7e-flex-col cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-5 cf7e-transition-colors hover:cf7e-border-accent-200">
			<div className="cf7e-mb-3 cf7e-flex cf7e-items-start cf7e-justify-between">
				<div className="cf7e-flex cf7e-h-11 cf7e-w-11 cf7e-items-center cf7e-justify-center cf7e-rounded-xl cf7e-bg-accent-50 cf7e-text-accent">
					<Icon className="cf7e-h-5 cf7e-w-5" />
				</div>
				<span className="cf7e-inline-flex cf7e-items-center cf7e-gap-1 cf7e-rounded-full cf7e-bg-emerald-50 cf7e-px-2 cf7e-py-0.5 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wide cf7e-text-emerald-700">
					<Check className="cf7e-h-3 cf7e-w-3" />
					{ __( 'Included', 'essentials-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="cf7e-m-0 cf7e-text-base cf7e-font-semibold cf7e-text-ink">{ mod.name }</h3>
			<p className="cf7e-mb-0 cf7e-mt-1.5 cf7e-text-[14px] cf7e-leading-relaxed cf7e-text-stone-500">{ mod.description }</p>
		</div>
	);
};

/** Written down so the list is honest about what is not built yet. */
const PlannedCard = ( { mod } ) => {
	const Icon = ICONS[ mod.icon ] || Layout;

	return (
		<div className="cf7e-flex cf7e-h-full cf7e-flex-col cf7e-rounded-2xl cf7e-border cf7e-border-dashed cf7e-border-line cf7e-bg-white cf7e-p-5">
			<div className="cf7e-mb-3 cf7e-flex cf7e-items-start cf7e-justify-between">
				<div className="cf7e-flex cf7e-h-11 cf7e-w-11 cf7e-items-center cf7e-justify-center cf7e-rounded-xl cf7e-bg-stone-100 cf7e-text-stone-400">
					<Icon className="cf7e-h-5 cf7e-w-5" />
				</div>
				<span className="cf7e-rounded-full cf7e-bg-stone-100 cf7e-px-2.5 cf7e-py-1 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wide cf7e-text-stone-500">
					{ __( 'Coming soon', 'essentials-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="cf7e-m-0 cf7e-text-base cf7e-font-semibold cf7e-text-ink">{ mod.name }</h3>
			<p className="cf7e-mb-0 cf7e-mt-1.5 cf7e-text-[14px] cf7e-leading-relaxed cf7e-text-stone-500">{ mod.description }</p>
		</div>
	);
};

const ProCard = ( { mod } ) => {
	const Icon = ICONS[ mod.icon ] || Layout;

	return (
		<div className="cf7e-flex cf7e-h-full cf7e-flex-col cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-5 cf7e-transition-colors hover:cf7e-border-amber-200">
			<div className="cf7e-mb-3 cf7e-flex cf7e-items-start cf7e-justify-between">
				<div className="cf7e-flex cf7e-h-11 cf7e-w-11 cf7e-items-center cf7e-justify-center cf7e-rounded-xl cf7e-bg-amber-50 cf7e-text-amber-600">
					<Icon className="cf7e-h-5 cf7e-w-5" />
				</div>
				<span className="cf7e-inline-flex cf7e-items-center cf7e-gap-1 cf7e-rounded-full cf7e-bg-amber-100 cf7e-px-2 cf7e-py-0.5 cf7e-text-[14px] cf7e-font-bold cf7e-uppercase cf7e-tracking-wide cf7e-text-amber-700">
					<Sparkles className="cf7e-h-3 cf7e-w-3" />
					{ __( 'Pro', 'essentials-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="cf7e-m-0 cf7e-text-base cf7e-font-semibold cf7e-text-ink">{ mod.name }</h3>
			<p className="cf7e-mb-0 cf7e-mt-1.5 cf7e-text-[14px] cf7e-leading-relaxed cf7e-text-stone-500">{ mod.description }</p>

			<div className="cf7e-mt-4 cf7e-flex cf7e-items-center cf7e-gap-1.5 cf7e-text-[14px] cf7e-font-semibold cf7e-text-amber-600">
				<Lock className="cf7e-h-3.5 cf7e-w-3.5" />
				{ __( 'Coming in Pro', 'essentials-for-contact-form-7' ) }
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
	<div className="cf7e-mb-4 cf7e-flex cf7e-items-baseline cf7e-gap-2.5">
		<h2 className="cf7e-m-0 cf7e-text-xl cf7e-font-bold cf7e-text-ink">{ title }</h2>
		<span className="cf7e-text-sm cf7e-text-stone-400">{ note }</span>
	</div>
);

/**
 * How many features are in each section, handed over by the page that rendered
 * this. The catalogue is a fixed list in PHP and nothing about it depends on
 * the site, so the loading state can be the right size rather than a guess.
 */
const HANDED_OVER = Array.isArray( window.cf7eFeatures?.items ) ? window.cf7eFeatures.items : null;

/**
 * The Pro section's header, which is a banner rather than a heading line.
 *
 * Its own component for the same reason as SectionHead: the loading state has
 * to draw it, and an amber box 26px taller than a plain heading is not
 * something to reproduce by eye in two places.
 */
const ProHead = () => (
	<div className="cf7e-mb-4 cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-justify-between cf7e-gap-3 cf7e-rounded-2xl cf7e-border cf7e-border-amber-200 cf7e-bg-amber-50/60 cf7e-px-5 cf7e-py-4">
		<div className="cf7e-flex cf7e-flex-col">
			<h2 className="cf7e-m-0 cf7e-text-xl cf7e-font-bold cf7e-text-ink">
				{ __( 'In Pro', 'essentials-for-contact-form-7' ) }
			</h2>
			<p className="cf7e-mb-0 cf7e-mt-0.5 cf7e-text-[14px] cf7e-text-stone-500">
				{ __( 'Everything above, plus these.', 'essentials-for-contact-form-7' ) }
			</p>
		</div>
	</div>
);

const SectionGrid = ( { children } ) => (
	<div className="cf7e-grid cf7e-grid-cols-1 cf7e-gap-4 md:cf7e-grid-cols-2 xl:cf7e-grid-cols-3">{ children }</div>
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
	<div className="cf7e-flex cf7e-h-full cf7e-flex-col cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-5">
		<div className="cf7e-mb-3 cf7e-flex cf7e-items-start cf7e-justify-between">
			<div className="cf7e-h-11 cf7e-w-11 cf7e-animate-pulse cf7e-rounded-xl cf7e-bg-stone-100" />
			<div className="cf7e-h-6 cf7e-w-11 cf7e-animate-pulse cf7e-rounded-full cf7e-bg-stone-100" />
		</div>

		<Shimmer as="h3" w="cf7e-w-1/2" text="cf7e-text-base" />

		<p className="cf7e-mb-0 cf7e-mt-1.5 cf7e-text-[14px] cf7e-leading-relaxed">
			<Shimmer w="cf7e-w-full" />
			<Shimmer w="cf7e-w-3/4" />
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
		apiFetch( { path: 'cf7e/v1/modules' } )
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
						title={ __( 'What you have', 'essentials-for-contact-form-7' ) }
						note={ <Shimmer w="cf7e-w-32" text="cf7e-text-sm" /> }
					/>
					<SectionGrid>
						{ Array.from( { length: 6 } ).map( ( _, i ) => <SkeletonCard key={ i } /> ) }
					</SectionGrid>
				</section>
			);
		}

		if ( 0 === lite.length && 0 === planned.length && 0 === pro.length ) {
			return (
				<div className="cf7e-flex cf7e-flex-col cf7e-items-center cf7e-justify-center cf7e-py-24 cf7e-text-center">
					<div className="cf7e-mb-4 cf7e-flex cf7e-h-16 cf7e-w-16 cf7e-items-center cf7e-justify-center cf7e-rounded-2xl cf7e-bg-stone-50 cf7e-text-stone-400">
						<Boxes className="cf7e-h-8 cf7e-w-8" />
					</div>
					<h3 className="cf7e-m-0 cf7e-text-lg cf7e-font-bold cf7e-text-ink">
						{ __( 'The feature list could not be loaded', 'essentials-for-contact-form-7' ) }
					</h3>
					<p className="cf7e-mt-1 cf7e-text-sm cf7e-text-stone-500">
						{ __( 'Reload the page to try again.', 'essentials-for-contact-form-7' ) }
					</p>
				</div>
			);
		}

		return (
			<>
				{ lite.length > 0 && (
					<section className="cf7e-mb-10">
						<SectionHead
							title={ __( 'What you have', 'essentials-for-contact-form-7' ) }
							note={ sprintf(
									/* translators: %d: number of features included. */
									__( '%d features, all active', 'essentials-for-contact-form-7' ),
									included
								) }
						/>
						<SectionGrid>
							{ lite.map( ( feature ) => <LiteCard key={ feature.slug } mod={ feature } /> ) }
						</SectionGrid>
					</section>
				) }

				{ planned.length > 0 && (
					<section className="cf7e-mb-10">
						<SectionHead
							title={ __( 'On the way', 'essentials-for-contact-form-7' ) }
							note={ __( 'Planned for a future release.', 'essentials-for-contact-form-7' ) }
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
				title={ __( 'Features', 'essentials-for-contact-form-7' ) }
				subtitle={ __( 'Everything this plugin does. All of it is on — there is nothing to switch.', 'essentials-for-contact-form-7' ) }
			/>

			{ error && (
				<div className="cf7e-mb-4 cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">
					{ error }
				</div>
			) }

			{ renderBody() }
		</Page>
	);
};

const mount = document.getElementById( 'cf7e-features-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
