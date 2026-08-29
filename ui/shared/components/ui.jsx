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
		aria-label={ __( 'Close', 'essentials-for-contact-form-7' ) }
		className={ `cf7e-cursor-default cf7e-appearance-none cf7e-border-0 cf7e-p-0 ${ className }` }
	/>
);

const BTN_BASE =
	'cf7e-inline-flex cf7e-h-9 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-gap-2 cf7e-rounded-lg cf7e-px-4 cf7e-text-sm cf7e-font-semibold cf7e-no-underline cf7e-transition disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-50';

const BTN_VARIANTS = {
	primary: 'cf7e-border-0 cf7e-bg-ink cf7e-text-white hover:cf7e-opacity-90 active:cf7e-opacity-100',
	ghost:   'cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-text-ink hover:cf7e-bg-stone-50',
	danger:  'cf7e-border-0 cf7e-bg-red-600 cf7e-text-white hover:cf7e-bg-red-700',
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
	const groupId = useRef( `cf7e-tabs-${ ++tabsSeq }` ).current;
	return (
		<div className={ `cf7e-inline-flex cf7e-flex-wrap cf7e-gap-1 cf7e-rounded-xl cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-p-1 ${ className }` }>
			{ tabs.map( ( tab ) => {
				const isActive = active === tab.id;
				return (
					<button
						key={ tab.id || 'default' }
						type="button"
						onClick={ () => onChange( tab.id ) }
						className={ `cf7e-relative cf7e-flex cf7e-cursor-pointer cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border-0 cf7e-bg-transparent cf7e-px-3 cf7e-py-1.5 cf7e-text-sm cf7e-font-semibold cf7e-transition-colors ${
							isActive ? 'cf7e-text-white' : 'cf7e-text-stone-500 hover:cf7e-text-ink'
						}` }
					>
						{ isActive && (
							<motion.span
								layoutId={ `${ groupId }-marker` }
								className="cf7e-absolute cf7e-inset-0 cf7e-rounded-lg cf7e-bg-ink"
								transition={ { type: 'spring', stiffness: 480, damping: 38 } }
							/>
						) }
						<span className="cf7e-relative cf7e-z-10">{ tab.label }</span>
						{ null != tab.count && (
							<span className={ `cf7e-relative cf7e-z-10 cf7e-rounded-full cf7e-px-1.5 cf7e-py-0.5 cf7e-text-[14px] cf7e-font-bold cf7e-tnum ${
								isActive ? 'cf7e-bg-white/20 cf7e-text-white' : 'cf7e-bg-stone-100 cf7e-text-stone-500'
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
export const focusRing = 'focus:cf7e-border-accent focus:cf7e-outline-none focus:cf7e-ring-[3px] focus:cf7e-ring-ink/10';

// Shared class tokens for inputs/selects and surface cards.
export const control = `cf7e-h-9 cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-px-3 cf7e-text-sm cf7e-text-ink cf7e-transition-colors ${ focusRing }`;
export const card    = 'cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white';

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
export const Shimmer = ( { as: Tag = 'span', w = 'cf7e-w-full', text = '', className = '' } ) => (
	<Tag
		aria-hidden="true"
		className={ `cf7e-m-0 cf7e-block cf7e-animate-pulse cf7e-rounded cf7e-bg-stone-100 cf7e-text-transparent ${ text } ${ w } ${ className }` }
	>
		{ '\u00a0' }
	</Tag>
);

const SELECT_TRIGGER = `cf7e-flex cf7e-h-9 cf7e-w-full cf7e-shrink-0 cf7e-cursor-pointer cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-pl-3 cf7e-pr-2.5 cf7e-text-sm cf7e-text-ink cf7e-transition-colors hover:cf7e-border-stone-300 ${ focusRing }`;

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
		<div ref={ ref } className={ `cf7e-relative ${ className }` }>
			<button type="button" onClick={ () => setOpen( ( isOpen ) => ! isOpen ) } className={ SELECT_TRIGGER }>
				{ Icon && <Icon className="cf7e-h-4 cf7e-w-4 cf7e-shrink-0 cf7e-text-stone-400" /> }
				<span className={ `cf7e-flex-1 cf7e-truncate cf7e-text-left ${ selected ? '' : 'cf7e-text-stone-400' }` }>{ selected ? selected.label : placeholder }</span>
				<ChevronDown className={ `cf7e-h-4 cf7e-w-4 cf7e-shrink-0 cf7e-text-stone-400 cf7e-transition-transform ${ open ? 'cf7e-rotate-180' : '' }` } />
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
								? 'cf7e-mt-1.5 cf7e-flex cf7e-w-full cf7e-flex-col cf7e-gap-1 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-1'
								: `cf7e-absolute cf7e-z-30 cf7e-mt-1.5 cf7e-flex cf7e-min-w-full cf7e-flex-col cf7e-gap-1 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-1 cf7e-shadow-pop ${ 'right' === align ? 'cf7e-right-0' : 'cf7e-left-0' }`
						} ${ menuClassName }` }
					>
						{ searchable && (
							<input
								ref={ search }
								type="text"
								value={ query }
								onChange={ ( event ) => setQuery( event.target.value ) }
								placeholder={ __( 'Search…', 'essentials-for-contact-form-7' ) }
								aria-label={ __( 'Search…', 'essentials-for-contact-form-7' ) }
								className={ `cf7e-h-8 cf7e-w-full cf7e-shrink-0 cf7e-rounded cf7e-border cf7e-border-stroke cf7e-bg-white cf7e-px-2.5 cf7e-text-sm cf7e-text-ink ${ focusRing }` }
							/>
						) }

						{ /* The scroll lives here rather than on the panel, or the
						     search box would scroll away with the list it filters. */ }
						<div className={ inline ? 'cf7e-flex cf7e-flex-col cf7e-gap-0.5' : 'cf7e-scroll cf7e-flex cf7e-max-h-72 cf7e-flex-col cf7e-gap-0.5 cf7e-overflow-auto' }>
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
										className={ `cf7e-flex cf7e-w-full cf7e-cursor-pointer cf7e-items-center cf7e-gap-2 cf7e-rounded cf7e-border-0 cf7e-px-2.5 cf7e-py-2 cf7e-text-left cf7e-text-sm cf7e-transition-colors ${
											isSelected
												? 'cf7e-bg-accent-50 cf7e-font-semibold cf7e-text-accent-700'
												: 'cf7e-bg-transparent cf7e-text-ink hover:cf7e-bg-stone-50'
										}` }
									>
										<span className="cf7e-flex-1 cf7e-truncate">{ option.label }</span>
										{ isSelected && <Check className="cf7e-h-4 cf7e-w-4 cf7e-shrink-0 cf7e-text-accent" /> }
									</button>
								);
							} ) }

							{ ! shown.length && (
								<p className="cf7e-m-0 cf7e-px-2.5 cf7e-py-2 cf7e-text-sm cf7e-text-stone-400">
									{ __( 'No matches', 'essentials-for-contact-form-7' ) }
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
	// Matched on `data-cf7e-close`, not on the close button's aria-label. The
	// label is translated, so `button:not([aria-label="Close"])` only excluded
	// the right button in English — on any other locale the first thing focused
	// when a dialog opened was the ✕, not the field the user came to fill in.
	useEffect( () => {
		const first = panel.current && panel.current.querySelector(
			'input, select, textarea, button:not([data-cf7e-close])'
		);
		if ( first ) {
			first.focus();
		}
	}, [] );

	return (
		<div className="cf7e-fixed cf7e-inset-0 cf7e-z-[100000] cf7e-flex cf7e-items-start cf7e-justify-center cf7e-px-4 cf7e-pb-4 cf7e-pt-[7vh]">
			<Backdrop
				onClick={ () => ! busy && onClose() }
				className="cf7e-absolute cf7e-inset-0 cf7e-bg-ink/40 cf7e-backdrop-blur-sm"
			/>
			<div
				ref={ panel }
				role="dialog"
				aria-modal="true"
				aria-label={ title }
				className={ `cf7e-relative cf7e-flex cf7e-max-h-[85vh] cf7e-w-full ${ wide ? 'cf7e-max-w-2xl' : 'cf7e-max-w-lg' } cf7e-flex-col cf7e-overflow-hidden cf7e-rounded-2xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-shadow-pop` }
			>
				<header className="cf7e-flex cf7e-items-center cf7e-justify-between cf7e-gap-3 cf7e-border-b cf7e-border-line cf7e-px-6 cf7e-py-4">
					<span className="cf7e-truncate cf7e-text-lg cf7e-font-bold cf7e-text-ink">{ title }</span>
					<button
						type="button"
						onClick={ onClose }
						disabled={ busy }
						data-cf7e-close=""
						aria-label={ __( 'Close', 'essentials-for-contact-form-7' ) }
						className="cf7e-flex cf7e-h-9 cf7e-w-9 cf7e-shrink-0 cf7e-cursor-pointer cf7e-items-center cf7e-justify-center cf7e-rounded-lg cf7e-border-0 cf7e-bg-stone-50 cf7e-text-stone-500 hover:cf7e-bg-stone-100 hover:cf7e-text-ink disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-50"
					>
						<X className="cf7e-h-4 cf7e-w-4" />
					</button>
				</header>

				{ /* Gutter reserved on both edges so a scrollbar cannot take 10px off
				     the right only and leave every field short on that side. 14px of
				     padding plus that gutter lines the fields up with the 24px header
				     and footer. */ }
				<div className="cf7e-scroll cf7e-flex-1 cf7e-overflow-y-auto cf7e-px-3.5 cf7e-py-5" style={ { scrollbarGutter: 'stable both-edges' } }>
					{ children }
				</div>

				{ footer && (
					<footer className="cf7e-flex cf7e-items-center cf7e-gap-2 cf7e-border-t cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-6 cf7e-py-4">
						{ footer }
					</footer>
				) }
			</div>
		</div>
	);
};
