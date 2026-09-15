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
	CreditCard,
	Users,
	Webhook,
	PenTool,
	FileText,
	Save,
	GitFork,
	MessageSquare,
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
	'credit-card':       CreditCard,
	users:               Users,
	webhook:             Webhook,
	'pen-tool':          PenTool,
	'file-text':         FileText,
	save:                Save,
	'git-fork':          GitFork,
	'message-square':    MessageSquare,
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
		<div className="deferforms-flex deferforms-h-full deferforms-flex-col deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-5 deferforms-transition-colors hover:deferforms-border-accent-200">
			<div className="deferforms-mb-3 deferforms-flex deferforms-items-start deferforms-justify-between">
				<div className="deferforms-flex deferforms-h-11 deferforms-w-11 deferforms-items-center deferforms-justify-center deferforms-rounded-xl deferforms-bg-accent-50 deferforms-text-accent">
					<Icon className="deferforms-h-5 deferforms-w-5" />
				</div>
				<span className="deferforms-inline-flex deferforms-items-center deferforms-gap-1 deferforms-rounded-full deferforms-bg-emerald-50 deferforms-px-2 deferforms-py-0.5 deferforms-text-[14px] deferforms-font-bold deferforms-uppercase deferforms-tracking-wide deferforms-text-emerald-700">
					<Check className="deferforms-h-3 deferforms-w-3" />
					{ __( 'Included', 'defer-forms-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="deferforms-m-0 deferforms-text-base deferforms-font-semibold deferforms-text-ink">{ mod.name }</h3>
			<p className="deferforms-mb-0 deferforms-mt-1.5 deferforms-text-[14px] deferforms-leading-relaxed deferforms-text-stone-500">{ mod.description }</p>
		</div>
	);
};

/** Written down so the list is honest about what is not built yet. */
const PlannedCard = ( { mod } ) => {
	const Icon = ICONS[ mod.icon ] || Layout;

	return (
		<div className="deferforms-flex deferforms-h-full deferforms-flex-col deferforms-rounded-2xl deferforms-border deferforms-border-dashed deferforms-border-line deferforms-bg-white deferforms-p-5">
			<div className="deferforms-mb-3 deferforms-flex deferforms-items-start deferforms-justify-between">
				<div className="deferforms-flex deferforms-h-11 deferforms-w-11 deferforms-items-center deferforms-justify-center deferforms-rounded-xl deferforms-bg-stone-100 deferforms-text-stone-400">
					<Icon className="deferforms-h-5 deferforms-w-5" />
				</div>
				<span className="deferforms-rounded-full deferforms-bg-stone-100 deferforms-px-2.5 deferforms-py-1 deferforms-text-[14px] deferforms-font-bold deferforms-uppercase deferforms-tracking-wide deferforms-text-stone-500">
					{ __( 'Coming soon', 'defer-forms-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="deferforms-m-0 deferforms-text-base deferforms-font-semibold deferforms-text-ink">{ mod.name }</h3>
			<p className="deferforms-mb-0 deferforms-mt-1.5 deferforms-text-[14px] deferforms-leading-relaxed deferforms-text-stone-500">{ mod.description }</p>
		</div>
	);
};

const ProCard = ( { mod } ) => {
	const Icon = ICONS[ mod.icon ] || Layout;

	return (
		<div className="deferforms-flex deferforms-h-full deferforms-flex-col deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-5 deferforms-transition-colors hover:deferforms-border-amber-200">
			<div className="deferforms-mb-3 deferforms-flex deferforms-items-start deferforms-justify-between">
				<div className="deferforms-flex deferforms-h-11 deferforms-w-11 deferforms-items-center deferforms-justify-center deferforms-rounded-xl deferforms-bg-amber-50 deferforms-text-amber-600">
					<Icon className="deferforms-h-5 deferforms-w-5" />
				</div>
				<span className="deferforms-inline-flex deferforms-items-center deferforms-gap-1 deferforms-rounded-full deferforms-bg-amber-100 deferforms-px-2 deferforms-py-0.5 deferforms-text-[14px] deferforms-font-bold deferforms-uppercase deferforms-tracking-wide deferforms-text-amber-700">
					<Sparkles className="deferforms-h-3 deferforms-w-3" />
					{ __( 'Pro', 'defer-forms-for-contact-form-7' ) }
				</span>
			</div>

			<h3 className="deferforms-m-0 deferforms-text-base deferforms-font-semibold deferforms-text-ink">{ mod.name }</h3>
			<p className="deferforms-mb-0 deferforms-mt-1.5 deferforms-text-[14px] deferforms-leading-relaxed deferforms-text-stone-500">{ mod.description }</p>

			<div className="deferforms-mt-4 deferforms-flex deferforms-items-center deferforms-gap-1.5 deferforms-text-[14px] deferforms-font-semibold deferforms-text-amber-600">
				<Lock className="deferforms-h-3.5 deferforms-w-3.5" />
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
	<div className="deferforms-mb-4 deferforms-flex deferforms-items-baseline deferforms-gap-2.5">
		<h2 className="deferforms-m-0 deferforms-text-xl deferforms-font-bold deferforms-text-ink">{ title }</h2>
		<span className="deferforms-text-sm deferforms-text-stone-400">{ note }</span>
	</div>
);

/**
 * How many features are in each section, handed over by the page that rendered
 * this. The catalogue is a fixed list in PHP and nothing about it depends on
 * the site, so the loading state can be the right size rather than a guess.
 */
const HANDED_OVER = Array.isArray( window.deferformsFeatures?.items ) ? window.deferformsFeatures.items : null;

/**
 * The Pro section's header, which is a banner rather than a heading line.
 *
 * Its own component for the same reason as SectionHead: the loading state has
 * to draw it, and an amber box 26px taller than a plain heading is not
 * something to reproduce by eye in two places.
 */
const ProHead = () => (
	<div className="deferforms-mb-4 deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-justify-between deferforms-gap-3 deferforms-rounded-2xl deferforms-border deferforms-border-amber-200 deferforms-bg-amber-50/60 deferforms-px-5 deferforms-py-4">
		<div className="deferforms-flex deferforms-flex-col">
			<h2 className="deferforms-m-0 deferforms-text-xl deferforms-font-bold deferforms-text-ink">
				{ __( 'In Pro', 'defer-forms-for-contact-form-7' ) }
			</h2>
			<p className="deferforms-mb-0 deferforms-mt-0.5 deferforms-text-[14px] deferforms-text-stone-500">
				{ __( 'Everything above, plus these.', 'defer-forms-for-contact-form-7' ) }
			</p>
		</div>
	</div>
);

const SectionGrid = ( { children } ) => (
	<div className="deferforms-grid deferforms-grid-cols-1 deferforms-gap-4 md:deferforms-grid-cols-2 xl:deferforms-grid-cols-3">{ children }</div>
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
	<div className="deferforms-flex deferforms-h-full deferforms-flex-col deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-5">
		<div className="deferforms-mb-3 deferforms-flex deferforms-items-start deferforms-justify-between">
			<div className="deferforms-h-11 deferforms-w-11 deferforms-animate-pulse deferforms-rounded-xl deferforms-bg-stone-100" />
			<div className="deferforms-h-6 deferforms-w-11 deferforms-animate-pulse deferforms-rounded-full deferforms-bg-stone-100" />
		</div>

		<Shimmer as="h3" w="deferforms-w-1/2" text="deferforms-text-base" />

		<p className="deferforms-mb-0 deferforms-mt-1.5 deferforms-text-[14px] deferforms-leading-relaxed">
			<Shimmer w="deferforms-w-full" />
			<Shimmer w="deferforms-w-3/4" />
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
		apiFetch( { path: 'deferforms/v1/modules' } )
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
						note={ <Shimmer w="deferforms-w-32" text="deferforms-text-sm" /> }
					/>
					<SectionGrid>
						{ Array.from( { length: 6 } ).map( ( _, i ) => <SkeletonCard key={ i } /> ) }
					</SectionGrid>
				</section>
			);
		}

		if ( 0 === lite.length && 0 === planned.length && 0 === pro.length ) {
			return (
				<div className="deferforms-flex deferforms-flex-col deferforms-items-center deferforms-justify-center deferforms-py-24 deferforms-text-center">
					<div className="deferforms-mb-4 deferforms-flex deferforms-h-16 deferforms-w-16 deferforms-items-center deferforms-justify-center deferforms-rounded-2xl deferforms-bg-stone-50 deferforms-text-stone-400">
						<Boxes className="deferforms-h-8 deferforms-w-8" />
					</div>
					<h3 className="deferforms-m-0 deferforms-text-lg deferforms-font-bold deferforms-text-ink">
						{ __( 'The feature list could not be loaded', 'defer-forms-for-contact-form-7' ) }
					</h3>
					<p className="deferforms-mt-1 deferforms-text-sm deferforms-text-stone-500">
						{ __( 'Reload the page to try again.', 'defer-forms-for-contact-form-7' ) }
					</p>
				</div>
			);
		}

		return (
			<>
				{ lite.length > 0 && (
					<section className="deferforms-mb-10">
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
					<section className="deferforms-mb-10">
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
				<div className="deferforms-mb-4 deferforms-rounded-lg deferforms-border deferforms-border-red-200 deferforms-bg-red-50 deferforms-px-4 deferforms-py-3 deferforms-text-sm deferforms-font-medium deferforms-text-red-700">
					{ error }
				</div>
			) }

			{ renderBody() }
		</Page>
	);
};

const mount = document.getElementById( 'deferforms-features-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
