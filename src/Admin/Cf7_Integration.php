<?php
/**
 * Ways into the visual builder from Contact Form 7's own screens.
 *
 * Someone who already lives in CF7's form editor should not have to learn a new
 * menu to find this. Two entry points: a button on the single-form screen, and a
 * row action in the forms list.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\Admin;

use CF7E\Core\Capability;

defined( 'ABSPATH' ) || exit;

final class Cf7_Integration {

	public function register_hooks(): void {
		add_action( 'wpcf7_admin_misc_pub_section', array( $this, 'render_builder_button' ) );
		add_action( 'admin_footer', array( $this, 'inject_row_action' ) );
	}

	/** Everything up to the form id, which the two callers finish differently. */
	private static function builder_url_base(): string {
		return admin_url( 'admin.php?page=cf7-essentials-builder&form=' );
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
			esc_html__( 'Edit with the visual builder', 'essentials-for-contact-form-7' )
		);
		echo '</div>';
	}

	/**
	 * CF7's list table applies no row-action filter, so the link is added in the
	 * browser instead — reading each row's own edit link for the form id rather
	 * than trying to rebuild the table's markup here.
	 */
	public function inject_row_action(): void {
		if ( ! Capability::granted() || ! $this->on_forms_list() ) {
			return;
		}

		$base  = self::builder_url_base();
		$label = __( 'Visual Builder', 'essentials-for-contact-form-7' );
		?>
		<script>
		( function () {
			var base  = <?php echo wp_json_encode( $base ); ?>;
			var label = <?php echo wp_json_encode( $label ); ?>;
			document.querySelectorAll( '.wp-list-table .row-actions' ).forEach( function ( actions ) {
				var link = actions.querySelector( 'a[href*="action=edit"]' );
				if ( ! link ) { return; }
				var m = link.href.match( /[?&]post=(\d+)/ );
				if ( ! m ) { return; }
				var a = document.createElement( 'a' );
				a.href = base + m[ 1 ];
				a.textContent = label;
				var span = document.createElement( 'span' );
				span.className = 'cf7e-builder-link';
				span.appendChild( document.createTextNode( ' | ' ) );
				span.appendChild( a );
				actions.appendChild( span );
			} );
		} )();
		</script>
		<?php
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
