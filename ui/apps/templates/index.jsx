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

const mockInput = 'cf7e-flex cf7e-h-10 cf7e-w-full cf7e-items-center cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-stone-50 cf7e-px-3 cf7e-text-sm cf7e-text-stone-400';

const FieldPreview = ( { field } ) => {
	const label = (
		<span className="cf7e-mb-1.5 cf7e-block cf7e-text-[14px] cf7e-font-semibold cf7e-text-ink">
			{ field.label }
			{ field.required && <span className="cf7e-text-red-500"> *</span> }
		</span>
	);

	if ( 'acceptance' === field.type ) {
		return (
			<label className="cf7e-flex cf7e-items-center cf7e-gap-2 cf7e-text-sm cf7e-text-stone-600">
				<span className="cf7e-h-4 cf7e-w-4 cf7e-shrink-0 cf7e-rounded cf7e-border cf7e-border-stroke cf7e-bg-stone-50" />
				{ field.label }
			</label>
		);
	}

	if ( 'radio' === field.type || 'checkbox' === field.type ) {
		const shape = 'radio' === field.type ? 'cf7e-rounded-full' : 'cf7e-rounded';
		return (
			<div>
				{ label }
				<div className="cf7e-flex cf7e-flex-col cf7e-gap-2">
					{ ( field.options || [] ).map( ( opt ) => (
						<label key={ opt } className="cf7e-flex cf7e-items-center cf7e-gap-2 cf7e-text-sm cf7e-text-stone-600">
							<span className={ `cf7e-h-4 cf7e-w-4 cf7e-shrink-0 cf7e-border cf7e-border-stroke cf7e-bg-white ${ shape }` } />
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
				<div className={ `${ mockInput } cf7e-justify-between` }>
					<span>{ ( field.options || [] )[ 0 ] || __( 'Select…', 'essentials-for-contact-form-7' ) }</span>
					<ChevronDown className="cf7e-h-4 cf7e-w-4 cf7e-text-stone-400" />
				</div>
			</div>
		);
	}

	if ( 'textarea' === field.type ) {
		return (
			<div>
				{ label }
				<div className="cf7e-h-20 cf7e-w-full cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-stone-50" />
			</div>
		);
	}

	if ( 'file' === field.type ) {
		return (
			<div>
				{ label }
				<div className={ mockInput }>
					<Upload className="cf7e-mr-2 cf7e-h-4 cf7e-w-4 cf7e-text-stone-400" />
					{ __( 'Choose file…', 'essentials-for-contact-form-7' ) }
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
				<div className="cf7e-fixed cf7e-inset-0 cf7e-z-[100000] cf7e-flex cf7e-items-start cf7e-justify-center cf7e-px-4 cf7e-pb-4 cf7e-pt-[7vh]">
					<Backdrop
						onClick={ onClose }
						className="cf7e-absolute cf7e-inset-0 cf7e-bg-ink/40 cf7e-backdrop-blur-sm"
					/>
					<div
						className="cf7e-relative cf7e-flex cf7e-max-h-[85vh] cf7e-w-full cf7e-max-w-lg cf7e-flex-col cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-shadow-pop"
					>
						<header className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-gap-3 cf7e-border-b cf7e-border-line cf7e-px-6 cf7e-py-4">
							<div className="cf7e-flex cf7e-items-center cf7e-gap-3">
								<div className="cf7e-flex cf7e-h-10 cf7e-w-10 cf7e-items-center cf7e-justify-center cf7e-rounded-xl cf7e-bg-accent-50 cf7e-text-accent">
									<Icon className="cf7e-h-5 cf7e-w-5" />
								</div>
								<div className="cf7e-flex cf7e-flex-col">
									<span className="cf7e-text-lg cf7e-font-bold cf7e-text-ink">{ tpl.name }</span>
									<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">
										{ tpl.category }
									</span>
								</div>
							</div>
							<button
								type="button"
								onClick={ onClose }
								aria-label={ __( 'Close', 'essentials-for-contact-form-7' ) }
								className="cf7e-flex cf7e-h-9 cf7e-w-9 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-stone-50 cf7e-text-stone-500 hover:cf7e-bg-stone-100 hover:cf7e-text-ink"
							>
								<X className="cf7e-h-4 cf7e-w-4" />
							</button>
						</header>

						<div className="cf7e-scroll cf7e-flex-1 cf7e-overflow-y-auto cf7e-bg-stone-50/40 cf7e-px-3.5 cf7e-py-6" style={ { scrollbarGutter: 'stable both-edges' } }>
							<div className="cf7e-mx-auto cf7e-flex cf7e-max-w-sm cf7e-flex-col cf7e-gap-5 cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-6">
								{ tpl.fields.map( ( field ) => (
									<FieldPreview key={ field.name } field={ field } />
								) ) }
								<div className="cf7e-mt-1 cf7e-h-10 cf7e-w-32 cf7e-rounded-lg cf7e-bg-ink" />
							</div>
						</div>

						<footer className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-gap-3 cf7e-border-t cf7e-border-line cf7e-px-6 cf7e-py-4">
							<span className="cf7e-text-[14px] cf7e-text-stone-500">
								{ tpl.fields.length } { __( 'fields', 'essentials-for-contact-form-7' ) }
							</span>
							<button
								type="button"
								disabled={ busy }
								onClick={ () => onUse( tpl ) }
								className="cf7e-inline-flex cf7e-h-9 cf7e-cursor-pointer cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border-0 cf7e-bg-ink cf7e-px-5 cf7e-text-sm cf7e-font-semibold cf7e-text-white cf7e-transition hover:cf7e-opacity-90 disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-60"
							>
								{ busy ? <Loader2 className="cf7e-h-4 cf7e-w-4 cf7e-animate-spin" /> : <Plus className="cf7e-h-4 cf7e-w-4" /> }
								{ busy ? __( 'Creating…', 'essentials-for-contact-form-7' ) : __( 'Use this template', 'essentials-for-contact-form-7' ) }
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
		<div className="cf7e-flex cf7e-h-full cf7e-flex-col cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-5 cf7e-transition-colors hover:cf7e-border-stroke">
			<div className="cf7e-mb-3 cf7e-flex cf7e-items-start cf7e-justify-between">
				<div className="cf7e-flex cf7e-h-11 cf7e-w-11 cf7e-items-center cf7e-justify-center cf7e-rounded-xl cf7e-bg-accent-50 cf7e-text-accent">
					<Icon className="cf7e-h-5 cf7e-w-5" />
				</div>
				<span className="cf7e-text-[14px] cf7e-font-semibold cf7e-uppercase cf7e-tracking-wider cf7e-text-stone-400">
					{ tpl.category }
				</span>
			</div>

			<h3 className="cf7e-m-0 cf7e-text-base cf7e-font-semibold cf7e-text-ink">{ tpl.name }</h3>
			<p className="cf7e-mb-0 cf7e-mt-1.5 cf7e-text-[14px] cf7e-leading-relaxed cf7e-text-stone-500">{ tpl.description }</p>

			<div className="cf7e-mt-auto cf7e-flex cf7e-gap-2 cf7e-pt-5">
				<button
					type="button"
					onClick={ () => onPreview( tpl ) }
					className="cf7e-inline-flex cf7e-h-9 cf7e-flex-1 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-gap-1.5 cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-text-[14px] cf7e-font-semibold cf7e-text-ink cf7e-transition-colors hover:cf7e-bg-stone-50"
				>
					<Eye className="cf7e-h-3.5 cf7e-w-3.5 cf7e-text-stone-400" />
					{ __( 'Preview', 'essentials-for-contact-form-7' ) }
				</button>
				<button
					type="button"
					disabled={ busy }
					onClick={ () => onUse( tpl ) }
					className="cf7e-inline-flex cf7e-h-9 cf7e-flex-1 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-gap-1.5 cf7e-rounded-lg cf7e-border-0 cf7e-bg-ink cf7e-text-[14px] cf7e-font-semibold cf7e-text-white cf7e-transition hover:cf7e-opacity-90 disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-60"
				>
					{ busy ? <Loader2 className="cf7e-h-3.5 cf7e-w-3.5 cf7e-animate-spin" /> : <Plus className="cf7e-h-3.5 cf7e-w-3.5" /> }
					{ __( 'Use', 'essentials-for-contact-form-7' ) }
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
	<div className="cf7e-flex cf7e-h-full cf7e-flex-col cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-5">
		<div className="cf7e-mb-3 cf7e-flex cf7e-items-start cf7e-justify-between">
			<div className="cf7e-h-11 cf7e-w-11 cf7e-animate-pulse cf7e-rounded-xl cf7e-bg-stone-100" />
			<Shimmer w="cf7e-w-16" text="cf7e-text-[14px]" />
		</div>

		<Shimmer as="h3" w="cf7e-w-2/3" text="cf7e-text-base" />

		<p className="cf7e-mb-0 cf7e-mt-1.5 cf7e-text-[14px] cf7e-leading-relaxed">
			<Shimmer w="cf7e-w-full" />
			<Shimmer w="cf7e-w-4/5" />
		</p>

		<div className="cf7e-mt-auto cf7e-flex cf7e-gap-2 cf7e-pt-5">
			<div className="cf7e-h-9 cf7e-flex-1 cf7e-animate-pulse cf7e-rounded-lg cf7e-bg-stone-100" />
			<div className="cf7e-h-9 cf7e-flex-1 cf7e-animate-pulse cf7e-rounded-lg cf7e-bg-stone-100" />
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
		apiFetch( { path: 'cf7e/v1/templates' } )
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
			const res = await apiFetch( { path: `cf7e/v1/templates/${ tpl.slug }/create`, method: 'POST' } );
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
				<div className="cf7e-grid cf7e-grid-cols-1 cf7e-gap-4 sm:cf7e-grid-cols-2 lg:cf7e-grid-cols-3 xl:cf7e-grid-cols-4">
					{ Array.from( { length: 8 } ).map( ( _, i ) => <SkeletonCard key={ i } /> ) }
				</div>
			);
		}

		if ( 0 === filtered.length ) {
			return (
				<div className="cf7e-py-20 cf7e-text-center cf7e-text-sm cf7e-text-stone-500">
					{ __( 'No templates match your search.', 'essentials-for-contact-form-7' ) }
				</div>
			);
		}

		return (
			<div className="cf7e-grid cf7e-grid-cols-1 cf7e-gap-4 sm:cf7e-grid-cols-2 lg:cf7e-grid-cols-3 xl:cf7e-grid-cols-4">
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
				title={ __( 'Templates', 'essentials-for-contact-form-7' ) }
				subtitle={ __( 'Preview a ready-made form, then create it in Contact Form 7 with one click.', 'essentials-for-contact-form-7' ) }
			/>

			{ error && (
				<div className="cf7e-mb-4 cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">
					{ error }
				</div>
			) }

			<div className="cf7e-mb-6 cf7e-relative cf7e-w-full sm:cf7e-w-80">
				<Search className="cf7e-pointer-events-none cf7e-absolute cf7e-left-3 cf7e-top-1/2 cf7e-h-4 cf7e-w-4 -cf7e-translate-y-1/2 cf7e-text-stone-400" />
				<input
					type="search"
					value={ search }
					onChange={ ( event ) => setSearch( event.target.value ) }
					placeholder={ __( 'Search templates…', 'essentials-for-contact-form-7' ) }
					className={ `cf7e-h-9 cf7e-w-full cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-pl-10 cf7e-pr-3 cf7e-text-sm cf7e-text-ink cf7e-transition-colors placeholder:cf7e-text-stone-400 ${ focusRing }` }
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

const mount = document.getElementById( 'cf7e-templates-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
