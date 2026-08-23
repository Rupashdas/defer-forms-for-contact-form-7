<?php
/**
 * Live validation.
 *
 * Loads assets/js/validate.js on every form this plugin renders. It runs at priority
 * 8 — ahead of Steps at 9 — because steps.js declares `cf7e-validate` as a
 * dependency, and WordPress silently drops a script whose dependency was never
 * registered.
 *
 * The message itself is styled in assets/css/controls.css, which every form
 * loads.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

defined( 'ABSPATH' ) || exit;

final class Validation {

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'enqueue' ), 8 );
	}

	/**
	 * The shared front-end helpers (`window.cf7e.ready/forms/el`).
	 *
	 * Registered here for the same reason validate.js is enqueued here: this
	 * filter runs at priority 8, ahead of every other one of ours, and WordPress
	 * silently drops a script whose dependency was never registered. Every cf7e
	 * script declares this one, so it has to exist before any of them ask.
	 */
	public const BASE = 'cf7e-base';

	public function enqueue( string $elements ): string {
		wp_enqueue_script( self::BASE, CF7E_URL . 'assets/js/base.js', array(), cf7e_asset_ver( 'assets/js/base.js' ), true );
		wp_enqueue_script( 'cf7e-validate', CF7E_URL . 'assets/js/validate.js', array( self::BASE ), cf7e_asset_ver( 'assets/js/validate.js' ), true );

		wp_localize_script(
			'cf7e-validate',
			'cf7eValidateL10n',
			array(
				'required' => __( 'Please complete this field.', 'essentials-for-contact-form-7' ),
				'invalid'  => __( 'Please check this entry.', 'essentials-for-contact-form-7' ),
			)
		);

		// The message is styled in assets/css/controls.css, alongside the controls
		// it appears under. It used to be duplicated here as an inline rule with
		// the same selector and the same specificity, so which of the two won came
		// down to print order — and the copy here was the one under the 14px floor.
		return $elements;
	}
}
