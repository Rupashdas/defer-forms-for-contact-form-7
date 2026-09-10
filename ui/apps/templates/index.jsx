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

const mockInput = 'deferforms-flex deferforms-h-10 deferforms-w-full deferforms-items-center deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-stone-50 deferforms-px-3 deferforms-text-sm deferforms-text-stone-400';

const FieldPreview = ( { field } ) => {
	const label = (
		<span className="deferforms-mb-1.5 deferforms-block deferforms-text-[14px] deferforms-font-semibold deferforms-text-ink">
			{ field.label }
			{ field.required && <span className="deferforms-text-red-500"> *</span> }
		</span>
	);

	if ( 'acceptance' === field.type ) {
		return (
			<label className="deferforms-flex deferforms-items-center deferforms-gap-2 deferforms-text-sm deferforms-text-stone-600">
				<span className="deferforms-h-4 deferforms-w-4 deferforms-shrink-0 deferforms-rounded deferforms-border deferforms-border-stroke deferforms-bg-stone-50" />
				{ field.label }
			</label>
		);
	}

	if ( 'radio' === field.type || 'checkbox' === field.type ) {
		const shape = 'radio' === field.type ? 'deferforms-rounded-full' : 'deferforms-rounded';
		return (
			<div>
				{ label }
				<div className="deferforms-flex deferforms-flex-col deferforms-gap-2">
					{ ( field.options || [] ).map( ( opt ) => (
						<label key={ opt } className="deferforms-flex deferforms-items-center deferforms-gap-2 deferforms-text-sm deferforms-text-stone-600">
							<span className={ `deferforms-h-4 deferforms-w-4 deferforms-shrink-0 deferforms-border deferforms-border-stroke deferforms-bg-white ${ shape }` } />
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
				<div className={ `${ mockInput } deferforms-justify-between` }>
					<span>{ ( field.options || [] )[ 0 ] || __( 'Select…', 'defer-forms-for-contact-form-7' ) }</span>
					<ChevronDown className="deferforms-h-4 deferforms-w-4 deferforms-text-stone-400" />
				</div>
			</div>
		);
	}

	if ( 'textarea' === field.type ) {
		return (
			<div>
				{ label }
				<div className="deferforms-h-20 deferforms-w-full deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-stone-50" />
			</div>
		);
	}

	if ( 'file' === field.type ) {
		return (
			<div>
				{ label }
				<div className={ mockInput }>
					<Upload className="deferforms-mr-2 deferforms-h-4 deferforms-w-4 deferforms-text-stone-400" />
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
				<div className="deferforms-fixed deferforms-inset-0 deferforms-z-[100000] deferforms-flex deferforms-items-start deferforms-justify-center deferforms-px-4 deferforms-pb-4 deferforms-pt-[7vh]">
					<Backdrop
						onClick={ onClose }
						className="deferforms-absolute deferforms-inset-0 deferforms-bg-ink/40 deferforms-backdrop-blur-sm"
					/>
					<div
						className="deferforms-relative deferforms-flex deferforms-max-h-[85vh] deferforms-w-full deferforms-max-w-lg deferforms-flex-col deferforms-overflow-hidden deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-pop"
					>
						<header className="deferforms-flex deferforms-items-center deferforms-justify-between deferforms-gap-3 deferforms-border-b deferforms-border-line deferforms-px-6 deferforms-py-4">
							<div className="deferforms-flex deferforms-items-center deferforms-gap-3">
								<div className="deferforms-flex deferforms-h-10 deferforms-w-10 deferforms-items-center deferforms-justify-center deferforms-rounded-xl deferforms-bg-accent-50 deferforms-text-accent">
									<Icon className="deferforms-h-5 deferforms-w-5" />
								</div>
								<div className="deferforms-flex deferforms-flex-col">
									<span className="deferforms-text-lg deferforms-font-bold deferforms-text-ink">{ tpl.name }</span>
									<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">
										{ tpl.category }
									</span>
								</div>
							</div>
							<button
								type="button"
								onClick={ onClose }
								aria-label={ __( 'Close', 'defer-forms-for-contact-form-7' ) }
								className="deferforms-flex deferforms-h-9 deferforms-w-9 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-rounded-lg deferforms-border-0 deferforms-bg-stone-50 deferforms-text-stone-500 hover:deferforms-bg-stone-100 hover:deferforms-text-ink"
							>
								<X className="deferforms-h-4 deferforms-w-4" />
							</button>
						</header>

						<div className="deferforms-scroll deferforms-flex-1 deferforms-overflow-y-auto deferforms-bg-stone-50/40 deferforms-px-3.5 deferforms-py-6" style={ { scrollbarGutter: 'stable both-edges' } }>
							<div className="deferforms-mx-auto deferforms-flex deferforms-max-w-sm deferforms-flex-col deferforms-gap-5 deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-6">
								{ tpl.fields.map( ( field ) => (
									<FieldPreview key={ field.name } field={ field } />
								) ) }
								<div className="deferforms-mt-1 deferforms-h-10 deferforms-w-32 deferforms-rounded-lg deferforms-bg-ink" />
							</div>
						</div>

						<footer className="deferforms-flex deferforms-items-center deferforms-justify-between deferforms-gap-3 deferforms-border-t deferforms-border-line deferforms-px-6 deferforms-py-4">
							<span className="deferforms-text-[14px] deferforms-text-stone-500">
								{ tpl.fields.length } { __( 'fields', 'defer-forms-for-contact-form-7' ) }
							</span>
							<button
								type="button"
								disabled={ busy }
								onClick={ () => onUse( tpl ) }
								className="deferforms-inline-flex deferforms-h-9 deferforms-cursor-pointer deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border-0 deferforms-bg-ink deferforms-px-5 deferforms-text-sm deferforms-font-semibold deferforms-text-white deferforms-transition hover:deferforms-opacity-90 disabled:deferforms-cursor-not-allowed disabled:deferforms-opacity-60"
							>
								{ busy ? <Loader2 className="deferforms-h-4 deferforms-w-4 deferforms-animate-spin" /> : <Plus className="deferforms-h-4 deferforms-w-4" /> }
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
		<div className="deferforms-flex deferforms-h-full deferforms-flex-col deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-5 deferforms-transition-colors hover:deferforms-border-stroke">
			<div className="deferforms-mb-3 deferforms-flex deferforms-items-start deferforms-justify-between">
				<div className="deferforms-flex deferforms-h-11 deferforms-w-11 deferforms-items-center deferforms-justify-center deferforms-rounded-xl deferforms-bg-accent-50 deferforms-text-accent">
					<Icon className="deferforms-h-5 deferforms-w-5" />
				</div>
				<span className="deferforms-text-[14px] deferforms-font-semibold deferforms-uppercase deferforms-tracking-wider deferforms-text-stone-400">
					{ tpl.category }
				</span>
			</div>

			<h3 className="deferforms-m-0 deferforms-text-base deferforms-font-semibold deferforms-text-ink">{ tpl.name }</h3>
			<p className="deferforms-mb-0 deferforms-mt-1.5 deferforms-text-[14px] deferforms-leading-relaxed deferforms-text-stone-500">{ tpl.description }</p>

			<div className="deferforms-mt-auto deferforms-flex deferforms-gap-2 deferforms-pt-5">
				<button
					type="button"
					onClick={ () => onPreview( tpl ) }
					className="deferforms-inline-flex deferforms-h-9 deferforms-flex-1 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-gap-1.5 deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-text-[14px] deferforms-font-semibold deferforms-text-ink deferforms-transition-colors hover:deferforms-bg-stone-50"
				>
					<Eye className="deferforms-h-3.5 deferforms-w-3.5 deferforms-text-stone-400" />
					{ __( 'Preview', 'defer-forms-for-contact-form-7' ) }
				</button>
				<button
					type="button"
					disabled={ busy }
					onClick={ () => onUse( tpl ) }
					className="deferforms-inline-flex deferforms-h-9 deferforms-flex-1 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-gap-1.5 deferforms-rounded-lg deferforms-border-0 deferforms-bg-ink deferforms-text-[14px] deferforms-font-semibold deferforms-text-white deferforms-transition hover:deferforms-opacity-90 disabled:deferforms-cursor-not-allowed disabled:deferforms-opacity-60"
				>
					{ busy ? <Loader2 className="deferforms-h-3.5 deferforms-w-3.5 deferforms-animate-spin" /> : <Plus className="deferforms-h-3.5 deferforms-w-3.5" /> }
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
	<div className="deferforms-flex deferforms-h-full deferforms-flex-col deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-5">
		<div className="deferforms-mb-3 deferforms-flex deferforms-items-start deferforms-justify-between">
			<div className="deferforms-h-11 deferforms-w-11 deferforms-animate-pulse deferforms-rounded-xl deferforms-bg-stone-100" />
			<Shimmer w="deferforms-w-16" text="deferforms-text-[14px]" />
		</div>

		<Shimmer as="h3" w="deferforms-w-2/3" text="deferforms-text-base" />

		<p className="deferforms-mb-0 deferforms-mt-1.5 deferforms-text-[14px] deferforms-leading-relaxed">
			<Shimmer w="deferforms-w-full" />
			<Shimmer w="deferforms-w-4/5" />
		</p>

		<div className="deferforms-mt-auto deferforms-flex deferforms-gap-2 deferforms-pt-5">
			<div className="deferforms-h-9 deferforms-flex-1 deferforms-animate-pulse deferforms-rounded-lg deferforms-bg-stone-100" />
			<div className="deferforms-h-9 deferforms-flex-1 deferforms-animate-pulse deferforms-rounded-lg deferforms-bg-stone-100" />
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
		apiFetch( { path: 'deferforms/v1/templates' } )
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
			const res = await apiFetch( { path: `deferforms/v1/templates/${ tpl.slug }/create`, method: 'POST' } );
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
				<div className="deferforms-grid deferforms-grid-cols-1 deferforms-gap-4 sm:deferforms-grid-cols-2 lg:deferforms-grid-cols-3 xl:deferforms-grid-cols-4">
					{ Array.from( { length: 8 } ).map( ( _, i ) => <SkeletonCard key={ i } /> ) }
				</div>
			);
		}

		if ( 0 === filtered.length ) {
			return (
				<div className="deferforms-py-20 deferforms-text-center deferforms-text-sm deferforms-text-stone-500">
					{ __( 'No templates match your search.', 'defer-forms-for-contact-form-7' ) }
				</div>
			);
		}

		return (
			<div className="deferforms-grid deferforms-grid-cols-1 deferforms-gap-4 sm:deferforms-grid-cols-2 lg:deferforms-grid-cols-3 xl:deferforms-grid-cols-4">
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
				<div className="deferforms-mb-4 deferforms-rounded-lg deferforms-border deferforms-border-red-200 deferforms-bg-red-50 deferforms-px-4 deferforms-py-3 deferforms-text-sm deferforms-font-medium deferforms-text-red-700">
					{ error }
				</div>
			) }

			<div className="deferforms-mb-6 deferforms-relative deferforms-w-full sm:deferforms-w-80">
				<Search className="deferforms-pointer-events-none deferforms-absolute deferforms-left-3 deferforms-top-1/2 deferforms-h-4 deferforms-w-4 -deferforms-translate-y-1/2 deferforms-text-stone-400" />
				<input
					type="search"
					value={ search }
					onChange={ ( event ) => setSearch( event.target.value ) }
					placeholder={ __( 'Search templates…', 'defer-forms-for-contact-form-7' ) }
					className={ `deferforms-h-9 deferforms-w-full deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-pl-10 deferforms-pr-3 deferforms-text-sm deferforms-text-ink deferforms-transition-colors placeholder:deferforms-text-stone-400 ${ focusRing }` }
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

const mount = document.getElementById( 'deferforms-templates-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
