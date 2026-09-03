<?php
/**
 * The vocabulary the parser and the serializer both have to agree on.
 *
 * Splitting those two apart left a handful of things neither of them owns: the
 * marker class names a phone field's format travels under, the settings a page
 * break carries, and how a caption is escaped on the way in and unescaped on the
 * way out. Two copies of any of them is a round-trip that silently stops closing.
 *
 * ## Where user text gets escaped, and where it does not
 *
 * There were three different answers to this once — content blocks escaped `<`,
 * field captions escaped nothing, page-break settings stripped `"` — which is
 * how a caption became the one place markup could survive into a saved form.
 * There is one rule now, and it turns on where the string lands:
 *
 *  - **Element content** — a heading's text, a field's `<label>`, an acceptance
 *    box's consent line. Escaped here, by escape_text(), on the way into the
 *    stored template, and decoded again by decode_text() when the builder reads
 *    it back. Escaping without the matching decode is what turns `a < b` into
 *    `&amp;lt;` after two saves.
 *  - **A form-tag's own options** — `min:`, `class:`, and the rest. Not escaped;
 *    cut down instead, by Form_Serializer::option_value(), because the tag
 *    syntax ends at the first `]` and splits on whitespace. An entity would not
 *    help there — the character simply cannot appear.
 *  - **HTML attributes** — a page break's title and description, which ride as
 *    `data-` attributes. Left alone here on purpose: they are escaped at render
 *    time by esc_attr() in Steps.php and read back with textContent in
 *    steps.js. Escaping them here as well would double-encode them.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Form_Markup {

	/** Phone field markers. The format is base64url so it survives being a class. */
	public const TEL_DIGITS = 'df7-tel';

	public const TEL_FORMAT = 'df7-telfmt-';

	/** Settings a page break carries, and the order they are written back in. */
	public const STEP_ATTRS = array( 'title', 'desc', 'prev', 'next', 'class', 'id' );

	/**
	 * A string the user typed, on its way into markup.
	 *
	 * Only `<` matters: everything written here lands in element content, never in
	 * an attribute, and leaving `>` and `&` alone keeps the stored template
	 * readable in Contact Form 7's own editor.
	 */
	public static function escape_text( string $text ): string {
		return str_replace( '<', '&lt;', $text );
	}

	/**
	 * The same string on its way back out, so what the builder shows is what was
	 * typed rather than what was stored. Without the pairing, editing and saving a
	 * caption twice would turn `<` into `&lt;` and then into `&amp;lt;`.
	 */
	public static function decode_text( string $text ): string {
		return html_entity_decode( $text, ENT_QUOTES, 'UTF-8' );
	}
}
