<?php
/**
 * Ways into the visual builder from Contact Form 7's own screens.
 *
 * Someone who already lives in CF7's form editor should not have to learn a new
 * menu to find this. Two entry points: a button on the single-form screen, and a
 * row action in the forms list.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\Admin;

use DF7\Core\Capability;

defined( 'ABSPATH' ) || exit;

final class Cf7_Integration {

	public function register_hooks(): void {
		add_action( 'wpcf7_admin_misc_pub_section', array( $this, 'render_builder_button' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_row_action' ) );
	}

	/** Everything up to the form id, which the two callers finish differently. */
	private static function builder_url_base(): string {
		return admin_url( 'admin.php?page=df7-builder&form=' );
	}

	private static function builder_url( int $form_id ): string {
		return self::builder_url_base() . $form_id;
	}

	/**
	 * @param int|string $post_id The form being edited.
	 */
	public function render_builder_button( $post_id ): void {
		if ( ! Capability::granted() ) {
			return;
		}

		echo '<div class="misc-pub-section" style="text-align:center;">';
		printf(
			'<a href="%s" class="button button-primary button-large" style="width:100%%;justify-content:center;">%s</a>',
			esc_url( self::builder_url( (int) $post_id ) ),
			esc_html__( 'Edit with the visual builder', 'defer-forms-for-contact-form-7' )
		);
		echo '</div>';
	}

	/**
	 * The row-action link is drawn by row-action.js; this puts it on the page.
	 *
	 * In the footer, like the rest of this plugin's scripts, because it walks the
	 * list table's rows the moment it runs.
	 */
	public function enqueue_row_action(): void {
		if ( ! Capability::granted() || ! $this->on_forms_list() ) {
			return;
		}

		wp_enqueue_script(
			'df7-row-action',
			DF7_URL . 'assets/js/row-action.js',
			array(),
			df7_asset_ver( 'assets/js/row-action.js' ),
			true
		);

		wp_localize_script(
			'df7-row-action',
			'df7RowAction',
			array(
				'base'  => self::builder_url_base(),
				'label' => __( 'Visual Builder', 'defer-forms-for-contact-form-7' ),
			)
		);
	}

	/** CF7's contact-forms list, and not the single-form editor inside it. */
	private function on_forms_list(): bool {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( ! $screen || 'toplevel_page_wpcf7' !== $screen->id ) {
			return false;
		}

		// The single-form edit screen has no row actions to add to.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- reading which screen we are on, not acting on it.
		return ! isset( $_GET['post'] ) && ! isset( $_GET['action'] );
	}
}
