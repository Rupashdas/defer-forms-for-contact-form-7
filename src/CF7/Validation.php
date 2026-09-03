<?php
/**
 * Live validation.
 *
 * Loads assets/js/validate.js on every form this plugin renders. It runs at priority
 * 8 — ahead of Steps at 9 — because steps.js declares `df7-validate` as a
 * dependency, and WordPress silently drops a script whose dependency was never
 * registered.
 *
 * The message itself is styled in assets/css/controls.css, which every form
 * loads.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Validation {

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'enqueue' ), 8 );
	}

	/**
	 * The shared front-end helpers (`window.df7.ready/forms/el`).
	 *
	 * Registered here for the same reason validate.js is enqueued here: this
	 * filter runs at priority 8, ahead of every other one of ours, and WordPress
	 * silently drops a script whose dependency was never registered. Every df7
	 * script declares this one, so it has to exist before any of them ask.
	 */
	public const BASE = 'df7-base';

	public function enqueue( string $elements ): string {
		wp_enqueue_script( self::BASE, DF7_URL . 'assets/js/base.js', array(), df7_asset_ver( 'assets/js/base.js' ), true );
		wp_enqueue_script( 'df7-validate', DF7_URL . 'assets/js/validate.js', array( self::BASE ), df7_asset_ver( 'assets/js/validate.js' ), true );

		wp_localize_script(
			'df7-validate',
			'df7ValidateL10n',
			array(
				'required' => __( 'Please complete this field.', 'defer-forms-for-contact-form-7' ),
				'invalid'  => __( 'Please check this entry.', 'defer-forms-for-contact-form-7' ),
			)
		);

		// The message is styled in assets/css/controls.css, alongside the controls
		// it appears under. It used to be duplicated here as an inline rule with
		// the same selector and the same specificity, so which of the two won came
		// down to print order — and the copy here was the one under the 14px floor.
		return $elements;
	}
}
