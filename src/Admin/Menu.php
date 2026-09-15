<?php
/**
 * The Defer Forms admin menu, and the page bodies behind it.
 *
 * Every screen is the same three things: enqueue a bundle, print a root element,
 * let React take over. So there is one render method and a table of screens,
 * rather than seven functions that each said it again.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\Admin;

use DEFERFORMS\CF7\Attachments;
use DEFERFORMS\CF7\Design;
use DEFERFORMS\CF7\Product_Field;
use DEFERFORMS\Core\Capability;
use DEFERFORMS\DB\Submissions_Repository;
use DEFERFORMS\Modules\Registry;

defined( 'ABSPATH' ) || exit;

final class Menu {

	private const SLUG = 'deferforms';

	/** Where the documentation lives, for the two places that offer it. */
	private const DOCS = 'https://rupashdas.github.io/defer-forms-for-contact-form-7/';

	private const SUPPORT = 'https://wordpress.org/support/plugin/defer-forms-for-contact-form-7/';

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
	 * mounts on (`deferforms-<entry>-root`), which is why neither has to be repeated.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	private static function pages(): array {
		return array(
			self::SLUG                     => array( 'dashboard', __( 'Dashboard', 'defer-forms-for-contact-form-7' ) ),
			'deferforms-forms'         => array( 'forms', __( 'Forms', 'defer-forms-for-contact-form-7' ) ),
			// Straight after Forms, not buried in Settings: this is the look of
			// every form on the site, and it is the first thing anyone goes
			// looking for after making one.
			'deferforms-styling'       => array( 'styling', __( 'Styling', 'defer-forms-for-contact-form-7' ) ),
			'deferforms-submissions'   => array( 'submissions', __( 'Submissions', 'defer-forms-for-contact-form-7' ) ),
			// Under Submissions, because that is the order of the work: entries
			// arrive, then somebody is told about them.
			//
			// Its own page rather than three more tabs in Settings, for the same
			// reason Styling has one. Each destination carries credentials and a
			// button that goes and tries them, which is a job rather than a
			// preference — and the routing rules to come need somewhere to live
			// that is not a seventh tab.
			'deferforms-notifications' => array( 'notifications', __( 'Notifications', 'defer-forms-for-contact-form-7' ) ),
			'deferforms-templates'     => array( 'templates', __( 'Templates', 'defer-forms-for-contact-form-7' ) ),
			'deferforms-settings'      => array( 'settings', __( 'Settings', 'defer-forms-for-contact-form-7' ) ),
			'deferforms-features'      => array( 'features', __( 'Features', 'defer-forms-for-contact-form-7' ) ),
		);
	}

	public function register_hooks(): void {
		add_action( 'admin_menu', array( $this, 'register' ) );
		add_action( 'admin_notices', array( $this, 'storage_notice' ) );

		// Beside Deactivate on the Plugins screen: the one place somebody looks
		// for a plugin they have not opened yet.
		add_filter( 'plugin_action_links_' . DEFERFORMS_BASENAME, array( $this, 'action_links' ) );
	}

	/**
	 * Documentation and Settings, in front of WordPress's own row actions.
	 *
	 * @param array<int, string> $links
	 * @return array<int, string>
	 */
	public function action_links( array $links ): array {
		if ( ! Capability::granted() ) {
			return $links;
		}

		return array_merge(
			array(
				sprintf(
					'<a href="%s">%s</a>',
					esc_url( admin_url( 'admin.php?page=' . self::SLUG . '-settings' ) ),
					esc_html__( 'Settings', 'defer-forms-for-contact-form-7' )
				),
				sprintf(
					'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
					esc_url( self::DOCS ),
					esc_html__( 'Documentation', 'defer-forms-for-contact-form-7' )
				),
			),
			$links
		);
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
					__( 'Stored attachments have reached %1$s of the %2$s limit. Submissions and their mail are unaffected — only the copies are being refused. Delete old entries, set a retention period, or raise the limit with the deferforms_attachment_limit filter.', 'defer-forms-for-contact-form-7' ),
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

		$hook = add_menu_page(
			__( 'Defer Forms', 'defer-forms-for-contact-form-7' ),
			__( 'Defer Forms', 'defer-forms-for-contact-form-7' ) . $unread,
			$capability,
			self::SLUG,
			fn() => $this->render( 'dashboard' ),
			'dashicons-feedback',
			58
		);

		$this->add_help( $hook, 'dashboard' );

		foreach ( self::pages() as $slug => [ $entry, $label ] ) {
			$hook = add_submenu_page(
				self::SLUG,
				$label,
				'deferforms-submissions' === $slug ? $label . $unread : $label,
				$capability,
				$slug,
				fn() => $this->render( $entry )
			);

			// The Dashboard entry reuses the top-level page's own slug — that is
			// what turns its submenu label into "Dashboard" instead of repeating
			// "Defer Forms" — so it is also the same hook, already given its help
			// tab above. Registering it a second time would just overwrite itself.
			if ( self::SLUG !== $slug ) {
				$this->add_help( $hook, $entry );
			}
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
			'deferforms-builder',
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
	 * What each screen's Help tab says, keyed the same way pages() keys its entries.
	 *
	 * One tab, not several — a screen small enough to draw in an admin page does
	 * not need sub-tabs to explain it. Builder has none: it is dense enough that a
	 * paragraph above it would say less than the screen already shows, field by
	 * field.
	 *
	 * @return array<string, string>
	 */
	private static function help(): array {
		return array(
			'dashboard'     => '<p>' . __( "This is where your forms' activity lives: how many entries came in, whether any are unread or still waiting on a reply, and which forms are getting used.", 'defer-forms-for-contact-form-7' ) . '</p><p>' .
				__( 'The Needs a reply tile counts submitted entries nobody has answered yet — open one and mark it Replied to clear it. Submissions compares the last 30 days against the 30 before, so a change shows against something rather than nothing.', 'defer-forms-for-contact-form-7' ) . '</p>',
			'forms'         => '<p>' . __( 'Every Contact Form 7 form on this site, whether or not it was built here. Open Edit to work on one in the visual builder, or start a new one and you will be asked for a name and taken straight in.', 'defer-forms-for-contact-form-7' ) . '</p><p>' .
				__( 'A form can also be duplicated, renamed or deleted from its row — deleting a form does not delete the entries it already collected.', 'defer-forms-for-contact-form-7' ) . '</p>',
			'styling'       => '<p>' . __( 'Colours, spacing and typography here apply to every form this plugin styles across the whole site, and the preview matches the front end.', 'defer-forms-for-contact-form-7' ) . '</p><p>' .
				__( "To make one form look different from the rest, give it a CSS class of its own under that form's Settings tab in the builder, and target that class from your theme.", 'defer-forms-for-contact-form-7' ) . '</p>',
			'submissions'   => '<p>' . __( 'Every entry your forms have received, with search, filters and CSV export.', 'defer-forms-for-contact-form-7' ) . '</p><p>' .
				__( 'Mark an entry Replied or Done to keep this list working like an inbox rather than a log — press the same button again to undo it. Spam is kept on its own tab rather than deleted outright, in case the filter ever catches a real one by mistake.', 'defer-forms-for-contact-form-7' ) . '</p>',
			'notifications' => '<p>' . __( 'Send every submission somewhere the moment it arrives — Telegram, Slack, Discord, or a webhook of your own.', 'defer-forms-for-contact-form-7' ) . '</p><p>' .
				__( 'Each destination stays off until you fill in its details and switch it on, and none of them ever receive an entry caught as spam. Use Send a test message after saving, before relying on it.', 'defer-forms-for-contact-form-7' ) . '</p>',
			'templates'     => '<p>' . __( 'Start a new form from one of these instead of building one field at a time. Choosing a template opens it, already filled in, straight in the builder — nothing is created on this site until you save it.', 'defer-forms-for-contact-form-7' ) . '</p>',
			'settings'      => '<p>' . __( 'Behaviour that is not specific to any one form: how long submissions are kept, the spam checks applied to every form, and privacy.', 'defer-forms-for-contact-form-7' ) . '</p><p>' .
				__( "Submissions already answer WordPress's own Export/Erase Personal Data tools under Tools, with nothing extra to set up here.", 'defer-forms-for-contact-form-7' ) . '</p>',
			'features'      => '<p>' . __( 'Everything this plugin does today, and what is planned for a future release. Nothing on this screen is switched off — there is nothing here to enable.', 'defer-forms-for-contact-form-7' ) . '</p>',
		);
	}

	/**
	 * One Help tab, added once the screen for `$hook` is known to exist.
	 *
	 * On `load-`, for the reason given on the builder's title fix above: by the
	 * time the page callback runs, admin-header.php has already printed the Help
	 * dropdown for the request.
	 */
	private function add_help( string|false $hook, string $entry ): void {
		$help = self::help();

		if ( ! $hook || ! isset( $help[ $entry ] ) ) {
			return;
		}

		add_action(
			'load-' . $hook,
			static function () use ( $entry, $help ): void {
				$screen = get_current_screen();

				if ( ! $screen ) {
					return;
				}

				$screen->add_help_tab(
					array(
						'id'      => 'deferforms-help-' . $entry,
						'title'   => __( 'Defer Forms', 'defer-forms-for-contact-form-7' ),
						'content' => $help[ $entry ],
					)
				);

				$screen->set_help_sidebar(
					'<p>' . sprintf(
						/* translators: %s: a link to the documentation site. */
						__( 'Longer answers: %s', 'defer-forms-for-contact-form-7' ),
						'<a href="' . esc_url( self::DOCS ) . '" target="_blank" rel="noopener noreferrer">' .
							__( 'read the documentation', 'defer-forms-for-contact-form-7' ) . '</a>'
					) . '</p><p>' . sprintf(
						/* translators: %s: a link to the wordpress.org support forum. */
						__( 'Still stuck? %s', 'defer-forms-for-contact-form-7' ),
						'<a href="' . esc_url( self::SUPPORT ) . '" target="_blank" rel="noopener noreferrer">' .
							__( 'Ask on the support forum', 'defer-forms-for-contact-form-7' ) . '</a>'
					) . '</p>'
				);
			}
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
			'<div class="wrap"><div id="deferforms-%1$s-root"%2$s></div></div>',
			esc_attr( $entry ),
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- `%d` over an absint(); the attribute cannot carry anything but digits.
			'builder' === $entry ? sprintf( ' data-form-id="%d"', self::requested_form_id() ) : ''
		);
	}

	/**
	 * The saved design tokens, so a `.deferforms-preview` looks like the real form.
	 *
	 * Here rather than on a hook of Design's own, because here is the one moment
	 * the handle exists: `wp_add_inline_style()` will not attach to a stylesheet
	 * WordPress has not been told about yet, and the line above is what tells it.
	 * Design used to print its own `<style>` on `admin_head` instead — before the
	 * bundle was registered, and therefore before the rules it needed to outrank.
	 *
	 * Every screen gets it, not just the two that draw a preview. The tokens are
	 * scoped to `.deferforms-preview`, so on a screen without one they match nothing,
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
				'window.deferformsBuilder = ' . wp_json_encode( array( 'woocommerce' => Product_Field::is_available() ) ) . ';',
				'before'
			);

			return;
		}

		if ( 'dashboard' === $entry ) {
			/*
			 * Two counts, for two different reasons neither markup can answer.
			 *
			 * `forms` is how many forms have at least one entry — zero of those
			 * proves the fetch will come back with no submissions at all, which
			 * is what tells the loading state to show the empty state right
			 * away rather than a skeleton for a screen that never arrives.
			 *
			 * `totalForms` is every published form, entries or not — the "Your
			 * forms" list draws one row per form regardless of whether it has
			 * been used yet, so its loading state needs the real row count
			 * rather than guessing three.
			 */
			wp_add_inline_script(
				$handle,
				'window.deferformsDashboard = ' . wp_json_encode(
					array(
						'forms'      => count( $this->submissions->forms_with_counts() ),
						'totalForms' => count( $this->submissions->all_forms() ),
					)
				) . ';',
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
				'window.deferformsFeatures = ' . wp_json_encode( array( 'items' => Registry::definitions() ) ) . ';',
				'before'
			);

			return;
		}

		if ( 'submissions' !== $entry ) {
			return;
		}

		wp_localize_script(
			$handle,
			'deferformsSubmissions',
			array(
				'exportUrl'       => admin_url( 'admin-post.php' ),
				'exportNonce'     => wp_create_nonce( 'deferforms_export_csv' ),
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
