<?php
/**
 * Loads flatpickr on the front-end for date fields that opted into the styled
 * picker (they carry the `df7-fp` marker class).
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Date_Picker {

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'maybe_enqueue' ) );
	}

	public function maybe_enqueue( string $elements ): string {
		// Only load the picker when a styled date field is actually present.
		if ( false === strpos( $elements, 'df7-fp' ) ) {
			return $elements;
		}

		wp_enqueue_style( 'flatpickr', DF7_URL . 'assets/vendor/flatpickr/flatpickr.min.css', array(), '4.6.13' );
		wp_enqueue_style( 'df7-datepicker', DF7_URL . 'assets/css/datepicker.css', array( 'flatpickr' ), df7_asset_ver( 'assets/css/datepicker.css' ) );
		wp_enqueue_script( 'flatpickr', DF7_URL . 'assets/vendor/flatpickr/flatpickr.min.js', array(), '4.6.13', true );
		wp_enqueue_script( 'df7-datepicker', DF7_URL . 'assets/js/datepicker.js', array( 'flatpickr', Validation::BASE ), df7_asset_ver( 'assets/js/datepicker.js' ), true );

		return $elements;
	}
}
