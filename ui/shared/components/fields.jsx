/**
 * The labelled controls a settings screen is made of, and the save cycle behind
 * them.
 *
 * These lived inside the Settings app while it was the only screen with a form
 * in it. Styling is now a page of its own built from the same pieces, and a
 * colour box that behaves one way here and another way there is the kind of
 * drift nobody notices until a user does.
 */

import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Check, Loader2 } from 'lucide-react';

import { Toggle } from './toggle';
import { control, btnPrimary } from './ui';

export const FieldLabel = ( { label, help } ) => (
	<div className="cf7e-flex cf7e-flex-col cf7e-gap-1">
		<span className="cf7e-text-base cf7e-font-semibold cf7e-text-ink">{ label }</span>
		{ help && <span className="cf7e-text-[15px] cf7e-leading-relaxed cf7e-text-stone-500">{ help }</span> }
	</div>
);

export const TextField = ( { label, help, type = 'text', value, onChange, disabled, width = 'cf7e-w-full', loading = false, ...rest } ) => (
	<div className="cf7e-flex cf7e-flex-col cf7e-gap-2">
		<FieldLabel label={ label } help={ help } />
		{ loading ? (
			// The element itself, for the reason ColorField gives above.
			<input
				type="text"
				disabled
				value=""
				readOnly
				aria-hidden="true"
				tabIndex={ -1 }
				className={ `${ control } cf7e-animate-pulse cf7e-border-transparent cf7e-bg-stone-100 ${ width }` }
			/>
		) : (
		<input
			type={ type }
			value={ value }
			disabled={ disabled }
			onChange={ ( event ) => onChange( event.target.value ) }
			className={ `${ control } disabled:cf7e-bg-stone-50 disabled:cf7e-text-stone-400 ${ width }` }
			{ ...rest }
		/>
		) }
	</div>
);

// Swatch and hex box edit the same value; the swatch is the quick way in, the
// text box is how you paste a brand colour.
export const ColorField = ( { label, help, value, onChange, loading = false } ) => (
	<div className="cf7e-flex cf7e-flex-col cf7e-gap-2">
		<FieldLabel label={ label } help={ help } />
		<div className="cf7e-flex cf7e-items-center cf7e-gap-2">
			{ loading ? (
				<>
					<span className="cf7e-h-9 cf7e-w-12 cf7e-animate-pulse cf7e-rounded-lg cf7e-bg-stone-100" />
					{ /* A real input, disabled. WordPress's admin styles its own
					     rules onto `input` and win over the h-9 in `control`, so
					     the box is 40px and a span wearing the same classes is 36.
					     Measured; the eight colour rows were 32px short between
					     them. Being the element is the only way to be its size. */ }
					<input
						type="text"
						disabled
						value=""
						readOnly
						aria-hidden="true"
						tabIndex={ -1 }
						className={ `${ control } cf7e-w-28 cf7e-animate-pulse cf7e-border-transparent cf7e-bg-stone-100` }
					/>
				</>
			) : (
			<>
			<input
				type="color"
				value={ value }
				onChange={ ( event ) => onChange( event.target.value ) }
				aria-label={ label }
				className="cf7e-h-9 cf7e-w-12 cf7e-cursor-pointer cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-p-1"
			/>
			<input
				type="text"
				value={ value }
				spellCheck="false"
				onChange={ ( event ) => onChange( event.target.value ) }
				className={ `${ control } cf7e-w-28 cf7e-font-mono` }
			/>
			</>
			) }
		</div>
	</div>
);

// The admin reset strips `appearance` from every input, which also removes a
// range's native track — `.cf7e-range` in admin.css draws it back, and reads the
// fill position from --cf7e-range-p.
export const SizeField = ( { label, help, value, onChange, min, max, unit = 'px', loading = false } ) => {
	const percent = max > min ? ( ( value - min ) / ( max - min ) ) * 100 : 0;

	return (
		<div className="cf7e-flex cf7e-flex-col cf7e-gap-2">
			<FieldLabel label={ label } help={ help } />
			<div className="cf7e-flex cf7e-items-center cf7e-gap-4">
				{ loading ? (
					<>
						<span className="cf7e-h-1.5 cf7e-flex-1 cf7e-animate-pulse cf7e-rounded-full cf7e-bg-stone-100" />
						<span className="cf7e-w-14 cf7e-shrink-0 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-white cf7e-px-2 cf7e-py-1 cf7e-text-center cf7e-text-[14px] cf7e-text-transparent">
							<span className="cf7e-block cf7e-animate-pulse cf7e-rounded cf7e-bg-stone-100">{ '\u00a0' }</span>
						</span>
					</>
				) : (
				<>
				<input
					type="range"
					min={ min }
					max={ max }
					value={ value }
					onChange={ ( event ) => onChange( parseInt( event.target.value, 10 ) ) }
					style={ { '--cf7e-range-p': `${ percent }%` } }
					className="cf7e-range cf7e-flex-1"
				/>
				<span className="cf7e-w-14 cf7e-shrink-0 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-white cf7e-px-2 cf7e-py-1 cf7e-text-center cf7e-text-[14px] cf7e-font-bold cf7e-tnum cf7e-text-ink">
					{ value }{ unit }
				</span>
				</>
				) }
			</div>
		</div>
	);
};

export const ToggleField = ( { label, help, checked, onChange, disabled, loading = false } ) => (
	<div className={ `cf7e-flex cf7e-items-start cf7e-justify-between cf7e-gap-6 ${ disabled ? 'cf7e-opacity-60' : '' }` }>
		<FieldLabel label={ label } help={ help } />
		{ loading
			? <span className="cf7e-h-6 cf7e-w-11 cf7e-shrink-0 cf7e-animate-pulse cf7e-rounded-full cf7e-bg-stone-100" />
			: <Toggle checked={ checked } onChange={ onChange } disabled={ disabled } /> }
	</div>
);

/**
 * Save, kept where the eye already is.
 *
 * This used to be a plain row at the end of the panel. On Settings that was
 * nearly fine — the tabs are short. On Styling it was not: three tall cards of
 * colours, a toggle and seven sliders, so the moment you drag anything above
 * the fold the only Save on the screen is a scroll away, and because the bar
 * renders only once something is dirty it appears somewhere you cannot see.
 * A page whose whole point is "drag, look, drag again" made you leave the
 * preview to commit the work.
 *
 * `sticky bottom-4` keeps it in flow — it still occupies its slot at the end of
 * the stack, so nothing jumps — while riding along at the bottom of the viewport
 * for as long as there is page left below it. The bar names the state it is in
 * rather than relying on a lone button to imply it.
 */
export const SaveBar = ( { dirty, status, problem = '', onSave } ) => {
	const saving = 'saving' === status;

	// Ctrl/Cmd+S is the reflex on any screen that has unsaved work.
	useEffect( () => {
		if ( ! dirty || saving ) {
			return;
		}

		const onKeyDown = ( event ) => {
			if ( 's' !== event.key?.toLowerCase() || ! ( event.metaKey || event.ctrlKey ) ) {
				return;
			}
			event.preventDefault();
			onSave();
		};

		document.addEventListener( 'keydown', onKeyDown );
		return () => document.removeEventListener( 'keydown', onKeyDown );
	}, [ dirty, saving, onSave ] );

	if ( ! dirty && 'saved' !== status ) {
		return null;
	}

	return (
		<div
			role="region"
			aria-label={ __( 'Save changes', 'essentials-for-contact-form-7' ) }
			className="cf7e-sticky cf7e-bottom-4 cf7e-z-20 cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-justify-end cf7e-gap-3 cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white/95 cf7e-px-4 cf7e-py-3 cf7e-shadow-pop cf7e-backdrop-blur"
		>
			{ dirty && 'error' !== status && (
				<span className="cf7e-mr-auto cf7e-text-[15px] cf7e-font-medium cf7e-text-stone-500" aria-live="polite">
					{ saving ? __( 'Saving…', 'essentials-for-contact-form-7' ) : __( 'You have unsaved changes', 'essentials-for-contact-form-7' ) }
				</span>
			) }
			{ 'saved' === status && (
				<span className="cf7e-mr-auto cf7e-flex cf7e-items-center cf7e-gap-1.5 cf7e-text-[15px] cf7e-font-medium cf7e-text-emerald-600" aria-live="polite">
					<Check className="cf7e-h-4 cf7e-w-4" />
					{ __( 'Saved', 'essentials-for-contact-form-7' ) }
				</span>
			) }
			{ 'error' === status && (
				<span className="cf7e-mr-auto cf7e-text-[15px] cf7e-font-medium cf7e-text-red-600" aria-live="polite">
					{ problem || __( 'Failed to save', 'essentials-for-contact-form-7' ) }
				</span>
			) }
			<button
				type="button"
				disabled={ saving || ! dirty }
				onClick={ onSave }
				className={ `${ btnPrimary } cf7e-px-5` }
			>
				{ saving && <Loader2 className="cf7e-h-4 cf7e-w-4 cf7e-animate-spin" /> }
				{ __( 'Save changes', 'essentials-for-contact-form-7' ) }
			</button>
		</div>
	);
};

/**
 * Cards down a column, evenly spaced.
 *
 * The gap belongs here rather than to each card's own margin. Spacing carried by
 * the caller is spacing the caller can forget: the Spam tab has two cards and
 * nobody gave the second one a margin, so they sat welded together with no
 * seam — while the Design tab looked right only because every card after the
 * first was hand-wrapped in a margin div.
 */
export const SectionStack = ( { className = '', children } ) => (
	<div className={ `cf7e-flex cf7e-flex-col cf7e-gap-5 ${ className }` }>{ children }</div>
);

export const SectionCard = ( { title, description, children } ) => (
	<div className="cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-7">
		{ title && (
			<div className="cf7e-mb-6 cf7e-border-b cf7e-border-line cf7e-pb-4">
				<h2 className="cf7e-m-0 cf7e-text-xl cf7e-font-bold cf7e-text-ink">{ title }</h2>
				{ description && <p className="cf7e-mb-0 cf7e-mt-1 cf7e-text-[15px] cf7e-text-stone-500">{ description }</p> }
			</div>
		) }
		<div className="cf7e-flex cf7e-flex-col cf7e-gap-7">{ children }</div>
	</div>
);

/**
 * One section's editing state: a local copy, whether it differs from what the
 * server last returned, and a save that reports back through `status`.
 */
export const useSectionForm = ( values, onSave ) => {
	const [ local, setLocal ]     = useState( values );
	const [ status, setStatus ]   = useState( 'idle' );
	const [ problem, setProblem ] = useState( '' );

	useEffect( () => {
		setLocal( values );
	}, [ values ] );

	useEffect( () => {
		if ( 'saved' !== status ) {
			return;
		}
		const timer = setTimeout( () => setStatus( 'idle' ), 2000 );
		return () => clearTimeout( timer );
	}, [ status ] );

	const dirty = JSON.stringify( local ) !== JSON.stringify( values );

	const save = async () => {
		setStatus( 'saving' );
		setProblem( '' );

		try {
			await onSave( local );
			setStatus( 'saved' );
		} catch ( err ) {
			// The reason, not just the fact. A refused save said only "Failed to
			// save", so a URL rejected for being the wrong service looked
			// identical to the server being down.
			setProblem( err?.message || '' );
			setStatus( 'error' );
		}
	};

	const setField = ( key, value ) => setLocal( ( prev ) => ( { ...prev, [ key ]: value } ) );

	return { local, setField, dirty, status, problem, save };
};

/** The skeleton a settings-shaped panel shows while its values load. */
