<?php
/**
 * Loads flatpickr on the front-end for date fields that opted into the styled
 * picker (they carry the `cf7nl-fp` marker class).
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Date_Picker {

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'maybe_enqueue' ) );
	}

	public function maybe_enqueue( string $elements ): string {
		// Only load the picker when a styled date field is actually present.
		if ( false === strpos( $elements, 'cf7nl-fp' ) ) {
			return $elements;
		}

		wp_enqueue_style( 'flatpickr', CF7NL_URL . 'assets/vendor/flatpickr/flatpickr.min.css', array(), '4.6.13' );
		wp_enqueue_style( 'cf7nl-datepicker', CF7NL_URL . 'assets/css/datepicker.css', array( 'flatpickr' ), cf7nl_asset_ver( 'assets/css/datepicker.css' ) );
		wp_enqueue_script( 'flatpickr', CF7NL_URL . 'assets/vendor/flatpickr/flatpickr.min.js', array(), '4.6.13', true );
		wp_enqueue_script( 'cf7nl-datepicker', CF7NL_URL . 'assets/js/datepicker.js', array( 'flatpickr', Validation::BASE ), cf7nl_asset_ver( 'assets/js/datepicker.js' ), true );

		return $elements;
	}
}
