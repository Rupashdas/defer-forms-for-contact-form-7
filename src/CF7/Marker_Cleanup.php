<?php
/**
 * Post-processing for our unregistered marker tags (row/col/pagebreak/if).
 *
 * Runs after the feature classes have converted their markers
 * (`wpcf7_form_elements`, priority 20) and does two things:
 *
 * 1. Undoes autop damage around the divs they produced. CF7 shields *registered*
 *    form-tags from `wpcf7_autop()` with placeholders; our markers are
 *    unregistered, so autop wraps them in paragraphs and sprinkles <br> around
 *    them.
 * 2. Removes any marker still standing, as a backstop. Every class that owns one
 *    is always registered, so this should never fire — but a marker reaching a
 *    visitor as literal `[cf7nl_row]` text is bad enough to keep a net under.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Marker_Cleanup {

	/**
	 * Every marker we own.
	 *
	 * There is no longer a per-feature split here. Grid, multi-step and
	 * conditional are what saved forms are made of, so they are always on — a
	 * switch that took them away would not disable a feature, it would take apart
	 * the forms already built with it. What is left below is a backstop: a marker
	 * that somehow reached the page unconverted must not print at anybody.
	 */
	private const MARKERS = array(
		'\[cf7nl_row(?:\s+cols="\d+")?\]',
		'\[\/cf7nl_row\]',
		'\[cf7nl_col\]',
		'\[\/cf7nl_col\]',
		'\[cf7nl_pagebreak(?:\s+[^\]]*)?\]',
		'\[cf7nl_if\s+[^\]]*\]',
		'\[\/cf7nl_if\]',
	);

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'tidy' ), 20 );
	}

	public function tidy( string $elements ): string {
		if ( false !== strpos( $elements, '[cf7nl_' ) ) {
			$elements = $this->strip_markers( $elements );
		}

		if ( false !== strpos( $elements, 'cf7nl-' ) ) {
			$elements = $this->undo_autop( $elements );
		}

		// Always: autop leaves empty paragraphs wherever a marker stood alone on
		// its line, whether that marker became a div or was stripped.
		return (string) preg_replace( '#<p>\s*</p>#i', '', $elements );
	}

	/**
	 * Remove markers, and the line ending each one occupies.
	 *
	 * Taking the marker alone leaves the break behind — a run of empty space
	 * where the layout used to be. The form does not print `[cf7nl_row]` at
	 * anybody, it just falls apart quietly instead.
	 */
	private function strip_markers( string $elements ): string {
		$patterns = array();
		foreach ( self::MARKERS as $marker ) {
			// The marker sits on its own line, so the line ending goes with it.
			// In the raw template that is a newline; by the time this runs on
			// rendered HTML autop has already made it a <br>. One only — a blank
			// line after it is spacing the visitor chose.
			$patterns[] = '#' . $marker . '[ \t]*(?:\r?\n|<br\s*/?>[ \t]*\r?\n?)?#i';
		}

		return (string) preg_replace( $patterns, '', $elements );
	}

	/**
	 * Peel the <p>/<br> wrapping autop put around our block-level divs.
	 */
	private function undo_autop( string $elements ): string {
		$open = '<div[^>]*class="[^"]*cf7nl-[^"]*"[^>]*>';

		return (string) preg_replace(
			array(
				// <br> right after one of our opening divs.
				'#(' . $open . ')(?:\s*<br\s*/?>)+#i',
				// <br> right before any closing div.
				'#(?:<br\s*/?>\s*)+(</div>)#i',
				// <br> sitting between two of our divs — as a grid child it would
				// take a column slot of its own and push the layout out of line.
				'#(</div>)\s*(?:<br\s*/?>\s*)+(' . $open . ')#i',
				// A paragraph opened just before / closed just after our div.
				'#<p>\s*(' . $open . ')#i',
				'#(</div>)\s*</p>#i',
			),
			array( '$1', '$1', '$1' . "\n" . '$2', '$1', '$1' ),
			$elements
		);
	}
}
