<?php
/**
 * Renders Defer Forms grid rows on the front-end. `[df7_row cols="N"][df7_col] …
 * [/df7_col] … [/df7_row]` markers survive CF7's form-tag pass (the tags are
 * unregistered, so CF7 leaves them literal); we convert them to grid/column divs
 * after the real form-tags render.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Grid {

	public function register_hooks(): void {
		// Priority 9 so the divs exist before Form_Styles decides to enqueue CSS.
		add_filter( 'wpcf7_form_elements', array( $this, 'render_rows' ), 9 );
	}

	public function render_rows( string $elements ): string {
		if ( false === strpos( $elements, '[df7_row' ) ) {
			return $elements;
		}

		$elements = (string) preg_replace_callback(
			'/\[df7_row(?:\s+cols="(\d+)")?\]/',
			static function ( $match ) {
				$cols = isset( $match[1] ) ? max( 1, min( 4, (int) $match[1] ) ) : 2;
				return '<div class="df7-row df7-cols-' . $cols . '">';
			},
			$elements
		);

		return str_replace(
			array( '[df7_col]', '[/df7_col]', '[/df7_row]' ),
			array( '<div class="df7-col">', '</div>', '</div>' ),
			$elements
		);
	}
}
