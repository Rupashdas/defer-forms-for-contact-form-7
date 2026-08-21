<?php
/**
 * What may be stored in a form template, and by whom.
 *
 * This rule used to live as a private method on one REST controller, and the
 * consequence was exactly what you would expect: the *other* route that writes
 * a form template — import — did not have it. A bundle is a file a user
 * uploads, so its `form` property is untrusted input, and it went to
 * `wpcf7_save_contact_form()` unfiltered. Contact Form 7 does not filter it
 * either; it treats templates as admin-trusted content, which is precisely the
 * assumption this plugin decided not to inherit.
 *
 * `manage_options` is not `unfiltered_html`. On multisite no site administrator
 * has `unfiltered_html` — only super admins do — and any site that lowered
 * `cf7nl_capability` to let editors in is in the same position. Without the
 * gate, such a user could store `<script>` in a template that then renders for
 * every public visitor.
 *
 * So the capability check lives inside `filter()` rather than beside each call.
 * A caller cannot apply the allow-list and forget the capability, or check the
 * capability and forget the allow-list — there is one way in, and it does both.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Form_Html {

	/**
	 * Run a form template through the allow-list, unless the current user is
	 * trusted with raw HTML.
	 *
	 * @param string $markup A CF7 form template.
	 * @return string The same markup, or the filtered version of it.
	 */
	public static function filter( string $markup ): string {
		if ( current_user_can( 'unfiltered_html' ) ) {
			return $markup;
		}

		return wp_kses( $markup, self::allowed() );
	}

	/**
	 * What a form template may contain when its author lacks `unfiltered_html`.
	 *
	 * `wp_kses_post()` would be the obvious list and it is the wrong one: it has
	 * no form elements in it, so a form carrying a hand-written `<input
	 * type="hidden">` — a perfectly ordinary thing for a CF7 template to do —
	 * would quietly lose it the first time somebody opened and saved that form in
	 * the builder. Post markup plus the controls a form is made of is the honest
	 * list. Neither list has `<script>` in it, and kses drops `on*` handlers and
	 * `javascript:` URLs from everything that survives, which is the point.
	 *
	 * @return array<string, array<string, bool>>
	 */
	public static function allowed(): array {
		$common = array(
			'id'           => true,
			'class'        => true,
			'style'        => true,
			'title'        => true,
			'name'         => true,
			'value'        => true,
			'type'         => true,
			'placeholder'  => true,
			'required'     => true,
			'disabled'     => true,
			'readonly'     => true,
			'checked'      => true,
			'selected'     => true,
			'multiple'     => true,
			'min'          => true,
			'max'          => true,
			'step'         => true,
			'size'         => true,
			'maxlength'    => true,
			'minlength'    => true,
			'rows'         => true,
			'cols'         => true,
			'accept'       => true,
			'autocomplete' => true,
			'tabindex'     => true,
			'for'          => true,
			'list'         => true,
			'pattern'      => true,
			'data-*'       => true,
			'aria-*'       => true,
			'role'         => true,
		);

		$controls = array(
			'input'    => $common,
			'select'   => $common,
			'option'   => $common,
			'optgroup' => $common,
			'textarea' => $common,
			'button'   => $common,
			'label'    => $common,
			'fieldset' => $common,
			'legend'   => $common,
			'datalist' => $common,
			'output'   => $common,
		);

		return array_merge( wp_kses_allowed_html( 'post' ), $controls );
	}
}
