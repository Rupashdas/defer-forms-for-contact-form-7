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
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

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
		if ( false !== strpos( $elements, 'class="df7-' ) || false !== strpos( $elements, 'class="df7-row' ) ) {
			wp_enqueue_style( 'df7-form', DF7_URL . 'assets/css/form.css', array(), df7_asset_ver( 'assets/css/form.css' ) );
		}

		// Range is a native CF7 tag, so there's no render callback of ours to
		// hook — spot the control in the output instead.
		if ( false !== strpos( $elements, 'wpcf7-range' ) ) {
			wp_enqueue_style( 'df7-range', DF7_URL . 'assets/css/range.css', array(), df7_asset_ver( 'assets/css/range.css' ) );
			wp_enqueue_script( 'df7-range', DF7_URL . 'assets/js/range.js', array( Validation::BASE ), df7_asset_ver( 'assets/js/range.js' ), true );
		}

		wp_enqueue_style( 'df7-controls', DF7_URL . 'assets/css/controls.css', array(), df7_asset_ver( 'assets/css/controls.css' ) );

		// Added after the stylesheet, so the same-specificity token block wins.
		$tokens = $this->design->inline_css();
		if ( '' !== $tokens ) {
			wp_add_inline_style( 'df7-controls', $tokens );
		}

		if ( false !== strpos( $elements, 'type="file"' ) ) {
			wp_enqueue_script( 'df7-file', DF7_URL . 'assets/js/file.js', array( Validation::BASE ), df7_asset_ver( 'assets/js/file.js' ), true );
			wp_localize_script(
				'df7-file',
				'df7FileL10n',
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
			wp_enqueue_script( 'df7-select', DF7_URL . 'assets/js/select.js', array( Validation::BASE ), df7_asset_ver( 'assets/js/select.js' ), true );
			wp_localize_script(
				'df7-select',
				'df7SelectL10n',
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
		if ( false !== strpos( $elements, 'df7-tel' ) ) {
			wp_enqueue_script( 'df7-tel', DF7_URL . 'assets/js/tel.js', array( Validation::BASE ), df7_asset_ver( 'assets/js/tel.js' ), true );
		}

		return $elements;
	}
}
