/**
 * Styling — the look of every plugin-skinned form, on a page of its own.
 *
 * This was the fourth tab of Settings, behind Spam and Privacy, on a screen
 * whose own subtitle promised "how CF7 Essentials captures and handles submissions".
 * It is the one screen here that is a studio rather than a list of switches —
 * live preview, presets, sliders you drag — and nobody looks for a studio at
 * the end of a settings page.
 *
 * It writes the same `design` section over the same REST route as before, so
 * nothing about the stored values or the front end changed with the move.
 */

import { createRoot, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { RotateCcw, Check } from 'lucide-react';

import { Page, PageHeader } from '@shared/components/page';
import { btnGhost } from '@shared/components/ui';
import {
	ColorField,
	SizeField,
	ToggleField,
	SaveBar,
	SectionCard,
	SectionStack,
	useSectionForm,
} from '@shared/components/fields';
import '@shared/styles/admin.css';

/**
 * What an untouched install looks like.
 *
 * Every value here also lives in `Settings_Repository::DEFAULTS['design']`, and
 * tests/js/styling-page.js fails the build if the two ever disagree — a Reset
 * button that resets to something other than the default would be worse than no
 * Reset button at all.
 */
const DEFAULTS = {
	primary:          '#1b1b22',
	primary_contrast: '#ffffff',
	text:             '#1b1b22',
	muted:            '#8a8580',
	border:           '#d9d3c9',
	bg:               '#ffffff',
	surface_alt:      '#faf9f7',
	error:            '#dc2626',
	radius:           8,
	control_height:   46,
	font_size:        16,
	padding_x:        14,
	padding_y:        11,
	gap:              18,
	ring:             3,
	button_custom:    false,
	button_bg:        '#1b1b22',
	button_text:      '#ffffff',
};

// Ready-made looks. Each one only sets the handful of tokens that define it, so
// anything the user already tuned outside those stays put.
const PRESETS = [
	{
		id: 'ink',
		label: __( 'Ink', 'essentials-for-contact-form-7' ),
		values: { primary: '#1b1b22', primary_contrast: '#ffffff', border: '#d9d3c9', bg: '#ffffff', surface_alt: '#faf9f7', radius: 8, control_height: 46, ring: 3 },
	},
	{
		id: 'rounded',
		label: __( 'Rounded', 'essentials-for-contact-form-7' ),
		values: { primary: '#2563eb', primary_contrast: '#ffffff', border: '#dbe3ef', bg: '#ffffff', surface_alt: '#f5f8ff', radius: 28, control_height: 50, ring: 4 },
	},
	{
		id: 'sharp',
		label: __( 'Sharp', 'essentials-for-contact-form-7' ),
		values: { primary: '#111111', primary_contrast: '#ffffff', border: '#111111', bg: '#ffffff', surface_alt: '#f4f4f4', radius: 0, control_height: 44, ring: 0 },
	},
	{
		id: 'soft',
		label: __( 'Soft', 'essentials-for-contact-form-7' ),
		values: { primary: '#0f766e', primary_contrast: '#ffffff', border: '#e2e8e6', bg: '#fbfdfc', surface_alt: '#f1f7f5', radius: 12, control_height: 48, ring: 3 },
	},
];

/** Is every value this preset sets already the value in use? */
const isApplied = ( preset, values ) =>
	Object.entries( preset.values ).every( ( [ key, value ] ) => values[ key ] === value );

/**
 * A preset as a thing you can see rather than a word you have to try.
 *
 * The chip is drawn with the preset's own primary colour, border and radius, so
 * "Rounded" and "Sharp" are told apart before the label is read.
 */
const PresetCard = ( { preset, active, onApply } ) => (
	<button
		type="button"
		onClick={ onApply }
		aria-pressed={ active }
		className={ `cf7e-flex cf7e-cursor-pointer cf7e-items-center cf7e-gap-3 cf7e-rounded-xl cf7e-border cf7e-bg-white cf7e-p-2.5 cf7e-text-left cf7e-transition-colors ${
			active ? 'cf7e-border-ink' : 'cf7e-border-stroke hover:cf7e-bg-stone-50'
		}` }
	>
		<span
			className="cf7e-flex cf7e-h-8 cf7e-w-8 cf7e-shrink-0 cf7e-items-center cf7e-justify-center cf7e-border"
			style={ {
				background:   preset.values.surface_alt,
				borderColor:  preset.values.border,
				borderRadius: `${ Math.min( preset.values.radius, 14 ) }px`,
			} }
		>
			<span
				className="cf7e-h-3.5 cf7e-w-3.5"
				style={ { background: preset.values.primary, borderRadius: `${ Math.min( preset.values.radius, 7 ) }px` } }
			/>
		</span>
		<span className="cf7e-flex-1 cf7e-text-sm cf7e-font-semibold cf7e-text-ink">{ preset.label }</span>
		{ active && <Check className="cf7e-h-4 cf7e-w-4 cf7e-shrink-0 cf7e-text-ink" /> }
	</button>
);

/**
 * A miniature form built from the same class names the real thing uses, so
 * controls.css skins it identically. The tokens come from the unsaved values,
 * which is what makes it move as you drag a slider.
 *
 * A null means they have not arrived yet, and then it sets no tokens at all.
 * That is not a blank preview: the page already carries the saved ones as an
 * inline rule for .cf7e-preview, printed by the server that rendered it, so
 * with nothing overriding them the preview loads at the size it will keep.
 * Standing DEFAULTS in here instead drew a preview of somebody else's settings,
 * and left the card eight pixels short until the fetch corrected it.
 */
const DesignPreview = ( { values } ) => {
	const style = ! values ? undefined : {
		'--cf7e-primary': values.primary,
		'--cf7e-primary-contrast': values.primary_contrast,
		'--cf7e-text': values.text,
		'--cf7e-muted': values.muted,
		'--cf7e-border': values.border,
		'--cf7e-bg': values.bg,
		'--cf7e-surface-alt': values.surface_alt,
		'--cf7e-error': values.error,
		'--cf7e-radius': `${ values.radius }px`,
		'--cf7e-control-height': `${ values.control_height }px`,
		'--cf7e-font-size': `${ values.font_size }px`,
		'--cf7e-padding-x': `${ values.padding_x }px`,
		'--cf7e-padding-y': `${ values.padding_y }px`,
		'--cf7e-gap': `${ values.gap }px`,
		'--cf7e-ring': `${ values.ring }px`,
		'--cf7e-ring-color': `${ values.primary }24`,
	};

	if ( style && values.button_custom ) {
		style[ '--cf7e-btn-bg' ] = values.button_bg;
		style[ '--cf7e-btn-text' ] = values.button_text;
	}

	return (
		<div className="cf7e-preview cf7e-rounded-xl cf7e-border cf7e-border-line cf7e-bg-white cf7e-p-5" style={ style }>
			<p>
				<label>
					{ __( 'Your email', 'essentials-for-contact-form-7' ) }
					<span className="wpcf7-form-control-wrap"><input type="email" placeholder="you@example.com" readOnly /></span>
				</label>
			</p>
			<fieldset className="cf7e-fieldset">
				<legend>{ __( 'Plan', 'essentials-for-contact-form-7' ) }</legend>
				<span className="wpcf7-form-control-wrap">
					<span className="wpcf7-form-control wpcf7-radio">
						<span className="wpcf7-list-item">
							<label><input type="radio" name="cf7e-demo" defaultChecked readOnly /><span className="wpcf7-list-item-label">{ __( 'Standard', 'essentials-for-contact-form-7' ) }</span></label>
						</span>
						<span className="wpcf7-list-item">
							<label><input type="radio" name="cf7e-demo" readOnly /><span className="wpcf7-list-item-label">{ __( 'Premium', 'essentials-for-contact-form-7' ) }</span></label>
						</span>
					</span>
				</span>
			</fieldset>
			<p>
				<span className="wpcf7-form-control wpcf7-acceptance">
					<span className="wpcf7-list-item">
						<label><input type="checkbox" defaultChecked readOnly /><span className="wpcf7-list-item-label">{ __( 'Keep me posted', 'essentials-for-contact-form-7' ) }</span></label>
					</span>
				</span>
			</p>
			<p className="cf7e-mb-0">
				<button type="submit" onClick={ ( event ) => event.preventDefault() }>{ __( 'Send', 'essentials-for-contact-form-7' ) }</button>
			</p>
		</div>
	);
};

/**
 * The whole panel, including while it is waiting for its values.
 *
 * There used to be a generic three-row skeleton here instead — a shape the page
 * never takes, so the screen redrew itself completely on load rather than
 * filling in. This is the same markup either way: the real headings and labels,
 * which are fixed strings and worth reading, and a shimmer where each control
 * will be. DEFAULTS stands in for the values so the preview beside them draws
 * the shape it always has.
 */
const StylingPanel = ( { values, onSave, loading = false } ) => {
	const { local, setField, dirty, status, problem, save } = useSectionForm( values, onSave );

	const apply = ( next ) => Object.entries( next ).forEach( ( [ key, value ] ) => setField( key, value ) );
	const stock = Object.entries( DEFAULTS ).every( ( [ key, value ] ) => local[ key ] === value );

	return (
		<>
			<PageHeader
				title={ __( 'Styling', 'essentials-for-contact-form-7' ) }
				subtitle={ __( 'How your forms look on the front end. Changes apply to every form this plugin styles, and to the builder preview.', 'essentials-for-contact-form-7' ) }
				actions={
					<button
						type="button"
						disabled={ stock || loading }
						onClick={ () => apply( DEFAULTS ) }
						className={ btnGhost }
					>
						<RotateCcw className="cf7e-h-4 cf7e-w-4" />
						{ __( 'Reset to defaults', 'essentials-for-contact-form-7' ) }
					</button>
				}
			/>

			{ /*
			  * The whole body is one stack: the two-column grid, then the save
			  * bar under both of them. That is what puts the bar last on the
			  * page — and last is what makes it stick.
			  *
			  * A sticky element can only ride as far as its containing block
			  * reaches. At the foot of the settings column its block ended
			  * there, so on any window narrower than `xl` — where the grid
			  * collapses and the preview card is laid out after that column —
			  * the bar was stranded the moment you scrolled down to look at the
			  * preview you were dragging sliders to watch. Out here the only
			  * thing below it is the page's own bottom padding.
			  *
			  * The stack rather than a margin on the bar: spacing between
			  * siblings is the stack's, which is what tests/js/card-spacing.js
			  * is there to keep true.
			  */ }
			<SectionStack>
				<div className="cf7e-grid cf7e-items-start cf7e-gap-5 xl:cf7e-grid-cols-[minmax(0,1fr)_360px]">
					<SectionStack>
						<SectionCard
							title={ __( 'Colours', 'essentials-for-contact-form-7' ) }
							description={ __( 'Applied to every form this plugin styles on the front end, and to the builder preview.', 'essentials-for-contact-form-7' ) }
						>
							<ColorField
								loading={ loading }
								label={ __( 'Primary', 'essentials-for-contact-form-7' ) }
								help={ __( 'Submit button, focus outline, ticked boxes and selected options.', 'essentials-for-contact-form-7' ) }
								value={ local.primary }
								onChange={ ( value ) => setField( 'primary', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Text', 'essentials-for-contact-form-7' ) }
								value={ local.text }
								onChange={ ( value ) => setField( 'text', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Border', 'essentials-for-contact-form-7' ) }
								value={ local.border }
								onChange={ ( value ) => setField( 'border', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Field background', 'essentials-for-contact-form-7' ) }
								value={ local.bg }
								onChange={ ( value ) => setField( 'bg', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'On primary', 'essentials-for-contact-form-7' ) }
								help={ __( 'Text and ticks that sit on top of the primary colour. Use a dark value if your primary is light.', 'essentials-for-contact-form-7' ) }
								value={ local.primary_contrast }
								onChange={ ( value ) => setField( 'primary_contrast', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Muted', 'essentials-for-contact-form-7' ) }
								help={ __( 'Placeholders, hints and the small icons.', 'essentials-for-contact-form-7' ) }
								value={ local.muted }
								onChange={ ( value ) => setField( 'muted', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Soft background', 'essentials-for-contact-form-7' ) }
								help={ __( 'Drop zone, chips and the selected card.', 'essentials-for-contact-form-7' ) }
								value={ local.surface_alt }
								onChange={ ( value ) => setField( 'surface_alt', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Error', 'essentials-for-contact-form-7' ) }
								value={ local.error }
								onChange={ ( value ) => setField( 'error', value ) }
							/>
						</SectionCard>

						<SectionCard
							title={ __( 'Button', 'essentials-for-contact-form-7' ) }
							description={ __( 'By default the submit button follows your primary colour.', 'essentials-for-contact-form-7' ) }
						>
							<ToggleField
								loading={ loading }
								label={ __( 'Give the button its own colours', 'essentials-for-contact-form-7' ) }
								checked={ !! local.button_custom }
								onChange={ ( value ) => setField( 'button_custom', value ) }
							/>
							{ !! local.button_custom && (
								<>
									<ColorField loading={ loading } label={ __( 'Button background', 'essentials-for-contact-form-7' ) } value={ local.button_bg } onChange={ ( value ) => setField( 'button_bg', value ) } />
									<ColorField loading={ loading } label={ __( 'Button text', 'essentials-for-contact-form-7' ) } value={ local.button_text } onChange={ ( value ) => setField( 'button_text', value ) } />
								</>
							) }
						</SectionCard>

						<SectionCard
							title={ __( 'Shape and spacing', 'essentials-for-contact-form-7' ) }
							description={ __( 'Fonts stay inherited from your theme — only the shape of the controls is ours.', 'essentials-for-contact-form-7' ) }
						>
							<SizeField loading={ loading } label={ __( 'Corner radius', 'essentials-for-contact-form-7' ) } value={ local.radius } onChange={ ( value ) => setField( 'radius', value ) } min={ 0 } max={ 40 } />
							<SizeField loading={ loading } label={ __( 'Field height', 'essentials-for-contact-form-7' ) } value={ local.control_height } onChange={ ( value ) => setField( 'control_height', value ) } min={ 28 } max={ 80 } />
							<SizeField loading={ loading } label={ __( 'Font size', 'essentials-for-contact-form-7' ) } value={ local.font_size } onChange={ ( value ) => setField( 'font_size', value ) } min={ 0 } max={ 100 } />
							<SizeField loading={ loading } label={ __( 'Inner padding — sides', 'essentials-for-contact-form-7' ) } value={ local.padding_x } onChange={ ( value ) => setField( 'padding_x', value ) } min={ 4 } max={ 32 } />
							<SizeField loading={ loading } label={ __( 'Inner padding — top and bottom', 'essentials-for-contact-form-7' ) } value={ local.padding_y } onChange={ ( value ) => setField( 'padding_y', value ) } min={ 4 } max={ 24 } />
							<SizeField loading={ loading } label={ __( 'Space between fields', 'essentials-for-contact-form-7' ) } value={ local.gap } onChange={ ( value ) => setField( 'gap', value ) } min={ 0 } max={ 60 } />
							<SizeField
								label={ __( 'Focus ring', 'essentials-for-contact-form-7' ) }
								help={ __( 'Set to 0 to remove it — but a visible focus state helps keyboard users.', 'essentials-for-contact-form-7' ) }
								value={ local.ring }
								onChange={ ( value ) => setField( 'ring', value ) }
								min={ 0 }
								max={ 8 }
							/>
						</SectionCard>
					</SectionStack>

					<SectionStack className="xl:cf7e-sticky xl:cf7e-top-8">
						<SectionCard
							title={ __( 'Preview', 'essentials-for-contact-form-7' ) }
							description={ __( 'Updates as you edit — save to apply it to your forms.', 'essentials-for-contact-form-7' ) }
						>
							<div className="cf7e-grid cf7e-grid-cols-2 cf7e-gap-2">
								{ PRESETS.map( ( preset ) => (
									<PresetCard
										key={ preset.id }
										preset={ preset }
										active={ isApplied( preset, local ) }
										onApply={ () => apply( preset.values ) }
									/>
								) ) }
							</div>
							<DesignPreview values={ loading ? null : local } />
						</SectionCard>
					</SectionStack>
				</div>

				<SaveBar dirty={ dirty && ! loading } status={ status } problem={ problem } onSave={ save } />
			</SectionStack>
		</>
	);
};

const App = () => {
	const [ design, setDesign ] = useState( null );
	const [ error, setError ]   = useState( null );

	useEffect( () => {
		apiFetch( { path: 'cf7e/v1/settings' } )
			.then( ( res ) => {
				setDesign( res.design || {} );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message ) );
	}, [] );

	const save = async ( values ) => {
		const updated = await apiFetch( {
			path:   'cf7e/v1/settings/design',
			method: 'POST',
			data:   values,
		} );
		setDesign( updated );
	};

	return (
		<Page>
			{ error && (
				<div className="cf7e-mb-4 cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">
					{ error }
				</div>
			) }

			<StylingPanel values={ design || DEFAULTS } onSave={ save } loading={ ! design } />
		</Page>
	);
};

const mount = document.getElementById( 'cf7e-styling-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
