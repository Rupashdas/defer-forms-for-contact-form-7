/**
 * Styling — the look of every plugin-skinned form, on a page of its own.
 *
 * This was the fourth tab of Settings, behind Spam and Privacy, on a screen
 * whose own subtitle promised "how Defer Forms captures and handles submissions".
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
		label: __( 'Ink', 'defer-forms-for-contact-form-7' ),
		values: { primary: '#1b1b22', primary_contrast: '#ffffff', border: '#d9d3c9', bg: '#ffffff', surface_alt: '#faf9f7', radius: 8, control_height: 46, ring: 3 },
	},
	{
		id: 'rounded',
		label: __( 'Rounded', 'defer-forms-for-contact-form-7' ),
		values: { primary: '#2563eb', primary_contrast: '#ffffff', border: '#dbe3ef', bg: '#ffffff', surface_alt: '#f5f8ff', radius: 28, control_height: 50, ring: 4 },
	},
	{
		id: 'sharp',
		label: __( 'Sharp', 'defer-forms-for-contact-form-7' ),
		values: { primary: '#111111', primary_contrast: '#ffffff', border: '#111111', bg: '#ffffff', surface_alt: '#f4f4f4', radius: 0, control_height: 44, ring: 0 },
	},
	{
		id: 'soft',
		label: __( 'Soft', 'defer-forms-for-contact-form-7' ),
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
		className={ `deferforms-flex deferforms-cursor-pointer deferforms-items-center deferforms-gap-3 deferforms-rounded-xl deferforms-border deferforms-bg-white deferforms-p-2.5 deferforms-text-left deferforms-transition-colors ${
			active ? 'deferforms-border-ink' : 'deferforms-border-stroke hover:deferforms-bg-stone-50'
		}` }
	>
		<span
			className="deferforms-flex deferforms-h-8 deferforms-w-8 deferforms-shrink-0 deferforms-items-center deferforms-justify-center deferforms-border"
			style={ {
				background:   preset.values.surface_alt,
				borderColor:  preset.values.border,
				borderRadius: `${ Math.min( preset.values.radius, 14 ) }px`,
			} }
		>
			<span
				className="deferforms-h-3.5 deferforms-w-3.5"
				style={ { background: preset.values.primary, borderRadius: `${ Math.min( preset.values.radius, 7 ) }px` } }
			/>
		</span>
		<span className="deferforms-flex-1 deferforms-text-sm deferforms-font-semibold deferforms-text-ink">{ preset.label }</span>
		{ active && <Check className="deferforms-h-4 deferforms-w-4 deferforms-shrink-0 deferforms-text-ink" /> }
	</button>
);

/**
 * A miniature form built from the same class names the real thing uses, so
 * controls.css skins it identically. The tokens come from the unsaved values,
 * which is what makes it move as you drag a slider.
 *
 * A null means they have not arrived yet, and then it sets no tokens at all.
 * That is not a blank preview: the page already carries the saved ones as an
 * inline rule for .deferforms-preview, printed by the server that rendered it, so
 * with nothing overriding them the preview loads at the size it will keep.
 * Standing DEFAULTS in here instead drew a preview of somebody else's settings,
 * and left the card eight pixels short until the fetch corrected it.
 */
const DesignPreview = ( { values } ) => {
	const style = ! values ? undefined : {
		'--deferforms-primary': values.primary,
		'--deferforms-primary-contrast': values.primary_contrast,
		'--deferforms-text': values.text,
		'--deferforms-muted': values.muted,
		'--deferforms-border': values.border,
		'--deferforms-bg': values.bg,
		'--deferforms-surface-alt': values.surface_alt,
		'--deferforms-error': values.error,
		'--deferforms-radius': `${ values.radius }px`,
		'--deferforms-control-height': `${ values.control_height }px`,
		'--deferforms-font-size': `${ values.font_size }px`,
		'--deferforms-padding-x': `${ values.padding_x }px`,
		'--deferforms-padding-y': `${ values.padding_y }px`,
		'--deferforms-gap': `${ values.gap }px`,
		'--deferforms-ring': `${ values.ring }px`,
		'--deferforms-ring-color': `${ values.primary }24`,
	};

	if ( style && values.button_custom ) {
		style[ '--deferforms-btn-bg' ] = values.button_bg;
		style[ '--deferforms-btn-text' ] = values.button_text;
	}

	return (
		<div className="deferforms-preview deferforms-rounded-xl deferforms-border deferforms-border-line deferforms-bg-white deferforms-p-5" style={ style }>
			<p>
				<label>
					{ __( 'Your email', 'defer-forms-for-contact-form-7' ) }
					<span className="wpcf7-form-control-wrap"><input type="email" placeholder="you@example.com" readOnly /></span>
				</label>
			</p>
			<fieldset className="deferforms-fieldset">
				<legend>{ __( 'Plan', 'defer-forms-for-contact-form-7' ) }</legend>
				<span className="wpcf7-form-control-wrap">
					<span className="wpcf7-form-control wpcf7-radio">
						<span className="wpcf7-list-item">
							<label><input type="radio" name="deferforms-demo" defaultChecked readOnly /><span className="wpcf7-list-item-label">{ __( 'Standard', 'defer-forms-for-contact-form-7' ) }</span></label>
						</span>
						<span className="wpcf7-list-item">
							<label><input type="radio" name="deferforms-demo" readOnly /><span className="wpcf7-list-item-label">{ __( 'Premium', 'defer-forms-for-contact-form-7' ) }</span></label>
						</span>
					</span>
				</span>
			</fieldset>
			<p>
				<span className="wpcf7-form-control wpcf7-acceptance">
					<span className="wpcf7-list-item">
						<label><input type="checkbox" defaultChecked readOnly /><span className="wpcf7-list-item-label">{ __( 'Keep me posted', 'defer-forms-for-contact-form-7' ) }</span></label>
					</span>
				</span>
			</p>
			<p className="deferforms-mb-0">
				<button type="submit" onClick={ ( event ) => event.preventDefault() }>{ __( 'Send', 'defer-forms-for-contact-form-7' ) }</button>
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
	const { local, setField, dirty, status, problem, save } = useSectionForm( values, onSave, loading );

	const apply = ( next ) => Object.entries( next ).forEach( ( [ key, value ] ) => setField( key, value ) );
	const stock = Object.entries( DEFAULTS ).every( ( [ key, value ] ) => local[ key ] === value );

	return (
		<>
			<PageHeader
				title={ __( 'Styling', 'defer-forms-for-contact-form-7' ) }
				subtitle={ __( 'How your forms look on the front end. Changes apply to every form this plugin styles, and to the builder preview.', 'defer-forms-for-contact-form-7' ) }
				actions={
					<button
						type="button"
						disabled={ stock || loading }
						onClick={ () => apply( DEFAULTS ) }
						className={ btnGhost }
					>
						<RotateCcw className="deferforms-h-4 deferforms-w-4" />
						{ __( 'Reset to defaults', 'defer-forms-for-contact-form-7' ) }
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
				<div className="deferforms-grid deferforms-items-start deferforms-gap-5 xl:deferforms-grid-cols-[minmax(0,1fr)_360px]">
					<SectionStack>
						<SectionCard
							title={ __( 'Colours', 'defer-forms-for-contact-form-7' ) }
							description={ __( 'Applied to every form this plugin styles on the front end, and to the builder preview.', 'defer-forms-for-contact-form-7' ) }
						>
							<ColorField
								loading={ loading }
								label={ __( 'Primary', 'defer-forms-for-contact-form-7' ) }
								help={ __( 'Submit button, focus outline, ticked boxes and selected options.', 'defer-forms-for-contact-form-7' ) }
								value={ local.primary }
								onChange={ ( value ) => setField( 'primary', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Text', 'defer-forms-for-contact-form-7' ) }
								value={ local.text }
								onChange={ ( value ) => setField( 'text', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Border', 'defer-forms-for-contact-form-7' ) }
								value={ local.border }
								onChange={ ( value ) => setField( 'border', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Field background', 'defer-forms-for-contact-form-7' ) }
								value={ local.bg }
								onChange={ ( value ) => setField( 'bg', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'On primary', 'defer-forms-for-contact-form-7' ) }
								help={ __( 'Text and ticks that sit on top of the primary colour. Use a dark value if your primary is light.', 'defer-forms-for-contact-form-7' ) }
								value={ local.primary_contrast }
								onChange={ ( value ) => setField( 'primary_contrast', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Muted', 'defer-forms-for-contact-form-7' ) }
								help={ __( 'Placeholders, hints and the small icons.', 'defer-forms-for-contact-form-7' ) }
								value={ local.muted }
								onChange={ ( value ) => setField( 'muted', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Soft background', 'defer-forms-for-contact-form-7' ) }
								help={ __( 'Drop zone, chips and the selected card.', 'defer-forms-for-contact-form-7' ) }
								value={ local.surface_alt }
								onChange={ ( value ) => setField( 'surface_alt', value ) }
							/>
							<ColorField
								loading={ loading }
								label={ __( 'Error', 'defer-forms-for-contact-form-7' ) }
								value={ local.error }
								onChange={ ( value ) => setField( 'error', value ) }
							/>
						</SectionCard>

						<SectionCard
							title={ __( 'Button', 'defer-forms-for-contact-form-7' ) }
							description={ __( 'By default the submit button follows your primary colour.', 'defer-forms-for-contact-form-7' ) }
						>
							<ToggleField
								loading={ loading }
								label={ __( 'Give the button its own colours', 'defer-forms-for-contact-form-7' ) }
								checked={ !! local.button_custom }
								onChange={ ( value ) => setField( 'button_custom', value ) }
							/>
							{ !! local.button_custom && (
								<>
									<ColorField loading={ loading } label={ __( 'Button background', 'defer-forms-for-contact-form-7' ) } value={ local.button_bg } onChange={ ( value ) => setField( 'button_bg', value ) } />
									<ColorField loading={ loading } label={ __( 'Button text', 'defer-forms-for-contact-form-7' ) } value={ local.button_text } onChange={ ( value ) => setField( 'button_text', value ) } />
								</>
							) }
						</SectionCard>

						<SectionCard
							title={ __( 'Shape and spacing', 'defer-forms-for-contact-form-7' ) }
							description={ __( 'Fonts stay inherited from your theme — only the shape of the controls is ours.', 'defer-forms-for-contact-form-7' ) }
						>
							<SizeField loading={ loading } label={ __( 'Corner radius', 'defer-forms-for-contact-form-7' ) } value={ local.radius } onChange={ ( value ) => setField( 'radius', value ) } min={ 0 } max={ 40 } />
							<SizeField loading={ loading } label={ __( 'Field height', 'defer-forms-for-contact-form-7' ) } value={ local.control_height } onChange={ ( value ) => setField( 'control_height', value ) } min={ 28 } max={ 80 } />
							<SizeField loading={ loading } label={ __( 'Font size', 'defer-forms-for-contact-form-7' ) } value={ local.font_size } onChange={ ( value ) => setField( 'font_size', value ) } min={ 0 } max={ 100 } />
							<SizeField loading={ loading } label={ __( 'Inner padding — sides', 'defer-forms-for-contact-form-7' ) } value={ local.padding_x } onChange={ ( value ) => setField( 'padding_x', value ) } min={ 4 } max={ 32 } />
							<SizeField loading={ loading } label={ __( 'Inner padding — top and bottom', 'defer-forms-for-contact-form-7' ) } value={ local.padding_y } onChange={ ( value ) => setField( 'padding_y', value ) } min={ 4 } max={ 24 } />
							<SizeField loading={ loading } label={ __( 'Space between fields', 'defer-forms-for-contact-form-7' ) } value={ local.gap } onChange={ ( value ) => setField( 'gap', value ) } min={ 0 } max={ 60 } />
							<SizeField
								label={ __( 'Focus ring', 'defer-forms-for-contact-form-7' ) }
								help={ __( 'Set to 0 to remove it — but a visible focus state helps keyboard users.', 'defer-forms-for-contact-form-7' ) }
								value={ local.ring }
								onChange={ ( value ) => setField( 'ring', value ) }
								min={ 0 }
								max={ 8 }
							/>
						</SectionCard>
					</SectionStack>

					<SectionStack className="xl:deferforms-sticky xl:deferforms-top-8">
						<SectionCard
							title={ __( 'Preview', 'defer-forms-for-contact-form-7' ) }
							description={ __( 'Updates as you edit — save to apply it to your forms.', 'defer-forms-for-contact-form-7' ) }
						>
							<div className="deferforms-grid deferforms-grid-cols-2 deferforms-gap-2">
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
		apiFetch( { path: 'deferforms/v1/settings' } )
			.then( ( res ) => {
				setDesign( res.design || {} );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message ) );
	}, [] );

	const save = async ( values ) => {
		const updated = await apiFetch( {
			path:   'deferforms/v1/settings/design',
			method: 'POST',
			data:   values,
		} );
		setDesign( updated );
	};

	return (
		<Page>
			{ error && (
				<div className="deferforms-mb-4 deferforms-rounded-lg deferforms-border deferforms-border-red-200 deferforms-bg-red-50 deferforms-px-4 deferforms-py-3 deferforms-text-sm deferforms-font-medium deferforms-text-red-700">
					{ error }
				</div>
			) }

			<StylingPanel values={ design || DEFAULTS } onSave={ save } loading={ ! design } />
		</Page>
	);
};

const mount = document.getElementById( 'deferforms-styling-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
