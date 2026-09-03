<?php
/**
 * The Defer Forms admin menu, and the page bodies behind it.
 *
 * Every screen is the same three things: enqueue a bundle, print a root element,
 * let React take over. So there is one render method and a table of screens,
 * rather than seven functions that each said it again.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\Admin;

use DF7\CF7\Attachments;
use DF7\CF7\Design;
use DF7\CF7\Product_Field;
use DF7\Core\Capability;
use DF7\DB\Submissions_Repository;
use DF7\Modules\Registry;

defined( 'ABSPATH' ) || exit;

final class Menu {

	private const SLUG = 'df7';

	private Design $design;

	private Submissions_Repository $submissions;

	public function __construct( Design $design, Submissions_Repository $submissions ) {
		$this->design      = $design;
		$this->submissions = $submissions;
	}

	/**
	 * The submenu, in order: page slug => [ entry name, label ].
	 *
	 * The entry name is both the Vite entry under ui/apps/ and half the id React
	 * mounts on (`df7-<entry>-root`), which is why neither has to be repeated.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	private static function pages(): array {
		return array(
			self::SLUG                     => array( 'dashboard', __( 'Dashboard', 'defer-forms-for-contact-form-7' ) ),
			'df7-forms'         => array( 'forms', __( 'Forms', 'defer-forms-for-contact-form-7' ) ),
			// Straight after Forms, not buried in Settings: this is the look of
			// every form on the site, and it is the first thing anyone goes
			// looking for after making one.
			'df7-styling'       => array( 'styling', __( 'Styling', 'defer-forms-for-contact-form-7' ) ),
			'df7-submissions'   => array( 'submissions', __( 'Submissions', 'defer-forms-for-contact-form-7' ) ),
			// Under Submissions, because that is the order of the work: entries
			// arrive, then somebody is told about them.
			//
			// Its own page rather than three more tabs in Settings, for the same
			// reason Styling has one. Each destination carries credentials and a
			// button that goes and tries them, which is a job rather than a
			// preference — and the routing rules to come need somewhere to live
			// that is not a seventh tab.
			'df7-notifications' => array( 'notifications', __( 'Notifications', 'defer-forms-for-contact-form-7' ) ),
			'df7-templates'     => array( 'templates', __( 'Templates', 'defer-forms-for-contact-form-7' ) ),
			'df7-settings'      => array( 'settings', __( 'Settings', 'defer-forms-for-contact-form-7' ) ),
			'df7-features'      => array( 'features', __( 'Features', 'defer-forms-for-contact-form-7' ) ),
		);
	}

	public function register_hooks(): void {
		add_action( 'admin_menu', array( $this, 'register' ) );
		add_action( 'admin_notices', array( $this, 'storage_notice' ) );
	}

	/**
	 * Say so when attachments are being turned away.
	 *
	 * The submission still arrives and the mail still goes; only the copy is
	 * refused. That is a quiet failure — an admin would find out by opening an
	 * entry and finding the file gone — so it is said out loud instead.
	 */
	public function storage_notice(): void {
		if ( ! Capability::granted() || ! get_transient( Attachments::FULL_KEY ) ) {
			return;
		}

		printf(
			'<div class="notice notice-warning"><p><strong>%s</strong> %s</p></div>',
			esc_html__( 'Defer Forms: uploads are no longer being kept.', 'defer-forms-for-contact-form-7' ),
			esc_html(
				sprintf(
					/* translators: 1: bytes in use, 2: the limit. */
					__( 'Stored attachments have reached %1$s of the %2$s limit. Submissions and their mail are unaffected — only the copies are being refused. Delete old entries, set a retention period, or raise the limit with the df7_attachment_limit filter.', 'defer-forms-for-contact-form-7' ),
					size_format( Attachments::used() ),
					size_format( Attachments::limit() )
				)
			)
		);
	}

	public function register(): void {
		$capability = Capability::required();

		// Only the menu title takes it — the page title is the browser tab and the
		// heading, and neither wants a count in it.
		$unread = Unread::bubble();

		add_menu_page(
			__( 'Defer Forms', 'defer-forms-for-contact-form-7' ),
			__( 'Defer Forms', 'defer-forms-for-contact-form-7' ) . $unread,
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
				'df7-submissions' === $slug ? $label . $unread : $label,
				$capability,
				$slug,
				fn() => $this->render( $entry )
			);
		}

		// Hidden page (no menu item) — opened per-form from the Forms list.
		// An empty parent, not null: null is the older spelling of the same thing
		// and WordPress threads it into string parameters, so PHP 8.1 logs a
		// deprecation for every admin page load.
		$builder = add_submenu_page(
			'',
			__( 'Form Builder', 'defer-forms-for-contact-form-7' ),
			__( 'Form Builder', 'defer-forms-for-contact-form-7' ),
			$capability,
			'df7-builder',
			fn() => $this->render( 'builder' )
		);

		/*
		 * And its own title, which nothing else will supply. An empty parent
		 * keeps the page out of the menu, and keeps it out of $submenu too, so
		 * get_admin_page_title() searches the top-level menu, finds nothing, and
		 * leaves the global null. The browser tab then read " ‹ site — WordPress"
		 * with no page name in it, and WordPress logged a deprecation for every
		 * builder load: admin-header.php passes that null to strip_tags().
		 *
		 * On `load-`, because admin.php fires it before including the header,
		 * and the page callback runs after — too late to name the page.
		 */
		if ( $builder ) {
			add_action(
				'load-' . $builder,
				static function (): void {
					// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- this global IS the mechanism: get_admin_page_title() sets it and admin-header.php reads it, and for a page with no parent nothing else will.
					$GLOBALS['title'] = __( 'Form Builder', 'defer-forms-for-contact-form-7' );
				}
			);
		}
	}

	/**
	 * One screen: its bundle, then the element React mounts on.
	 */
	private function render( string $entry ): void {
		$handle = Assets::enqueue( $entry );

		$this->hand_over( $entry, $handle );
		$this->skin_preview();

		printf(
			'<div class="wrap"><div id="df7-%1$s-root"%2$s></div></div>',
			esc_attr( $entry ),
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- `%d` over an absint(); the attribute cannot carry anything but digits.
			'builder' === $entry ? sprintf( ' data-form-id="%d"', self::requested_form_id() ) : ''
		);
	}

	/**
	 * The saved design tokens, so a `.df7-preview` looks like the real form.
	 *
	 * Here rather than on a hook of Design's own, because here is the one moment
	 * the handle exists: `wp_add_inline_style()` will not attach to a stylesheet
	 * WordPress has not been told about yet, and the line above is what tells it.
	 * Design used to print its own `<style>` on `admin_head` instead — before the
	 * bundle was registered, and therefore before the rules it needed to outrank.
	 *
	 * Every screen gets it, not just the two that draw a preview. The tokens are
	 * scoped to `.df7-preview`, so on a screen without one they match nothing,
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
				'window.df7Builder = ' . wp_json_encode( array( 'woocommerce' => Product_Field::is_available() ) ) . ';',
				'before'
			);

			return;
		}

		if ( 'dashboard' === $entry ) {
			/*
			 * How many forms have entries, so the loading state can draw the
			 * right number of rows in the breakdown rather than guessing two.
			 *
			 * Everything else on that screen can reserve its own height from
			 * markup alone; this one section is as tall as the site has forms,
			 * which is the one thing the browser cannot know before the fetch
			 * comes back. The server already does.
			 */
			wp_add_inline_script(
				$handle,
				'window.df7Dashboard = ' . wp_json_encode( array( 'forms' => count( $this->submissions->forms_with_counts() ) ) ) . ';',
				'before'
			);

			return;
		}

		if ( 'features' === $entry ) {
			/*
			 * The whole catalogue, not a count and not a route.
			 *
			 * It is a fixed list in this plugin — the same on every site, the
			 * same on every load — so fetching it left the screen drawing a
			 * skeleton of something already sitting in memory here. And no
			 * skeleton could have matched it: the cards are as tall as their
			 * descriptions wrap, which nothing knows before the text arrives.
			 *
			 * Five kilobytes inline against a round trip and a loading state.
			 * The route stays for anything else that wants it, and the page
			 * still falls back to it if this line never ran.
			 */
			wp_add_inline_script(
				$handle,
				'window.df7Features = ' . wp_json_encode( array( 'items' => Registry::definitions() ) ) . ';',
				'before'
			);

			return;
		}

		if ( 'submissions' !== $entry ) {
			return;
		}

		wp_localize_script(
			$handle,
			'df7Submissions',
			array(
				'exportUrl'       => admin_url( 'admin-post.php' ),
				'exportNonce'     => wp_create_nonce( 'df7_export_csv' ),
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
