<?php
/**
 * Live validation.
 *
 * Loads assets/js/validate.js on every Nova-rendered form. It runs at priority
 * 8 — ahead of Steps at 9 — because steps.js declares `cf7nl-validate` as a
 * dependency, and WordPress silently drops a script whose dependency was never
 * registered.
 *
 * The message itself is styled in assets/css/controls.css, which every form
 * loads.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Validation {

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'enqueue' ), 8 );
	}

	/**
	 * The shared front-end helpers (`window.cf7nl.ready/forms/el`).
	 *
	 * Registered here for the same reason validate.js is enqueued here: this
	 * filter runs at priority 8, ahead of every other one of ours, and WordPress
	 * silently drops a script whose dependency was never registered. Every cf7nl
	 * script declares this one, so it has to exist before any of them ask.
	 */
	public const BASE = 'cf7nl-nova';

	public function enqueue( string $elements ): string {
		wp_enqueue_script( self::BASE, CF7NL_URL . 'assets/js/nova.js', array(), cf7nl_asset_ver( 'assets/js/nova.js' ), true );
		wp_enqueue_script( 'cf7nl-validate', CF7NL_URL . 'assets/js/validate.js', array( self::BASE ), cf7nl_asset_ver( 'assets/js/validate.js' ), true );

		wp_localize_script(
			'cf7nl-validate',
			'cf7nlValidateL10n',
			array(
				'required' => __( 'Please complete this field.', 'cf7-nova-lite' ),
				'invalid'  => __( 'Please check this entry.', 'cf7-nova-lite' ),
			)
		);

		// The message is styled in assets/css/controls.css, alongside the controls
		// it appears under. It used to be duplicated here as an inline rule with
		// the same selector and the same specificity, so which of the two won came
		// down to print order — and the copy here was the one under the 14px floor.
		return $elements;
	}
}
