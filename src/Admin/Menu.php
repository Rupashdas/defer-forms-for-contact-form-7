<?php
/**
 * The CF7 Nova admin menu, and the page bodies behind it.
 *
 * Every screen is the same three things: enqueue a bundle, print a root element,
 * let React take over. So there is one render method and a table of screens,
 * rather than seven functions that each said it again.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\Admin;

use CF7NL\CF7\Design;
use CF7NL\CF7\Product_Field;
use CF7NL\Core\Capability;

defined( 'ABSPATH' ) || exit;

final class Menu {

	private const SLUG = 'cf7-nova';

	private Design $design;

	public function __construct( Design $design ) {
		$this->design = $design;
	}

	/**
	 * The submenu, in order: page slug => [ entry name, label ].
	 *
	 * The entry name is both the Vite entry under ui/apps/ and half the id React
	 * mounts on (`cf7nl-<entry>-root`), which is why neither has to be repeated.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	private static function pages(): array {
		return array(
			self::SLUG             => array( 'dashboard', __( 'Dashboard', 'cf7-nova-lite' ) ),
			'cf7-nova-forms'       => array( 'forms', __( 'Forms', 'cf7-nova-lite' ) ),
			// Straight after Forms, not buried in Settings: this is the look of
			// every form on the site, and it is the first thing anyone goes
			// looking for after making one.
			'cf7-nova-styling'     => array( 'styling', __( 'Styling', 'cf7-nova-lite' ) ),
			'cf7-nova-submissions' => array( 'submissions', __( 'Submissions', 'cf7-nova-lite' ) ),
			'cf7-nova-templates'   => array( 'templates', __( 'Templates', 'cf7-nova-lite' ) ),
			'cf7-nova-settings'    => array( 'settings', __( 'Settings', 'cf7-nova-lite' ) ),
			'cf7-nova-modules'     => array( 'modules', __( 'Features', 'cf7-nova-lite' ) ),
		);
	}

	public function register_hooks(): void {
		add_action( 'admin_menu', array( $this, 'register' ) );
	}

	public function register(): void {
		$capability = Capability::required();

		// Only the menu title takes it — the page title is the browser tab and the
		// heading, and neither wants a count in it.
		$unread = Unread::bubble();

		add_menu_page(
			__( 'CF7 Nova', 'cf7-nova-lite' ),
			__( 'CF7 Nova', 'cf7-nova-lite' ) . $unread,
			$capability,
			self::SLUG,
			fn() => $this->render( 'dashboard' ),
			'dashicons-feedback',
			58
		);

		foreach ( self::pages() as $slug => [ $entry, $label ] ) {
			add_submenu_page(
				self::SLUG,
				$label,
				'cf7-nova-submissions' === $slug ? $label . $unread : $label,
				$capability,
				$slug,
				fn() => $this->render( $entry )
			);
		}

		// Hidden page (no menu item) — opened per-form from the Forms list.
		// An empty parent, not null: null is the older spelling of the same thing
		// and WordPress threads it into string parameters, so PHP 8.1 logs a
		// deprecation for every admin page load.
		add_submenu_page(
			'',
			__( 'Form Builder', 'cf7-nova-lite' ),
			__( 'Form Builder', 'cf7-nova-lite' ),
			$capability,
			'cf7-nova-builder',
			fn() => $this->render( 'builder' )
		);
	}

	/**
	 * One screen: its bundle, then the element React mounts on.
	 */
	private function render( string $entry ): void {
		$handle = Assets::enqueue( $entry );

		$this->hand_over( $entry, $handle );
		$this->skin_preview();

		printf(
			'<div class="wrap"><div id="cf7nl-%1$s-root"%2$s></div></div>',
			esc_attr( $entry ),
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- `%d` over an absint(); the attribute cannot carry anything but digits.
			'builder' === $entry ? sprintf( ' data-form-id="%d"', self::requested_form_id() ) : ''
		);
	}

	/**
	 * The saved design tokens, so a `.cf7nl-preview` looks like the real form.
	 *
	 * Here rather than on a hook of Design's own, because here is the one moment
	 * the handle exists: `wp_add_inline_style()` will not attach to a stylesheet
	 * WordPress has not been told about yet, and the line above is what tells it.
	 * Design used to print its own `<style>` on `admin_head` instead — before the
	 * bundle was registered, and therefore before the rules it needed to outrank.
	 *
	 * Every screen gets it, not just the two that draw a preview. The tokens are
	 * scoped to `.cf7nl-preview`, so on a screen without one they match nothing,
	 * and picking the screens by hand is a list to keep in step with the markup.
	 */
	private function skin_preview(): void {
		$style = Assets::last_style_handle();
		$css   = $this->design->preview_css();

		if ( '' !== $style && '' !== $css ) {
			wp_add_inline_style( $style, $css );
		}
	}

	/**
	 * Anything a screen needs that the REST API cannot carry.
	 *
	 * Submissions: admin-post.php is not the REST API, so its two endpoints
	 * travel with their own nonces rather than the one apiFetch uses.
	 *
	 * Builder: the field palette is drawn before a form is, and a builder opened
	 * with no form never calls a route at all — so what a field needs in order to
	 * be added cannot travel on the form response.
	 */
	private function hand_over( string $entry, string $handle ): void {
		if ( 'builder' === $entry ) {
			// Not wp_localize_script(): it casts every value to a string, and a
			// capability read as "" or "1" is a trap for the next one added.
			wp_add_inline_script(
				$handle,
				'window.cf7nlBuilder = ' . wp_json_encode( array( 'woocommerce' => Product_Field::is_available() ) ) . ';',
				'before'
			);

			return;
		}

		if ( 'submissions' !== $entry ) {
			return;
		}

		wp_localize_script(
			$handle,
			'cf7nlSubmissions',
			array(
				'exportUrl'       => admin_url( 'admin-post.php' ),
				'exportNonce'     => wp_create_nonce( 'cf7nl_export_csv' ),
				// Attachments go through admin-post.php too, under their own nonce.
				'attachmentNonce' => wp_create_nonce( Attachment_Download::ACTION ),
			)
		);
	}

	/**
	 * Which form the builder was opened for. Display only — every route the
	 * builder then calls checks the capability and the form for itself.
	 */
	private static function requested_form_id(): int {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- reading which screen to draw, not acting on it.
		return isset( $_GET['form'] ) ? absint( wp_unslash( $_GET['form'] ) ) : 0;
	}
}
