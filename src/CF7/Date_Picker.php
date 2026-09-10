<?php
/**
 * Loads flatpickr on the front-end for date fields that opted into the styled
 * picker (they carry the `deferforms-fp` marker class).
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class Date_Picker {

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'maybe_enqueue' ) );
	}

	public function maybe_enqueue( string $elements ): string {
		// Only load the picker when a styled date field is actually present.
		if ( false === strpos( $elements, 'deferforms-fp' ) ) {
			return $elements;
		}

		// Prefixed, though the library is not ours: a bare `flatpickr` handle is
		// what every other plugin bundling it would also reach for, and whichever
		// registered first would decide the version both of them got.
		wp_enqueue_style( 'deferforms-flatpickr', DEFERFORMS_URL . 'assets/vendor/flatpickr/flatpickr.min.css', array(), '4.6.13' );
		wp_enqueue_style( 'deferforms-datepicker', DEFERFORMS_URL . 'assets/css/datepicker.css', array( 'deferforms-flatpickr' ), deferforms_asset_ver( 'assets/css/datepicker.css' ) );
		wp_enqueue_script( 'deferforms-flatpickr', DEFERFORMS_URL . 'assets/vendor/flatpickr/flatpickr.min.js', array(), '4.6.13', true );
		wp_enqueue_script( 'deferforms-datepicker', DEFERFORMS_URL . 'assets/js/datepicker.js', array( 'deferforms-flatpickr', Validation::BASE ), deferforms_asset_ver( 'assets/js/datepicker.js' ), true );

		return $elements;
	}
}
