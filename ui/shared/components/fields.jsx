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
	<div className="deferforms-flex deferforms-flex-col deferforms-gap-1">
		<span className="deferforms-text-base deferforms-font-semibold deferforms-text-ink">{ label }</span>
		{ help && <span className="deferforms-text-[15px] deferforms-leading-relaxed deferforms-text-stone-500">{ help }</span> }
	</div>
);

export const TextField = ( { label, help, type = 'text', value, onChange, disabled, width = 'deferforms-w-full', loading = false, ...rest } ) => (
	<div className="deferforms-flex deferforms-flex-col deferforms-gap-2">
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
				className={ `${ control } deferforms-animate-pulse deferforms-border-transparent deferforms-bg-stone-100 ${ width }` }
			/>
		) : (
		<input
			type={ type }
			value={ value }
			disabled={ disabled }
			onChange={ ( event ) => onChange( event.target.value ) }
			className={ `${ control } disabled:deferforms-bg-stone-50 disabled:deferforms-text-stone-400 ${ width }` }
			{ ...rest }
		/>
		) }
	</div>
);

// Swatch and hex box edit the same value; the swatch is the quick way in, the
// text box is how you paste a brand colour.
export const ColorField = ( { label, help, value, onChange, loading = false } ) => (
	<div className="deferforms-flex deferforms-flex-col deferforms-gap-2">
		<FieldLabel label={ label } help={ help } />
		<div className="deferforms-flex deferforms-items-center deferforms-gap-2">
			{ loading ? (
				<>
					<span className="deferforms-h-9 deferforms-w-12 deferforms-animate-pulse deferforms-rounded-lg deferforms-bg-stone-100" />
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
						className={ `${ control } deferforms-w-28 deferforms-animate-pulse deferforms-border-transparent deferforms-bg-stone-100` }
					/>
				</>
			) : (
			<>
			<input
				type="color"
				value={ value }
				onChange={ ( event ) => onChange( event.target.value ) }
				aria-label={ label }
				className="deferforms-h-9 deferforms-w-12 deferforms-cursor-pointer deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-p-1"
			/>
			<input
				type="text"
				value={ value }
				spellCheck="false"
				onChange={ ( event ) => onChange( event.target.value ) }
				className={ `${ control } deferforms-w-28 deferforms-font-mono` }
			/>
			</>
			) }
		</div>
	</div>
);

// The admin reset strips `appearance` from every input, which also removes a
// range's native track — `.deferforms-range` in admin.css draws it back, and reads the
// fill position from --deferforms-range-p.
export const SizeField = ( { label, help, value, onChange, min, max, unit = 'px', loading = false } ) => {
	const percent = max > min ? ( ( value - min ) / ( max - min ) ) * 100 : 0;

	return (
		<div className="deferforms-flex deferforms-flex-col deferforms-gap-2">
			<FieldLabel label={ label } help={ help } />
			<div className="deferforms-flex deferforms-items-center deferforms-gap-4">
				{ loading ? (
					<>
						<span className="deferforms-h-1.5 deferforms-flex-1 deferforms-animate-pulse deferforms-rounded-full deferforms-bg-stone-100" />
						<span className="deferforms-w-14 deferforms-shrink-0 deferforms-rounded-lg deferforms-border deferforms-border-line deferforms-bg-white deferforms-px-2 deferforms-py-1 deferforms-text-center deferforms-text-[14px] deferforms-text-transparent">
							<span className="deferforms-block deferforms-animate-pulse deferforms-rounded deferforms-bg-stone-100">{ '\u00a0' }</span>
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
					style={ { '--deferforms-range-p': `${ percent }%` } }
					className="deferforms-range deferforms-flex-1"
				/>
				<span className="deferforms-w-14 deferforms-shrink-0 deferforms-rounded-lg deferforms-border deferforms-border-line deferforms-bg-white deferforms-px-2 deferforms-py-1 deferforms-text-center deferforms-text-[14px] deferforms-font-bold deferforms-tnum deferforms-text-ink">
					{ value }{ unit }
				</span>
				</>
				) }
			</div>
		</div>
	);
};

export const ToggleField = ( { label, help, checked, onChange, disabled, loading = false } ) => (
	<div className={ `deferforms-flex deferforms-items-start deferforms-justify-between deferforms-gap-6 ${ disabled ? 'deferforms-opacity-60' : '' }` }>
		<FieldLabel label={ label } help={ help } />
		{ loading
			? <span className="deferforms-h-6 deferforms-w-11 deferforms-shrink-0 deferforms-animate-pulse deferforms-rounded-full deferforms-bg-stone-100" />
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
			className="deferforms-sticky deferforms-bottom-4 deferforms-z-20 deferforms-flex deferforms-flex-wrap deferforms-items-center deferforms-justify-end deferforms-gap-3 deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white/95 deferforms-px-4 deferforms-py-3 deferforms-shadow-pop deferforms-backdrop-blur"
		>
			{ dirty && 'error' !== status && (
				<span className="deferforms-mr-auto deferforms-text-[15px] deferforms-font-medium deferforms-text-stone-500" aria-live="polite">
					{ saving ? __( 'Saving…', 'defer-forms-for-contact-form-7' ) : __( 'You have unsaved changes', 'defer-forms-for-contact-form-7' ) }
				</span>
			) }
			{ 'saved' === status && (
				<span className="deferforms-mr-auto deferforms-flex deferforms-items-center deferforms-gap-1.5 deferforms-text-[15px] deferforms-font-medium deferforms-text-emerald-600" aria-live="polite">
					<Check className="deferforms-h-4 deferforms-w-4" />
					{ __( 'Saved', 'defer-forms-for-contact-form-7' ) }
				</span>
			) }
			{ 'error' === status && (
				<span className="deferforms-mr-auto deferforms-text-[15px] deferforms-font-medium deferforms-text-red-600" aria-live="polite">
					{ problem || __( 'Failed to save', 'defer-forms-for-contact-form-7' ) }
				</span>
			) }
			<button
				type="button"
				disabled={ saving || ! dirty }
				onClick={ onSave }
				className={ `${ btnPrimary } deferforms-px-5` }
			>
				{ saving && <Loader2 className="deferforms-h-4 deferforms-w-4 deferforms-animate-spin" /> }
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
	<div className={ `deferforms-flex deferforms-flex-col deferforms-gap-5 ${ className }` }>{ children }</div>
);

export const SectionCard = ( { title, description, children } ) => (
	<div className="deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-7">
		{ title && (
			<div className="deferforms-mb-6 deferforms-border-b deferforms-border-line deferforms-pb-4">
				<h2 className="deferforms-m-0 deferforms-text-xl deferforms-font-bold deferforms-text-ink">{ title }</h2>
				{ description && <p className="deferforms-mb-0 deferforms-mt-1 deferforms-text-[15px] deferforms-text-stone-500">{ description }</p> }
			</div>
		) }
		<div className="deferforms-flex deferforms-flex-col deferforms-gap-7">{ children }</div>
	</div>
);

/**
 * One section's editing state: a local copy, whether it differs from what the
 * server last returned, and a save that reports back through `status`.
 */
export const useSectionForm = ( values, onSave, loading = false ) => {
	const [ local, setLocal ]     = useState( values );
	const [ status, setStatus ]   = useState( 'idle' );
	const [ problem, setProblem ] = useState( '' );

	/*
	 * Caught up in the same render as loading turning false, not in an
	 * effect afterward. An effect fires a paint late, and in that one frame
	 * `local` is still its stale initial value — long enough for a field
	 * shown or hidden by `local.x` alone (nothing here checks `loading` too)
	 * to flash the wrong way before correcting.
	 */
	const [ wasLoading, setWasLoading ] = useState( loading );
	if ( wasLoading && ! loading ) {
		setWasLoading( false );
		setLocal( values );
	}

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
