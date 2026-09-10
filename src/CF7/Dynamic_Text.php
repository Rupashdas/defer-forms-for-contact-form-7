<?php
/**
 * Dynamic text field. A registered CF7 form-tag `[dynamictext]` whose value is
 * resolved at render time from a small set of sources (URL parameter, current
 * post, logged-in user, date) — handy for prefilling referral codes, the page
 * title, or the visitor's email. The quoted tag value holds the source token.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class Dynamic_Text {

	use Required_Check;

	public function register_hooks(): void {
		add_action( 'wpcf7_init', array( $this, 'add_form_tag' ) );
		add_filter( 'wpcf7_validate_dynamictext', array( $this, 'validate' ), 10, 2 );
		add_filter( 'wpcf7_validate_dynamictext*', array( $this, 'validate' ), 10, 2 );
	}

	public function add_form_tag(): void {
		if ( ! function_exists( 'wpcf7_add_form_tag' ) ) {
			return;
		}
		wpcf7_add_form_tag(
			array( 'dynamictext', 'dynamictext*' ),
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

		$source = isset( $tag->values[0] ) ? (string) $tag->values[0] : '';

		// `hidden` posts the value without showing it; `readonly` shows it but
		// stops the visitor editing it. Default is a normal, editable field.
		$hidden = $tag->has_option( 'hidden' );

		$atts = array(
			'type'  => $hidden ? 'hidden' : 'text',
			'name'  => $tag->name,
			'value' => Value_Source::resolve( $source ),
		);

		if ( ! $hidden ) {
			$atts['class'] = trim( wpcf7_form_controls_class( $tag->type ) . ' deferforms-dynamic' );
			$atts['id']    = $tag->get_id_option();

			$placeholder = (string) $tag->get_option( 'placeholder', '', true );
			if ( '' !== $placeholder ) {
				$atts['placeholder'] = $placeholder;
			}
			if ( $tag->has_option( 'readonly' ) ) {
				$atts['readonly'] = 'readonly';
			}
			if ( $tag->is_required() ) {
				$atts['aria-required'] = 'true';
			}
		}

		return sprintf(
			'<span class="wpcf7-form-control-wrap" data-name="%1$s"><input %2$s />%3$s</span>',
			esc_attr( $tag->name ),
			wpcf7_format_atts( $atts ),
			wpcf7_get_validation_error( $tag->name )
		);
	}
}
