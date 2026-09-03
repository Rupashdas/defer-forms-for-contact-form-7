<?php
/**
 * Conditional fields on the front-end. A `[df7_if action="…" groups="…"] …
 * [/df7_if]` marker (unregistered tag, so CF7 leaves it literal) wraps a field;
 * we turn it into a div the front-end script reads to show/hide the field as the
 * controlling fields change.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Conditional {

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'render' ), 9 );
		add_filter( 'wpcf7_validate', array( $this, 'skip_hidden_required' ), 20, 2 );
		add_filter( 'wpcf7_acceptance', array( $this, 'skip_hidden_acceptance' ), 20, 2 );
	}

	/**
	 * Names of the fields the current form wraps in a `[df7_if]` region.
	 *
	 * This is the allow-list for skipping required checks: a field that is never
	 * conditionally hidden has no business being skipped, whatever the browser
	 * claims.
	 *
	 * @return array<int, string>
	 */
	private static function conditional_field_names(): array {
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			return array();
		}

		$form = \WPCF7_ContactForm::get_current();
		if ( ! $form ) {
			return array();
		}

		$names = array();

		$walk = static function ( array $items ) use ( &$walk, &$names ): void {
			foreach ( $items as $item ) {
				if ( 'row' === ( $item['kind'] ?? '' ) ) {
					foreach ( (array) ( $item['columns'] ?? array() ) as $column ) {
						$walk( (array) $column );
					}
					continue;
				}
				if ( ! empty( $item['condition'] ) && ! empty( $item['name'] ) ) {
					$names[] = (string) $item['name'];
				}
			}
		};

		$walk( Form_Tag_Parser::parse( (string) $form->prop( 'form' ) ) );

		return $names;
	}

	/**
	 * The fields the browser says it currently has hidden.
	 *
	 * The browser is not trusted here. `_df7_hidden` is an ordinary POST
	 * field, so anyone could list every required field in the form and have its
	 * validation thrown away — or, since the acceptance side reads this too,
	 * wave away the terms they are agreeing to. Only fields the form itself puts
	 * inside a conditional region survive.
	 *
	 * @return array<int, string>
	 */
	private static function hidden_names(): array {
		if ( empty( $_POST['_df7_hidden'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return array();
		}

		// The sanitisation is below, not skipped: every decoded name is stripped
		// to [A-Za-z0-9_-] before it is used. Sanitising the JSON first would
		// only mangle it. The nonce is CF7's, checked before these filters run.
		$decoded = json_decode( wp_unslash( (string) $_POST['_df7_hidden'] ), true ); // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		if ( ! is_array( $decoded ) || empty( $decoded ) ) {
			return array();
		}

		$claimed = array_map(
			static fn( $name ) => (string) preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) $name ),
			$decoded
		);

		return array_values( array_intersect( $claimed, self::conditional_field_names() ) );
	}

	/**
	 * Drop validation errors for fields the front-end currently has hidden, so a
	 * hidden required field can't block submission. The browser posts the hidden
	 * field names in `_df7_hidden`; we rebuild the validation result without
	 * them (WPCF7_Validation has no public remove, but returning a fresh result
	 * replaces it). CF7 has already run its own nonce/spam checks by this point.
	 *
	 * @param \WPCF7_Validation          $result Validation result.
	 * @param array<int, \WPCF7_FormTag> $tags  Scanned form tags.
	 * @return \WPCF7_Validation
	 */
	public function skip_hidden_required( $result, $tags ) {
		$hidden = self::hidden_names();
		if ( empty( $hidden ) ) {
			return $result;
		}

		$kept    = array();
		$changed = false;
		foreach ( $result->get_invalid_fields() as $name => $data ) {
			if ( in_array( $name, $hidden, true ) ) {
				$changed = true;
				continue;
			}
			$kept[ $name ] = $data;
		}

		if ( ! $changed ) {
			return $result;
		}

		$fresh = new \WPCF7_Validation();
		foreach ( $kept as $name => $data ) {
			$fresh->invalidate( $name, (string) ( $data['reason'] ?? '' ) );
		}
		return $fresh;
	}

	/**
	 * Let a submission through when the only unticked acceptance boxes are ones
	 * a conditional region is hiding.
	 *
	 * An acceptance box never reaches skip_hidden_required(): CF7 keeps it off
	 * the validation path entirely and settles it here instead — see
	 * `wpcf7_acceptance_filter()` in modules/acceptance.php, which answers with a
	 * bare false and no field name. That is why a hidden consent box refused the
	 * whole form with "You must accept the terms and conditions" about a checkbox
	 * that was never on screen and cannot be reached.
	 *
	 * CF7's rule is re-run rather than reasoned about, over the boxes still
	 * showing. `$_POST` directly, as everywhere else in this file: CF7's own
	 * wpcf7_superglobal_post() reads the same array, and this plugin does not
	 * pin a CF7 version old installs are guaranteed to have it in.
	 *
	 * @param bool  $accepted   What CF7 has already decided.
	 * @param mixed $submission The submission, which this does not need.
	 * @return bool
	 */
	public function skip_hidden_acceptance( $accepted, $submission ) {
		if ( $accepted ) {
			return $accepted;
		}

		$hidden = self::hidden_names();
		if ( empty( $hidden ) || ! function_exists( 'wpcf7_scan_form_tags' ) ) {
			return $accepted;
		}

		/** @var array<int, \WPCF7_FormTag> $tags */
		$tags = wpcf7_scan_form_tags( array( 'type' => 'acceptance' ) );

		foreach ( $tags as $tag ) {
			if ( empty( $tag->name ) || $tag->has_option( 'optional' ) ) {
				continue;
			}

			if ( in_array( $tag->name, $hidden, true ) ) {
				continue;
			}

			$ticked = ! empty( $_POST[ $tag->name ] ); // phpcs:ignore WordPress.Security.NonceVerification

			// CF7's own test, spelled the short way: a plain box refuses while it
			// is unticked, an `invert` one refuses while it is ticked.
			if ( $tag->has_option( 'invert' ) === $ticked ) {
				return false;
			}
		}

		return true;
	}

	public function render( string $elements ): string {
		if ( false === strpos( $elements, '[df7_if' ) ) {
			return $elements;
		}

		$elements = (string) preg_replace_callback(
			'/\[df7_if\s+([^\]]*)\]/',
			static function ( $match ) {
				$attrs  = (string) $match[1];
				$get    = static function ( string $key ) use ( $attrs ): string {
					return preg_match( '/\b' . $key . '="([^"]*)"/', $attrs, $found ) ? $found[1] : '';
				};
				$action = 'hide' === $get( 'action' ) ? 'hide' : 'show';
				$groups = $get( 'groups' );
				return '<div class="df7-if" data-action="' . esc_attr( $action ) . '" data-groups="' . esc_attr( $groups ) . '">';
			},
			$elements
		);

		wp_enqueue_script( 'df7-conditional', DF7_URL . 'assets/js/conditional.js', array( Validation::BASE ), df7_asset_ver( 'assets/js/conditional.js' ), true );

		return str_replace( '[/df7_if]', '</div>', $elements );
	}
}
