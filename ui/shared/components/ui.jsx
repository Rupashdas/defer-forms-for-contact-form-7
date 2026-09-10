/**
 * Shared UI primitives. The Submissions page is the visual reference: ink-filled
 * primary actions and active tabs, the neutral `accent` scale for focus rings and
 * subtle highlights, controls at h-9, cards at rounded-2xl / border-line.
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check, X } from 'lucide-react';

/**
 * The click-outside-to-close sheet behind a dialog or drawer.
 *
 * A `<button>` rather than a styled `<div>`, because closing is a real action:
 * on a div it worked for a mouse and for nothing else, and assistive tech was
 * told there was nothing there at all. Deliberately out of the tab order —
 * every dialog already carries a Close control and an Escape handler, and this
 * is the shortcut rather than the way.
 *
 * The caller keeps its own `className`: the five backdrops differ in stacking
 * order and how dark they go, and none of that belongs here. Only the reset and
 * the behaviour do — a bare button would otherwise wear wp-admin's border and
 * padding, since Tailwind's preflight is off in this build.
 */
export const Backdrop = ( { onClick, className } ) => (
	<button
		type="button"
		tabIndex={ -1 }
		onClick={ onClick }
		aria-label={ __( 'Close', 'defer-forms-for-contact-form-7' ) }
		className={ `deferforms-cursor-default deferforms-appearance-none deferforms-border-0 deferforms-p-0 ${ className }` }
	/>
);

const BTN_BASE =
	'deferforms-inline-flex deferforms-h-9 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-gap-2 deferforms-rounded-lg deferforms-px-4 deferforms-text-sm deferforms-font-semibold deferforms-no-underline deferforms-transition disabled:deferforms-cursor-not-allowed disabled:deferforms-opacity-50';

const BTN_VARIANTS = {
	primary: 'deferforms-border-0 deferforms-bg-ink deferforms-text-white hover:deferforms-opacity-90 active:deferforms-opacity-100',
	ghost:   'deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-text-ink hover:deferforms-bg-stone-50',
	danger:  'deferforms-border-0 deferforms-bg-red-600 deferforms-text-white hover:deferforms-bg-red-700',
};

export const Button = ( { variant = 'primary', className = '', children, ...props } ) => (
	<button type="button" className={ `${ BTN_BASE } ${ BTN_VARIANTS[ variant ] || BTN_VARIANTS.primary } ${ className }` } { ...props }>
		{ children }
	</button>
);

// Class tokens for buttons that need inline markup (dynamic icons, links, etc.).
export const btnPrimary = `${ BTN_BASE } ${ BTN_VARIANTS.primary }`;
export const btnGhost   = `${ BTN_BASE } ${ BTN_VARIANTS.ghost }`;
export const btnDanger  = `${ BTN_BASE } ${ BTN_VARIANTS.danger }`;

// tabs: [ { id, label, count? } ]. Pill row; the ink highlight slides between
// tabs via a shared-layout marker (framer-motion layoutId).
let tabsSeq = 0;
export const Tabs = ( { tabs, active, onChange, className = '' } ) => {
	const groupId = useRef( `deferforms-tabs-${ ++tabsSeq }` ).current;
	return (
		<div className={ `deferforms-inline-flex deferforms-flex-wrap deferforms-gap-1 deferforms-rounded-xl deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-p-1 ${ className }` }>
			{ tabs.map( ( tab ) => {
				const isActive = active === tab.id;
				return (
					<button
						key={ tab.id || 'default' }
						type="button"
						onClick={ () => onChange( tab.id ) }
						className={ `deferforms-relative deferforms-flex deferforms-cursor-pointer deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border-0 deferforms-bg-transparent deferforms-px-3 deferforms-py-1.5 deferforms-text-sm deferforms-font-semibold deferforms-transition-colors ${
							isActive ? 'deferforms-text-white' : 'deferforms-text-stone-500 hover:deferforms-text-ink'
						}` }
					>
						{ isActive && (
							<motion.span
								layoutId={ `${ groupId }-marker` }
								className="deferforms-absolute deferforms-inset-0 deferforms-rounded-lg deferforms-bg-ink"
								transition={ { type: 'spring', stiffness: 480, damping: 38 } }
							/>
						) }
						<span className="deferforms-relative deferforms-z-10">{ tab.label }</span>
						{ null != tab.count && (
							<span className={ `deferforms-relative deferforms-z-10 deferforms-rounded-full deferforms-px-1.5 deferforms-py-0.5 deferforms-text-[14px] deferforms-font-bold deferforms-tnum ${
								isActive ? 'deferforms-bg-white/20 deferforms-text-white' : 'deferforms-bg-stone-100 deferforms-text-stone-500'
							}` }>
								{ tab.count }
							</span>
						) }
					</button>
				);
			} ) }
		</div>
	);
};

/**
 * One focus treatment for every control in this admin.
 *
 * WordPress styles `input`, `select` and `textarea` on focus with its own
 * theme-coloured `box-shadow`. Our dropdown is a `<button>`, so that rule never
 * reached it: a text field lit up blue and the dropdown beside it did nothing.
 * Setting our own ring here — Tailwind emits it `!important` — replaces WP's on
 * the elements it claims and adds one to the elements it does not.
 *
 * 3px of softened ink is the same ring assets/css/controls.css draws on the
 * front end, so a form looks focused the same way in both places.
 */
/*
 * For text controls, and only those.
 *
 * `focus:`, not `focus-visible:`: clicking into a box to type is exactly when
 * its focus style should appear, and a caret with no border change looks like
 * nothing happened.
 *
 * Buttons and links are the other case and are covered by the rule in
 * admin.css, which is focus-visible — a ring left around a button you clicked
 * was the complaint that started this. Putting this token on one of them is
 * how the two behaviours got mixed in the first place, so it is not on any.
 */
export const focusRing = 'focus:deferforms-border-accent focus:deferforms-outline-none focus:deferforms-ring-[3px] focus:deferforms-ring-ink/10';

// Shared class tokens for inputs/selects and surface cards.
export const control = `deferforms-h-9 deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-px-3 deferforms-text-sm deferforms-text-ink deferforms-transition-colors ${ focusRing }`;
export const card    = 'deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white';

/**
 * A grey bar standing in for a line of text while it loads.
 *
 * `text` is the very same size class the real line wears, and the bar takes its
 * height from that line box — not from a number chosen to look about right.
 *
 * Every skeleton here used to guess, and every guess was short: h-5 (20px) for
 * a text-base line that renders at 24, h-3 (12px) for a 14px line that renders
 * at 21. Four such lines in one card, and the card grew thirteen pixels the
 * moment its content arrived — measured on the Forms page, eight cards jumping
 * together. Guessed numbers also drift: nothing connects h-3 to text-[14px], so
 * a change to one leaves the other behind with no test able to notice.
 *
 * The space is what draws the line box. It is transparent, and the bar's own
 * background is what you see.
 *
 * `as` matters as much as the size class, which is the part that is easy to
 * miss: WordPress's admin stylesheet gives `p` a line-height of 1.5 and leaves
 * everything else on 1.3, so at 14px a paragraph is 21px tall and a span with
 * the identical class is 18.2. Measured in the admin, not assumed. Stand in for
 * a `<p>` with a span and the card is three pixels short per line.
 *
 * Fixed-size things — an icon tile, a button — are not this. They have a real
 * height of their own, and a skeleton should simply repeat it.
 */
export const Shimmer = ( { as: Tag = 'span', w = 'deferforms-w-full', text = '', className = '' } ) => (
	<Tag
		aria-hidden="true"
		className={ `deferforms-m-0 deferforms-block deferforms-animate-pulse deferforms-rounded deferforms-bg-stone-100 deferforms-text-transparent ${ text } ${ w } ${ className }` }
	>
		{ '\u00a0' }
	</Tag>
);

const SELECT_TRIGGER = `deferforms-flex deferforms-h-9 deferforms-w-full deferforms-shrink-0 deferforms-cursor-pointer deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-pl-3 deferforms-pr-2.5 deferforms-text-sm deferforms-text-ink deferforms-transition-colors hover:deferforms-border-stone-300 ${ focusRing }`;

/**
 * A filter box earns its place once the list is long enough that reading it is
 * work — a three-option dropdown with a search field above it is furniture.
 * Chosen by count rather than by a prop so a caller listing whatever the site
 * happens to hold (pages, forms) gets one without having to predict the number.
 */
const SEARCH_FROM = 8;

// Custom dropdown replacing native <select>. options: [ { value, label } ].
// `className` styles the relative wrapper; `menuClassName` widens the popover.
// `inline` renders the menu in-flow (pushes content / grows the panel) instead of
// as an absolute scrollable popover.
export const Select = ( { value, onChange, options, icon: Icon, align = 'left', placeholder = '—', className = '', menuClassName = '', inline = false } ) => {
	const [ open, setOpen ] = useState( false );
	const [ query, setQuery ] = useState( '' );
	const ref = useRef( null );
	const search = useRef( null );

	useEffect( () => {
		if ( ! open ) {
			// Cleared on the way out, not the way in, so reopening never shows a
			// list still filtered by whatever was typed last time.
			setQuery( '' );
			return;
		}
		const onDocClick = ( event ) => {
			if ( ref.current && ! ref.current.contains( event.target ) ) {
				setOpen( false );
			}
		};
		const onKey = ( event ) => 'Escape' === event.key && setOpen( false );
		document.addEventListener( 'mousedown', onDocClick );
		window.addEventListener( 'keydown', onKey );

		// The panel animates in, but focus does not have to wait for it.
		if ( search.current ) {
			search.current.focus();
		}

		return () => {
			document.removeEventListener( 'mousedown', onDocClick );
			window.removeEventListener( 'keydown', onKey );
		};
	}, [ open ] );

	const selected = options.find( ( option ) => option.value === value );

	const searchable = options.length >= SEARCH_FROM;
	const needle = query.trim().toLowerCase();
	const shown = needle
		? options.filter( ( option ) => String( option.label ).toLowerCase().includes( needle ) )
		: options;

	return (
		<div ref={ ref } className={ `deferforms-relative ${ className }` }>
			<button type="button" onClick={ () => setOpen( ( isOpen ) => ! isOpen ) } className={ SELECT_TRIGGER }>
				{ Icon && <Icon className="deferforms-h-4 deferforms-w-4 deferforms-shrink-0 deferforms-text-stone-400" /> }
				<span className={ `deferforms-flex-1 deferforms-truncate deferforms-text-left ${ selected ? '' : 'deferforms-text-stone-400' }` }>{ selected ? selected.label : placeholder }</span>
				<ChevronDown className={ `deferforms-h-4 deferforms-w-4 deferforms-shrink-0 deferforms-text-stone-400 deferforms-transition-transform ${ open ? 'deferforms-rotate-180' : '' }` } />
			</button>

			<AnimatePresence>
				{ open && (
					<motion.div
						initial={ { opacity: 0, y: -4 } }
						animate={ { opacity: 1, y: 0 } }
						exit={ { opacity: 0, y: -4 } }
						transition={ { duration: 0.12 } }
						className={ `${
							inline
								? 'deferforms-mt-1.5 deferforms-flex deferforms-w-full deferforms-flex-col deferforms-gap-1 deferforms-rounded-lg deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-1'
								: `deferforms-absolute deferforms-z-30 deferforms-mt-1.5 deferforms-flex deferforms-min-w-full deferforms-flex-col deferforms-gap-1 deferforms-rounded-lg deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-1 deferforms-shadow-pop ${ 'right' === align ? 'deferforms-right-0' : 'deferforms-left-0' }`
						} ${ menuClassName }` }
					>
						{ searchable && (
							<input
								ref={ search }
								type="text"
								value={ query }
								onChange={ ( event ) => setQuery( event.target.value ) }
								placeholder={ __( 'Search…', 'defer-forms-for-contact-form-7' ) }
								aria-label={ __( 'Search…', 'defer-forms-for-contact-form-7' ) }
								className={ `deferforms-h-8 deferforms-w-full deferforms-shrink-0 deferforms-rounded deferforms-border deferforms-border-stroke deferforms-bg-white deferforms-px-2.5 deferforms-text-sm deferforms-text-ink ${ focusRing }` }
							/>
						) }

						{ /* The scroll lives here rather than on the panel, or the
						     search box would scroll away with the list it filters. */ }
						<div className={ inline ? 'deferforms-flex deferforms-flex-col deferforms-gap-0.5' : 'deferforms-scroll deferforms-flex deferforms-max-h-72 deferforms-flex-col deferforms-gap-0.5 deferforms-overflow-auto' }>
							{ shown.map( ( option ) => {
								const isSelected = option.value === value;
								return (
									<button
										key={ String( option.value ) }
										type="button"
										onClick={ () => {
											onChange( option.value );
											setOpen( false );
										} }
										className={ `deferforms-flex deferforms-w-full deferforms-cursor-pointer deferforms-items-center deferforms-gap-2 deferforms-rounded deferforms-border-0 deferforms-px-2.5 deferforms-py-2 deferforms-text-left deferforms-text-sm deferforms-transition-colors ${
											isSelected
												? 'deferforms-bg-accent-50 deferforms-font-semibold deferforms-text-accent-700'
												: 'deferforms-bg-transparent deferforms-text-ink hover:deferforms-bg-stone-50'
										}` }
									>
										<span className="deferforms-flex-1 deferforms-truncate">{ option.label }</span>
										{ isSelected && <Check className="deferforms-h-4 deferforms-w-4 deferforms-shrink-0 deferforms-text-accent" /> }
									</button>
								);
							} ) }

							{ ! shown.length && (
								<p className="deferforms-m-0 deferforms-px-2.5 deferforms-py-2 deferforms-text-sm deferforms-text-stone-400">
									{ __( 'No matches', 'defer-forms-for-contact-form-7' ) }
								</p>
							) }
						</div>
					</motion.div>
				) }
			</AnimatePresence>
		</div>
	);
};

/**
 * A dialog over a dimmed page, anchored below the top of the window.
 *
 * It appears and disappears at once — no fade, no scale, and no height
 * animation on the body. Asked for directly: the panel used to ease its own
 * height on open, which read as a jump rather than as motion.
 *
 * Anchored rather than centred, and that is load-bearing. A centred panel whose
 * content changes height moves by half the difference in *both* directions:
 * measured on the field editor, switching tabs swung the panel between 302px
 * and 730px and slid its header 214px up the screen. The sliding tab marker
 * animates from wherever it was, so it travelled diagonally. Anchoring the top
 * means a taller panel only grows downward and the header never moves.
 *
 * Escape and a click on the backdrop both close it. `busy` blocks both, so a
 * dialog cannot be dismissed out from under a request that is already running.
 */
export const Modal = ( { title, wide, busy = false, onClose, footer, children } ) => {
	const panel = useRef( null );

	useEffect( () => {
		const onKey = ( event ) => {
			if ( 'Escape' === event.key && ! busy ) {
				onClose();
			}
		};
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	}, [ onClose, busy ] );

	// Focus moves into the dialog so Tab stays here and Escape reaches the
	// handler above without the page behind having to be clicked first.
	//
	// Matched on `data-deferforms-close`, not on the close button's aria-label. The
	// label is translated, so `button:not([aria-label="Close"])` only excluded
	// the right button in English — on any other locale the first thing focused
	// when a dialog opened was the ✕, not the field the user came to fill in.
	useEffect( () => {
		const first = panel.current && panel.current.querySelector(
			'input, select, textarea, button:not([data-deferforms-close])'
		);
		if ( first ) {
			first.focus();
		}
	}, [] );

	return (
		<div className="deferforms-fixed deferforms-inset-0 deferforms-z-[100000] deferforms-flex deferforms-items-start deferforms-justify-center deferforms-px-4 deferforms-pb-4 deferforms-pt-[7vh]">
			<Backdrop
				onClick={ () => ! busy && onClose() }
				className="deferforms-absolute deferforms-inset-0 deferforms-bg-ink/40 deferforms-backdrop-blur-sm"
			/>
			<div
				ref={ panel }
				role="dialog"
				aria-modal="true"
				aria-label={ title }
				className={ `deferforms-relative deferforms-flex deferforms-max-h-[85vh] deferforms-w-full ${ wide ? 'deferforms-max-w-2xl' : 'deferforms-max-w-lg' } deferforms-flex-col deferforms-overflow-hidden deferforms-rounded-2xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-shadow-pop` }
			>
				<header className="deferforms-flex deferforms-items-center deferforms-justify-between deferforms-gap-3 deferforms-border-b deferforms-border-line deferforms-px-6 deferforms-py-4">
					<span className="deferforms-truncate deferforms-text-lg deferforms-font-bold deferforms-text-ink">{ title }</span>
					<button
						type="button"
						onClick={ onClose }
						disabled={ busy }
						data-deferforms-close=""
						aria-label={ __( 'Close', 'defer-forms-for-contact-form-7' ) }
						className="deferforms-flex deferforms-h-9 deferforms-w-9 deferforms-shrink-0 deferforms-cursor-pointer deferforms-items-center deferforms-justify-center deferforms-rounded-lg deferforms-border-0 deferforms-bg-stone-50 deferforms-text-stone-500 hover:deferforms-bg-stone-100 hover:deferforms-text-ink disabled:deferforms-cursor-not-allowed disabled:deferforms-opacity-50"
					>
						<X className="deferforms-h-4 deferforms-w-4" />
					</button>
				</header>

				{ /* Gutter reserved on both edges so a scrollbar cannot take 10px off
				     the right only and leave every field short on that side. 14px of
				     padding plus that gutter lines the fields up with the 24px header
				     and footer. */ }
				<div className="deferforms-scroll deferforms-flex-1 deferforms-overflow-y-auto deferforms-px-3.5 deferforms-py-5" style={ { scrollbarGutter: 'stable both-edges' } }>
					{ children }
				</div>

				{ footer && (
					<footer className="deferforms-flex deferforms-items-center deferforms-gap-2 deferforms-border-t deferforms-border-line deferforms-bg-stone-50/60 deferforms-px-6 deferforms-py-4">
						{ footer }
					</footer>
				) }
			</div>
		</div>
	);
};
