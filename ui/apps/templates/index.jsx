import { createRoot, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import {
	Mail,
	Star,
	Send,
	LifeBuoy,
	FileText,
	Calendar,
	Briefcase,
	CalendarClock,
	ClipboardList,
	Target,
	Phone,
	Bug,
	HandHeart,
	Heart,
	GraduationCap,
	Home,
	Utensils,
	Quote,
	Handshake,
	Package,
	MessageCircle,
	Search,
	Plus,
	Loader2,
	Eye,
	X,
	ChevronDown,
	Upload,
} from 'lucide-react';

import { Page, PageHeader } from '@shared/components/page';
import { Backdrop, focusRing, Shimmer } from '@shared/components/ui';
import '@shared/styles/admin.css';

const ICONS = {
	mail:             Mail,
	star:             Star,
	send:             Send,
	'life-buoy':      LifeBuoy,
	'file-text':      FileText,
	calendar:         Calendar,
	briefcase:        Briefcase,
	'calendar-clock': CalendarClock,
	'clipboard-list': ClipboardList,
	target:           Target,
	phone:            Phone,
	bug:              Bug,
	'hand-heart':     HandHeart,
	heart:            Heart,
	'graduation-cap': GraduationCap,
	home:             Home,
	utensils:         Utensils,
	quote:            Quote,
	handshake:        Handshake,
	package:          Package,
	'message-circle': MessageCircle,
};

// --- Field preview: a non-interactive mock of each CF7 field ---

const mockInput = 'df7-flex df7-h-10 df7-w-full df7-items-center df7-rounded-lg df7-border df7-border-stroke df7-bg-stone-50 df7-px-3 df7-text-sm df7-text-stone-400';

const FieldPreview = ( { field } ) => {
	const label = (
		<span className="df7-mb-1.5 df7-block df7-text-[14px] df7-font-semibold df7-text-ink">
			{ field.label }
			{ field.required && <span className="df7-text-red-500"> *</span> }
		</span>
	);

	if ( 'acceptance' === field.type ) {
		return (
			<label className="df7-flex df7-items-center df7-gap-2 df7-text-sm df7-text-stone-600">
				<span className="df7-h-4 df7-w-4 df7-shrink-0 df7-rounded df7-border df7-border-stroke df7-bg-stone-50" />
				{ field.label }
			</label>
		);
	}

	if ( 'radio' === field.type || 'checkbox' === field.type ) {
		const shape = 'radio' === field.type ? 'df7-rounded-full' : 'df7-rounded';
		return (
			<div>
				{ label }
				<div className="df7-flex df7-flex-col df7-gap-2">
					{ ( field.options || [] ).map( ( opt ) => (
						<label key={ opt } className="df7-flex df7-items-center df7-gap-2 df7-text-sm df7-text-stone-600">
							<span className={ `df7-h-4 df7-w-4 df7-shrink-0 df7-border df7-border-stroke df7-bg-white ${ shape }` } />
							{ opt }
						</label>
					) ) }
				</div>
			</div>
		);
	}

	if ( 'select' === field.type ) {
		return (
			<div>
				{ label }
				<div className={ `${ mockInput } df7-justify-between` }>
					<span>{ ( field.options || [] )[ 0 ] || __( 'Select…', 'defer-forms-for-contact-form-7' ) }</span>
					<ChevronDown className="df7-h-4 df7-w-4 df7-text-stone-400" />
				</div>
			</div>
		);
	}

	if ( 'textarea' === field.type ) {
		return (
			<div>
				{ label }
				<div className="df7-h-20 df7-w-full df7-rounded-lg df7-border df7-border-stroke df7-bg-stone-50" />
			</div>
		);
	}

	if ( 'file' === field.type ) {
		return (
			<div>
				{ label }
				<div className={ mockInput }>
					<Upload className="df7-mr-2 df7-h-4 df7-w-4 df7-text-stone-400" />
					{ __( 'Choose file…', 'defer-forms-for-contact-form-7' ) }
				</div>
			</div>
		);
	}

	// text, email, tel, number, date.
	const placeholder = {
		email:  'name@example.com',
		tel:    '+1 555 000 0000',
		number: '0',
		date:   'yyyy-mm-dd',
	}[ field.type ];

	return (
		<div>
			{ label }
			<div className={ mockInput }>{ placeholder || '' }</div>
		</div>
	);
};

const PreviewModal = ( { tpl, busy, onClose, onUse } ) => {
	useEffect( () => {
		if ( ! tpl ) {
			return;
		}
		const onKey = ( event ) => 'Escape' === event.key && onClose();
		window.addEventListener( 'keydown', onKey );
		return () => window.removeEventListener( 'keydown', onKey );
	}, [ tpl, onClose ] );

	const Icon = tpl ? ICONS[ tpl.icon ] || FileText : FileText;

	return (
		<>
			{ tpl && (
				<div className="df7-fixed df7-inset-0 df7-z-[100000] df7-flex df7-items-start df7-justify-center df7-px-4 df7-pb-4 df7-pt-[7vh]">
					<Backdrop
						onClick={ onClose }
						className="df7-absolute df7-inset-0 df7-bg-ink/40 df7-backdrop-blur-sm"
					/>
					<div
						className="df7-relative df7-flex df7-max-h-[85vh] df7-w-full df7-max-w-lg df7-flex-col df7-overflow-hidden df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-shadow-pop"
					>
						<header className="df7-flex df7-items-center df7-justify-between df7-gap-3 df7-border-b df7-border-line df7-px-6 df7-py-4">
							<div className="df7-flex df7-items-center df7-gap-3">
								<div className="df7-flex df7-h-10 df7-w-10 df7-items-center df7-justify-center df7-rounded-xl df7-bg-accent-50 df7-text-accent">
									<Icon className="df7-h-5 df7-w-5" />
								</div>
								<div className="df7-flex df7-flex-col">
									<span className="df7-text-lg df7-font-bold df7-text-ink">{ tpl.name }</span>
									<span className="df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">
										{ tpl.category }
									</span>
								</div>
							</div>
							<button
								type="button"
								onClick={ onClose }
								aria-label={ __( 'Close', 'defer-forms-for-contact-form-7' ) }
								className="df7-flex df7-h-9 df7-w-9 df7-cursor-pointer df7-items-center df7-justify-center df7-rounded-lg df7-border-0 df7-bg-stone-50 df7-text-stone-500 hover:df7-bg-stone-100 hover:df7-text-ink"
							>
								<X className="df7-h-4 df7-w-4" />
							</button>
						</header>

						<div className="df7-scroll df7-flex-1 df7-overflow-y-auto df7-bg-stone-50/40 df7-px-3.5 df7-py-6" style={ { scrollbarGutter: 'stable both-edges' } }>
							<div className="df7-mx-auto df7-flex df7-max-w-sm df7-flex-col df7-gap-5 df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-6">
								{ tpl.fields.map( ( field ) => (
									<FieldPreview key={ field.name } field={ field } />
								) ) }
								<div className="df7-mt-1 df7-h-10 df7-w-32 df7-rounded-lg df7-bg-ink" />
							</div>
						</div>

						<footer className="df7-flex df7-items-center df7-justify-between df7-gap-3 df7-border-t df7-border-line df7-px-6 df7-py-4">
							<span className="df7-text-[14px] df7-text-stone-500">
								{ tpl.fields.length } { __( 'fields', 'defer-forms-for-contact-form-7' ) }
							</span>
							<button
								type="button"
								disabled={ busy }
								onClick={ () => onUse( tpl ) }
								className="df7-inline-flex df7-h-9 df7-cursor-pointer df7-items-center df7-gap-2 df7-rounded-lg df7-border-0 df7-bg-ink df7-px-5 df7-text-sm df7-font-semibold df7-text-white df7-transition hover:df7-opacity-90 disabled:df7-cursor-not-allowed disabled:df7-opacity-60"
							>
								{ busy ? <Loader2 className="df7-h-4 df7-w-4 df7-animate-spin" /> : <Plus className="df7-h-4 df7-w-4" /> }
								{ busy ? __( 'Creating…', 'defer-forms-for-contact-form-7' ) : __( 'Use this template', 'defer-forms-for-contact-form-7' ) }
							</button>
						</footer>
					</div>
				</div>
			) }
		</>
	);
};

const TemplateCard = ( { tpl, busy, onPreview, onUse } ) => {
	const Icon = ICONS[ tpl.icon ] || FileText;

	return (
		<div className="df7-flex df7-h-full df7-flex-col df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-5 df7-transition-colors hover:df7-border-stroke">
			<div className="df7-mb-3 df7-flex df7-items-start df7-justify-between">
				<div className="df7-flex df7-h-11 df7-w-11 df7-items-center df7-justify-center df7-rounded-xl df7-bg-accent-50 df7-text-accent">
					<Icon className="df7-h-5 df7-w-5" />
				</div>
				<span className="df7-text-[14px] df7-font-semibold df7-uppercase df7-tracking-wider df7-text-stone-400">
					{ tpl.category }
				</span>
			</div>

			<h3 className="df7-m-0 df7-text-base df7-font-semibold df7-text-ink">{ tpl.name }</h3>
			<p className="df7-mb-0 df7-mt-1.5 df7-text-[14px] df7-leading-relaxed df7-text-stone-500">{ tpl.description }</p>

			<div className="df7-mt-auto df7-flex df7-gap-2 df7-pt-5">
				<button
					type="button"
					onClick={ () => onPreview( tpl ) }
					className="df7-inline-flex df7-h-9 df7-flex-1 df7-cursor-pointer df7-items-center df7-justify-center df7-gap-1.5 df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-text-[14px] df7-font-semibold df7-text-ink df7-transition-colors hover:df7-bg-stone-50"
				>
					<Eye className="df7-h-3.5 df7-w-3.5 df7-text-stone-400" />
					{ __( 'Preview', 'defer-forms-for-contact-form-7' ) }
				</button>
				<button
					type="button"
					disabled={ busy }
					onClick={ () => onUse( tpl ) }
					className="df7-inline-flex df7-h-9 df7-flex-1 df7-cursor-pointer df7-items-center df7-justify-center df7-gap-1.5 df7-rounded-lg df7-border-0 df7-bg-ink df7-text-[14px] df7-font-semibold df7-text-white df7-transition hover:df7-opacity-90 disabled:df7-cursor-not-allowed disabled:df7-opacity-60"
				>
					{ busy ? <Loader2 className="df7-h-3.5 df7-w-3.5 df7-animate-spin" /> : <Plus className="df7-h-3.5 df7-w-3.5" /> }
					{ __( 'Use', 'defer-forms-for-contact-form-7' ) }
				</button>
			</div>
		</div>
	);
};

/**
 * The card, before the template list arrives.
 *
 * Element for element with the real one above. The description is a <p> with
 * the same size and leading, holding two bars that inherit both — so each is
 * exactly one line of the text it stands for, rather than a 12px bar guessing
 * at a 23px line. Two lines is what most of these descriptions run to; a longer
 * one grows the real card past this, which a grid of stretched cards absorbs.
 */
const SkeletonCard = () => (
	<div className="df7-flex df7-h-full df7-flex-col df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-5">
		<div className="df7-mb-3 df7-flex df7-items-start df7-justify-between">
			<div className="df7-h-11 df7-w-11 df7-animate-pulse df7-rounded-xl df7-bg-stone-100" />
			<Shimmer w="df7-w-16" text="df7-text-[14px]" />
		</div>

		<Shimmer as="h3" w="df7-w-2/3" text="df7-text-base" />

		<p className="df7-mb-0 df7-mt-1.5 df7-text-[14px] df7-leading-relaxed">
			<Shimmer w="df7-w-full" />
			<Shimmer w="df7-w-4/5" />
		</p>

		<div className="df7-mt-auto df7-flex df7-gap-2 df7-pt-5">
			<div className="df7-h-9 df7-flex-1 df7-animate-pulse df7-rounded-lg df7-bg-stone-100" />
			<div className="df7-h-9 df7-flex-1 df7-animate-pulse df7-rounded-lg df7-bg-stone-100" />
		</div>
	</div>
);

const App = () => {
	const [ templates, setTemplates ] = useState( [] );
	const [ loading, setLoading ]     = useState( true );
	const [ error, setError ]         = useState( null );
	const [ search, setSearch ]       = useState( '' );
	const [ creating, setCreating ]   = useState( null );
	const [ preview, setPreview ]     = useState( null );

	useEffect( () => {
		apiFetch( { path: 'df7/v1/templates' } )
			.then( ( res ) => {
				setTemplates( res );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message ) )
			.finally( () => setLoading( false ) );
	}, [] );

	const useTemplate = async ( tpl ) => {
		setCreating( tpl.slug );
		setError( null );
		try {
			const res = await apiFetch( { path: `df7/v1/templates/${ tpl.slug }/create`, method: 'POST' } );
			window.location.href = res.builder_url;
		} catch ( err ) {
			setError( err.message );
			setCreating( null );
		}
	};

	const needle   = search.trim().toLowerCase();
	const filtered = templates.filter(
		( template ) =>
			'' === needle ||
			template.name.toLowerCase().includes( needle ) ||
			template.description.toLowerCase().includes( needle ) ||
			template.category.toLowerCase().includes( needle )
	);

	const renderBody = () => {
		if ( loading ) {
			return (
				<div className="df7-grid df7-grid-cols-1 df7-gap-4 sm:df7-grid-cols-2 lg:df7-grid-cols-3 xl:df7-grid-cols-4">
					{ Array.from( { length: 8 } ).map( ( _, i ) => <SkeletonCard key={ i } /> ) }
				</div>
			);
		}

		if ( 0 === filtered.length ) {
			return (
				<div className="df7-py-20 df7-text-center df7-text-sm df7-text-stone-500">
					{ __( 'No templates match your search.', 'defer-forms-for-contact-form-7' ) }
				</div>
			);
		}

		return (
			<div className="df7-grid df7-grid-cols-1 df7-gap-4 sm:df7-grid-cols-2 lg:df7-grid-cols-3 xl:df7-grid-cols-4">
				{ filtered.map( ( tpl ) => (
					<TemplateCard
						key={ tpl.slug }
						tpl={ tpl }
						busy={ creating === tpl.slug }
						onPreview={ setPreview }
						onUse={ useTemplate }
					/>
				) ) }
			</div>
		);
	};

	return (
		<Page>
			<PageHeader
				title={ __( 'Templates', 'defer-forms-for-contact-form-7' ) }
				subtitle={ __( 'Preview a ready-made form, then create it in Contact Form 7 with one click.', 'defer-forms-for-contact-form-7' ) }
			/>

			{ error && (
				<div className="df7-mb-4 df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-4 df7-py-3 df7-text-sm df7-font-medium df7-text-red-700">
					{ error }
				</div>
			) }

			<div className="df7-mb-6 df7-relative df7-w-full sm:df7-w-80">
				<Search className="df7-pointer-events-none df7-absolute df7-left-3 df7-top-1/2 df7-h-4 df7-w-4 -df7-translate-y-1/2 df7-text-stone-400" />
				<input
					type="search"
					value={ search }
					onChange={ ( event ) => setSearch( event.target.value ) }
					placeholder={ __( 'Search templates…', 'defer-forms-for-contact-form-7' ) }
					className={ `df7-h-9 df7-w-full df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-pl-10 df7-pr-3 df7-text-sm df7-text-ink df7-transition-colors placeholder:df7-text-stone-400 ${ focusRing }` }
				/>
			</div>

			{ renderBody() }

			<PreviewModal
				tpl={ preview }
				busy={ preview ? creating === preview.slug : false }
				onClose={ () => setPreview( null ) }
				onUse={ useTemplate }
			/>
		</Page>
	);
};

const mount = document.getElementById( 'df7-templates-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
