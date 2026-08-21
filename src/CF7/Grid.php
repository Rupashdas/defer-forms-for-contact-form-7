<?php
/**
 * Renders Nova grid rows on the front-end. `[cf7nl_row cols="N"][cf7nl_col] …
 * [/cf7nl_col] … [/cf7nl_row]` markers survive CF7's form-tag pass (the tags are
 * unregistered, so CF7 leaves them literal); we convert them to grid/column divs
 * after the real form-tags render.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Grid {

	public function register_hooks(): void {
		// Priority 9 so the divs exist before Form_Styles decides to enqueue CSS.
		add_filter( 'wpcf7_form_elements', array( $this, 'render_rows' ), 9 );
	}

	public function render_rows( string $elements ): string {
		if ( false === strpos( $elements, '[cf7nl_row' ) ) {
			return $elements;
		}

		$elements = (string) preg_replace_callback(
			'/\[cf7nl_row(?:\s+cols="(\d+)")?\]/',
			static function ( $match ) {
				$cols = isset( $match[1] ) ? max( 1, min( 4, (int) $match[1] ) ) : 2;
				return '<div class="cf7nl-row cf7nl-cols-' . $cols . '">';
			},
			$elements
		);

		return str_replace(
			array( '[cf7nl_col]', '[/cf7nl_col]', '[/cf7nl_row]' ),
			array( '<div class="cf7nl-col">', '</div>', '</div>' ),
			$elements
		);
	}
}
