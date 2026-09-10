<?php
/**
 * Star-rating field. Unlike grid/steps/conditional (which ride on unregistered
 * marker tags), `[rating]` is a real registered CF7 form-tag: CF7 renders it
 * through our callback, collects its posted value, and includes it in mail. The
 * widget is a reversed radio group styled into stars by rating.css (CSS-only).
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class Rating {

	use Required_Check;

	public function register_hooks(): void {
		add_action( 'wpcf7_init', array( $this, 'add_form_tag' ) );
		add_filter( 'wpcf7_validate_rating', array( $this, 'validate' ), 10, 2 );
		add_filter( 'wpcf7_validate_rating*', array( $this, 'validate' ), 10, 2 );
	}

	public function add_form_tag(): void {
		if ( ! function_exists( 'wpcf7_add_form_tag' ) ) {
			return;
		}
		wpcf7_add_form_tag(
			array( 'rating', 'rating*' ),
			array( $this, 'render' ),
			array( 'name-attr' => true )
		);
	}

	/**
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 */
	public function render( $tag ): string {
		$tag = new \WPCF7_FormTag( $tag );
		if ( '' === $tag->name ) {
			return '';
		}

		wp_enqueue_style( 'deferforms-rating', DEFERFORMS_URL . 'assets/css/rating.css', array(), deferforms_asset_ver( 'assets/css/rating.css' ) );

		$max = (int) $tag->get_option( 'max', 'int', true );
		$max = ( $max < 1 ) ? 5 : min( 10, $max );

		// aria-required is what our multi-step validator (and screen readers) read.
		$required = $tag->is_required() ? ' aria-required="true"' : '';

		// Counted down, not up: rating.css draws the stars with a reversed flex row,
		// which is what lets a pure-CSS `:hover ~ label` fill every star to the left
		// of the one under the cursor.
		$stars = '';
		for ( $score = $max; $score >= 1; $score-- ) {
			$input_id = sanitize_html_class( $tag->name ) . '-' . $score;
			$stars   .= sprintf(
				'<input type="radio" id="%1$s" name="%2$s" value="%3$d"%4$s /><label for="%1$s" aria-label="%3$d">&#9733;</label>',
				esc_attr( $input_id ),
				esc_attr( $tag->name ),
				$score,
				$required
			);
		}

		return sprintf(
			'<span class="wpcf7-form-control-wrap" data-name="%1$s"><span class="deferforms-rating %2$s">%3$s</span>%4$s</span>',
			esc_attr( $tag->name ),
			esc_attr( wpcf7_form_controls_class( $tag->type ) ),
			$stars,
			wpcf7_get_validation_error( $tag->name )
		);
	}
}
