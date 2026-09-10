<?php
/**
 * Front-end stylesheets for our forms.
 *
 * Everything here is loaded per form and only when the markup shows it is
 * needed, so an untouched CF7 form pulls in nothing but the control skin:
 *  - form.css is structural (grid rows/columns, fieldset captions, content
 *    blocks). Without it a grid row would collapse, so it follows the markup.
 *  - controls.css is the control skin, and also carries the validation message,
 *    so it loads on every form.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class Form_Styles {

	private Design $design;

	public function __construct( Design $design ) {
		$this->design = $design;
	}

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'maybe_enqueue' ) );
	}

	public function maybe_enqueue( string $elements ): string {
		if ( false !== strpos( $elements, 'class="deferforms-' ) || false !== strpos( $elements, 'class="deferforms-row' ) ) {
			wp_enqueue_style( 'deferforms-form', DEFERFORMS_URL . 'assets/css/form.css', array(), deferforms_asset_ver( 'assets/css/form.css' ) );
		}

		// Range is a native CF7 tag, so there's no render callback of ours to
		// hook — spot the control in the output instead.
		if ( false !== strpos( $elements, 'wpcf7-range' ) ) {
			wp_enqueue_style( 'deferforms-range', DEFERFORMS_URL . 'assets/css/range.css', array(), deferforms_asset_ver( 'assets/css/range.css' ) );
			wp_enqueue_script( 'deferforms-range', DEFERFORMS_URL . 'assets/js/range.js', array( Validation::BASE ), deferforms_asset_ver( 'assets/js/range.js' ), true );
		}

		wp_enqueue_style( 'deferforms-controls', DEFERFORMS_URL . 'assets/css/controls.css', array(), deferforms_asset_ver( 'assets/css/controls.css' ) );

		// Added after the stylesheet, so the same-specificity token block wins.
		$tokens = $this->design->inline_css();
		if ( '' !== $tokens ) {
			wp_add_inline_style( 'deferforms-controls', $tokens );
		}

		if ( false !== strpos( $elements, 'type="file"' ) ) {
			wp_enqueue_script( 'deferforms-file', DEFERFORMS_URL . 'assets/js/file.js', array( Validation::BASE ), deferforms_asset_ver( 'assets/js/file.js' ), true );
			wp_localize_script(
				'deferforms-file',
				'deferformsFileL10n',
				array(
					'drop'      => __( 'Drag files here or click to browse', 'defer-forms-for-contact-form-7' ),
					'dropOne'   => __( 'Drag a file here or click to browse', 'defer-forms-for-contact-form-7' ),
					'remove'    => __( 'Remove', 'defer-forms-for-contact-form-7' ),
					/* translators: %d: maximum number of files. */
					'tooMany'   => __( 'You can upload at most %d files.', 'defer-forms-for-contact-form-7' ),
					/* translators: 1: file name, 2: size limit. */
					'tooBig'    => __( '%1$s is larger than the %2$s limit.', 'defer-forms-for-contact-form-7' ),
					/* translators: %s: file name. */
					'badType'   => __( '%s is not an accepted file type.', 'defer-forms-for-contact-form-7' ),
					/* translators: %s: file name. */
					'duplicate' => __( '%s was already added.', 'defer-forms-for-contact-form-7' ),
				)
			);
		}

		if ( false !== strpos( $elements, '<select' ) ) {
			wp_enqueue_script( 'deferforms-select', DEFERFORMS_URL . 'assets/js/select.js', array( Validation::BASE ), deferforms_asset_ver( 'assets/js/select.js' ), true );
			wp_localize_script(
				'deferforms-select',
				'deferformsSelectL10n',
				array(
					'placeholder'      => __( 'Select…', 'defer-forms-for-contact-form-7' ),
					'placeholderMulti' => __( 'Select options…', 'defer-forms-for-contact-form-7' ),
					'search'           => __( 'Search…', 'defer-forms-for-contact-form-7' ),
					'noResults'        => __( 'No matches', 'defer-forms-for-contact-form-7' ),
					'remove'           => __( 'Remove', 'defer-forms-for-contact-form-7' ),
				)
			);
		}

		// Both markers are opt-in, so an untouched CF7 form loads nothing.
		if ( false !== strpos( $elements, 'deferforms-tel' ) ) {
			wp_enqueue_script( 'deferforms-tel', DEFERFORMS_URL . 'assets/js/tel.js', array( Validation::BASE ), deferforms_asset_ver( 'assets/js/tel.js' ), true );
		}

		return $elements;
	}
}
