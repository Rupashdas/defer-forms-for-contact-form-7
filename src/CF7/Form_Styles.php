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
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

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
		if ( false !== strpos( $elements, 'class="nv-' ) || false !== strpos( $elements, 'class="cf7nl-row' ) ) {
			wp_enqueue_style( 'cf7nl-form', CF7NL_URL . 'assets/css/form.css', array(), cf7nl_asset_ver( 'assets/css/form.css' ) );
		}

		// Range is a native CF7 tag, so there's no render callback of ours to
		// hook — spot the control in the output instead.
		if ( false !== strpos( $elements, 'wpcf7-range' ) ) {
			wp_enqueue_style( 'cf7nl-range', CF7NL_URL . 'assets/css/range.css', array(), cf7nl_asset_ver( 'assets/css/range.css' ) );
			wp_enqueue_script( 'cf7nl-range', CF7NL_URL . 'assets/js/range.js', array( Validation::BASE ), cf7nl_asset_ver( 'assets/js/range.js' ), true );
		}

		wp_enqueue_style( 'cf7nl-controls', CF7NL_URL . 'assets/css/controls.css', array(), cf7nl_asset_ver( 'assets/css/controls.css' ) );

		// Added after the stylesheet, so the same-specificity token block wins.
		$tokens = $this->design->inline_css();
		if ( '' !== $tokens ) {
			wp_add_inline_style( 'cf7nl-controls', $tokens );
		}

		if ( false !== strpos( $elements, 'type="file"' ) ) {
			wp_enqueue_script( 'cf7nl-file', CF7NL_URL . 'assets/js/file.js', array( Validation::BASE ), cf7nl_asset_ver( 'assets/js/file.js' ), true );
			wp_localize_script(
				'cf7nl-file',
				'cf7nlFileL10n',
				array(
					'drop'      => __( 'Drag files here or click to browse', 'cf7-nova-lite' ),
					'dropOne'   => __( 'Drag a file here or click to browse', 'cf7-nova-lite' ),
					'remove'    => __( 'Remove', 'cf7-nova-lite' ),
					/* translators: %d: maximum number of files. */
					'tooMany'   => __( 'You can upload at most %d files.', 'cf7-nova-lite' ),
					/* translators: 1: file name, 2: size limit. */
					'tooBig'    => __( '%1$s is larger than the %2$s limit.', 'cf7-nova-lite' ),
					/* translators: %s: file name. */
					'badType'   => __( '%s is not an accepted file type.', 'cf7-nova-lite' ),
					/* translators: %s: file name. */
					'duplicate' => __( '%s was already added.', 'cf7-nova-lite' ),
				)
			);
		}

		if ( false !== strpos( $elements, '<select' ) ) {
			wp_enqueue_script( 'cf7nl-select', CF7NL_URL . 'assets/js/select.js', array( Validation::BASE ), cf7nl_asset_ver( 'assets/js/select.js' ), true );
			wp_localize_script(
				'cf7nl-select',
				'cf7nlSelectL10n',
				array(
					'placeholder'      => __( 'Select…', 'cf7-nova-lite' ),
					'placeholderMulti' => __( 'Select options…', 'cf7-nova-lite' ),
					'search'           => __( 'Search…', 'cf7-nova-lite' ),
					'noResults'        => __( 'No matches', 'cf7-nova-lite' ),
					'remove'           => __( 'Remove', 'cf7-nova-lite' ),
				)
			);
		}

		// Both markers are opt-in, so an untouched CF7 form loads nothing.
		if ( false !== strpos( $elements, 'cf7nl-tel' ) ) {
			wp_enqueue_script( 'cf7nl-tel', CF7NL_URL . 'assets/js/tel.js', array( Validation::BASE ), cf7nl_asset_ver( 'assets/js/tel.js' ), true );
		}

		return $elements;
	}
}
