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
	<div className="df7-flex df7-flex-col df7-gap-1">
		<span className="df7-text-base df7-font-semibold df7-text-ink">{ label }</span>
		{ help && <span className="df7-text-[15px] df7-leading-relaxed df7-text-stone-500">{ help }</span> }
	</div>
);

export const TextField = ( { label, help, type = 'text', value, onChange, disabled, width = 'df7-w-full', loading = false, ...rest } ) => (
	<div className="df7-flex df7-flex-col df7-gap-2">
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
				className={ `${ control } df7-animate-pulse df7-border-transparent df7-bg-stone-100 ${ width }` }
			/>
		) : (
		<input
			type={ type }
			value={ value }
			disabled={ disabled }
			onChange={ ( event ) => onChange( event.target.value ) }
			className={ `${ control } disabled:df7-bg-stone-50 disabled:df7-text-stone-400 ${ width }` }
			{ ...rest }
		/>
		) }
	</div>
);

// Swatch and hex box edit the same value; the swatch is the quick way in, the
// text box is how you paste a brand colour.
export const ColorField = ( { label, help, value, onChange, loading = false } ) => (
	<div className="df7-flex df7-flex-col df7-gap-2">
		<FieldLabel label={ label } help={ help } />
		<div className="df7-flex df7-items-center df7-gap-2">
			{ loading ? (
				<>
					<span className="df7-h-9 df7-w-12 df7-animate-pulse df7-rounded-lg df7-bg-stone-100" />
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
						className={ `${ control } df7-w-28 df7-animate-pulse df7-border-transparent df7-bg-stone-100` }
					/>
				</>
			) : (
			<>
			<input
				type="color"
				value={ value }
				onChange={ ( event ) => onChange( event.target.value ) }
				aria-label={ label }
				className="df7-h-9 df7-w-12 df7-cursor-pointer df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-p-1"
			/>
			<input
				type="text"
				value={ value }
				spellCheck="false"
				onChange={ ( event ) => onChange( event.target.value ) }
				className={ `${ control } df7-w-28 df7-font-mono` }
			/>
			</>
			) }
		</div>
	</div>
);

// The admin reset strips `appearance` from every input, which also removes a
// range's native track — `.df7-range` in admin.css draws it back, and reads the
// fill position from --df7-range-p.
export const SizeField = ( { label, help, value, onChange, min, max, unit = 'px', loading = false } ) => {
	const percent = max > min ? ( ( value - min ) / ( max - min ) ) * 100 : 0;

	return (
		<div className="df7-flex df7-flex-col df7-gap-2">
			<FieldLabel label={ label } help={ help } />
			<div className="df7-flex df7-items-center df7-gap-4">
				{ loading ? (
					<>
						<span className="df7-h-1.5 df7-flex-1 df7-animate-pulse df7-rounded-full df7-bg-stone-100" />
						<span className="df7-w-14 df7-shrink-0 df7-rounded-lg df7-border df7-border-line df7-bg-white df7-px-2 df7-py-1 df7-text-center df7-text-[14px] df7-text-transparent">
							<span className="df7-block df7-animate-pulse df7-rounded df7-bg-stone-100">{ '\u00a0' }</span>
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
					style={ { '--df7-range-p': `${ percent }%` } }
					className="df7-range df7-flex-1"
				/>
				<span className="df7-w-14 df7-shrink-0 df7-rounded-lg df7-border df7-border-line df7-bg-white df7-px-2 df7-py-1 df7-text-center df7-text-[14px] df7-font-bold df7-tnum df7-text-ink">
					{ value }{ unit }
				</span>
				</>
				) }
			</div>
		</div>
	);
};

export const ToggleField = ( { label, help, checked, onChange, disabled, loading = false } ) => (
	<div className={ `df7-flex df7-items-start df7-justify-between df7-gap-6 ${ disabled ? 'df7-opacity-60' : '' }` }>
		<FieldLabel label={ label } help={ help } />
		{ loading
			? <span className="df7-h-6 df7-w-11 df7-shrink-0 df7-animate-pulse df7-rounded-full df7-bg-stone-100" />
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
			aria-label={ __( 'Save changes', 'defer-forms-for-contact-form-7' ) }
			className="df7-sticky df7-bottom-4 df7-z-20 df7-flex df7-flex-wrap df7-items-center df7-justify-end df7-gap-3 df7-rounded-2xl df7-border df7-border-line df7-bg-white/95 df7-px-4 df7-py-3 df7-shadow-pop df7-backdrop-blur"
		>
			{ dirty && 'error' !== status && (
				<span className="df7-mr-auto df7-text-[15px] df7-font-medium df7-text-stone-500" aria-live="polite">
					{ saving ? __( 'Saving…', 'defer-forms-for-contact-form-7' ) : __( 'You have unsaved changes', 'defer-forms-for-contact-form-7' ) }
				</span>
			) }
			{ 'saved' === status && (
				<span className="df7-mr-auto df7-flex df7-items-center df7-gap-1.5 df7-text-[15px] df7-font-medium df7-text-emerald-600" aria-live="polite">
					<Check className="df7-h-4 df7-w-4" />
					{ __( 'Saved', 'defer-forms-for-contact-form-7' ) }
				</span>
			) }
			{ 'error' === status && (
				<span className="df7-mr-auto df7-text-[15px] df7-font-medium df7-text-red-600" aria-live="polite">
					{ problem || __( 'Failed to save', 'defer-forms-for-contact-form-7' ) }
				</span>
			) }
			<button
				type="button"
				disabled={ saving || ! dirty }
				onClick={ onSave }
				className={ `${ btnPrimary } df7-px-5` }
			>
				{ saving && <Loader2 className="df7-h-4 df7-w-4 df7-animate-spin" /> }
				{ __( 'Save changes', 'defer-forms-for-contact-form-7' ) }
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
	<div className={ `df7-flex df7-flex-col df7-gap-5 ${ className }` }>{ children }</div>
);

export const SectionCard = ( { title, description, children } ) => (
	<div className="df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-7">
		{ title && (
			<div className="df7-mb-6 df7-border-b df7-border-line df7-pb-4">
				<h2 className="df7-m-0 df7-text-xl df7-font-bold df7-text-ink">{ title }</h2>
				{ description && <p className="df7-mb-0 df7-mt-1 df7-text-[15px] df7-text-stone-500">{ description }</p> }
			</div>
		) }
		<div className="df7-flex df7-flex-col df7-gap-7">{ children }</div>
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
