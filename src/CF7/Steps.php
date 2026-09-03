<?php
/**
 * Multi-step forms.
 *
 * `[df7_pagebreak]` is not registered with CF7, so CF7 leaves it as literal
 * text and this filter turns it into a divider. Whatever settings the break was
 * given ride along as data attributes for assets/js/steps.js, which does the
 * actual splitting in the browser.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Steps {

	/** Attribute on the tag => data attribute on the divider. */
	private const SETTINGS = array(
		'title' => 'title',
		'desc'  => 'desc',
		'prev'  => 'prev',
		'next'  => 'next',
		'class' => 'class',
		'id'    => 'id',
	);

	private const META = '_df7_steps';

	/** How the progress through a multi-step form is drawn. */
	public const INDICATORS = array( 'bar', 'dots', 'numbers', 'titles', 'none' );

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'maybe_render' ), 9 );
		add_filter( 'wpcf7_form_class_attr', array( $this, 'indicator_class' ) );
	}

	/**
	 * Clean a submitted steps section. Static so the REST layer applies exactly
	 * the rules the renderer trusts.
	 *
	 * @param array<string, mixed> $input
	 * @return array<string, string>
	 */
	public static function sanitize( array $input ): array {
		$indicator = $input['indicator'] ?? '';
		$indicator = is_string( $indicator ) ? $indicator : '';

		return array(
			'indicator' => in_array( $indicator, self::INDICATORS, true ) ? $indicator : 'bar',
		);
	}

	/**
	 * @return array<string, string>
	 */
	public static function config( int $form_id ): array {
		return self::sanitize( (array) get_post_meta( $form_id, self::META, true ) );
	}

	/**
	 * Store a form's step settings, or clear them.
	 *
	 * 'bar' is what sanitize() falls back to, so storing it would only add a row
	 * saying what its absence already says.
	 *
	 * @param array<string, mixed> $input Raw settings from the request.
	 * @return array<string, string> The sanitised settings, as stored.
	 */
	public static function save( int $form_id, array $input ): array {
		$clean = self::sanitize( $input );

		if ( 'bar' !== $clean['indicator'] ) {
			update_post_meta( $form_id, self::META, $clean );
		} else {
			delete_post_meta( $form_id, self::META );
		}

		return $clean;
	}

	/**
	 * The indicator variant travels as a class on the form, so the CSS can switch
	 * between them without steps.js having to know what any of them look like.
	 */
	public function indicator_class( string $class ): string {
		$form = self::current_form();
		if ( ! $form || false === strpos( (string) $form->prop( 'form' ), '[df7_pagebreak' ) ) {
			return $class;
		}

		return $class . ' df7-steps-' . self::config( $form->id() )['indicator'];
	}

	private static function current_form(): ?object {
		if ( ! class_exists( '\WPCF7_ContactForm' ) ) {
			return null;
		}

		$form = \WPCF7_ContactForm::get_current();

		return $form instanceof \WPCF7_ContactForm ? $form : null;
	}

	public function maybe_render( string $elements ): string {
		if ( false === strpos( $elements, '[df7_pagebreak' ) ) {
			return $elements;
		}

		wp_enqueue_style( 'df7-steps', DF7_URL . 'assets/css/steps.css', array(), df7_asset_ver( 'assets/css/steps.css' ) );
		// Declared as a dependency, not just loaded alongside: steps.js hands its
		// Next-button gate to window.df7Validate, which validate.js defines.
		wp_enqueue_script( 'df7-steps', DF7_URL . 'assets/js/steps.js', array( 'df7-validate' ), df7_asset_ver( 'assets/js/steps.js' ), true );

		// The navigation is drawn in the browser, so its wording has to travel to
		// it — the same way file.js and select.js get theirs. Without this the
		// buttons stay English on every site, in every language.
		wp_localize_script(
			'df7-steps',
			'df7StepsL10n',
			array(
				'prev'   => __( 'Back', 'defer-forms-for-contact-form-7' ),
				'next'   => __( 'Next', 'defer-forms-for-contact-form-7' ),
				// Worded exactly as the builder preview words it: gettext merges the
				// two by their text, and a translator shown two different notes for
				// one string has to guess which one applies.
				/* translators: 1: current step, 2: total steps. */
				'status' => __( 'Step %1$d of %2$d', 'defer-forms-for-contact-form-7' ),
				/* translators: %d: step number. */
				'step'   => __( 'Step %d', 'defer-forms-for-contact-form-7' ),
			)
		);

		return (string) preg_replace_callback(
			'/\[df7_pagebreak(?:\s+([^\]]*))?\]/',
			static function ( array $match ): string {
				$args = $match[1] ?? '';
				$atts = '';

				foreach ( self::SETTINGS as $key => $data ) {
					if ( preg_match( '/\b' . $key . '="([^"]*)"/', $args, $found ) && '' !== $found[1] ) {
						$atts .= ' data-' . $data . '="' . esc_attr( $found[1] ) . '"';
					}
				}

				return '<div class="df7-pagebreak" aria-hidden="true"' . $atts . '></div>';
			},
			$elements
		);
	}
}
