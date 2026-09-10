<?php
/**
 * The round-trip between CF7 form-tag markup and the builder's item list.
 *
 * This is the name the rest of the plugin calls, and the whole of both halves
 * used to live behind it — 1100 lines doing two opposite jobs, sharing three
 * constants and nothing else. It is now a seam rather than an implementation:
 *
 *   - Form_Parser     markup → items
 *   - Form_Serializer items → markup
 *   - Form_Markup     the handful of things the two must agree on
 *
 * Kept as a facade rather than deleted because `parse()` and `serialize()` are
 * what every caller and every round-trip test names, and a rename would have
 * churned all of them to say the same thing.
 *
 * An item's `kind` is one of:
 *   - 'field':     a CF7 form-tag (text, email, select, …)
 *   - 'content':   a layout block (heading/paragraph/divider/spacer)
 *   - 'row':       a grid row wrapping child items in columns
 *   - 'pagebreak': a multi-step page break ([deferforms_pagebreak])
 *   - 'html':      free-form markup between tags (preserved verbatim)
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class Form_Tag_Parser {

	/**
	 * Markup → item list.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function parse( string $markup ): array {
		return Form_Parser::parse( $markup );
	}

	/**
	 * Item list → markup.
	 *
	 * @param array<int, array<string, mixed>> $items
	 */
	public static function serialize( array $items ): string {
		return Form_Serializer::serialize( $items );
	}
}
