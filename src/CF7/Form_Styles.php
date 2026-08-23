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
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

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
		if ( false !== strpos( $elements, 'class="cf7e-' ) || false !== strpos( $elements, 'class="cf7e-row' ) ) {
			wp_enqueue_style( 'cf7e-form', CF7E_URL . 'assets/css/form.css', array(), cf7e_asset_ver( 'assets/css/form.css' ) );
		}

		// Range is a native CF7 tag, so there's no render callback of ours to
		// hook — spot the control in the output instead.
		if ( false !== strpos( $elements, 'wpcf7-range' ) ) {
			wp_enqueue_style( 'cf7e-range', CF7E_URL . 'assets/css/range.css', array(), cf7e_asset_ver( 'assets/css/range.css' ) );
			wp_enqueue_script( 'cf7e-range', CF7E_URL . 'assets/js/range.js', array( Validation::BASE ), cf7e_asset_ver( 'assets/js/range.js' ), true );
		}

		wp_enqueue_style( 'cf7e-controls', CF7E_URL . 'assets/css/controls.css', array(), cf7e_asset_ver( 'assets/css/controls.css' ) );

		// Added after the stylesheet, so the same-specificity token block wins.
		$tokens = $this->design->inline_css();
		if ( '' !== $tokens ) {
			wp_add_inline_style( 'cf7e-controls', $tokens );
		}

		if ( false !== strpos( $elements, 'type="file"' ) ) {
			wp_enqueue_script( 'cf7e-file', CF7E_URL . 'assets/js/file.js', array( Validation::BASE ), cf7e_asset_ver( 'assets/js/file.js' ), true );
			wp_localize_script(
				'cf7e-file',
				'cf7eFileL10n',
				array(
					'drop'      => __( 'Drag files here or click to browse', 'essentials-for-contact-form-7' ),
					'dropOne'   => __( 'Drag a file here or click to browse', 'essentials-for-contact-form-7' ),
					'remove'    => __( 'Remove', 'essentials-for-contact-form-7' ),
					/* translators: %d: maximum number of files. */
					'tooMany'   => __( 'You can upload at most %d files.', 'essentials-for-contact-form-7' ),
					/* translators: 1: file name, 2: size limit. */
					'tooBig'    => __( '%1$s is larger than the %2$s limit.', 'essentials-for-contact-form-7' ),
					/* translators: %s: file name. */
					'badType'   => __( '%s is not an accepted file type.', 'essentials-for-contact-form-7' ),
					/* translators: %s: file name. */
					'duplicate' => __( '%s was already added.', 'essentials-for-contact-form-7' ),
				)
			);
		}

		if ( false !== strpos( $elements, '<select' ) ) {
			wp_enqueue_script( 'cf7e-select', CF7E_URL . 'assets/js/select.js', array( Validation::BASE ), cf7e_asset_ver( 'assets/js/select.js' ), true );
			wp_localize_script(
				'cf7e-select',
				'cf7eSelectL10n',
				array(
					'placeholder'      => __( 'Select…', 'essentials-for-contact-form-7' ),
					'placeholderMulti' => __( 'Select options…', 'essentials-for-contact-form-7' ),
					'search'           => __( 'Search…', 'essentials-for-contact-form-7' ),
					'noResults'        => __( 'No matches', 'essentials-for-contact-form-7' ),
					'remove'           => __( 'Remove', 'essentials-for-contact-form-7' ),
				)
			);
		}

		// Both markers are opt-in, so an untouched CF7 form loads nothing.
		if ( false !== strpos( $elements, 'cf7e-tel' ) ) {
			wp_enqueue_script( 'cf7e-tel', CF7E_URL . 'assets/js/tel.js', array( Validation::BASE ), cf7e_asset_ver( 'assets/js/tel.js' ), true );
		}

		return $elements;
	}
}
