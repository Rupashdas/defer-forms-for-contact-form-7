<?php
/**
 * Hands a stored attachment to an admin who asks for it.
 *
 * The files are deliberately not reachable over the web — see
 * src/CF7/Attachments.php — so this is the only way to them, and it is the only
 * place the checks can live: the capability, a nonce, and a path that has to
 * resolve inside the attachments directory.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\Admin;

use CF7E\CF7\Attachments;
use CF7E\Core\Capability;

defined( 'ABSPATH' ) || exit;

final class Attachment_Download {

	public const ACTION = 'cf7e_attachment';

	public function register_hooks(): void {
		add_action( 'admin_post_' . self::ACTION, array( $this, 'serve' ) );
	}

	public function serve(): void {
		if ( ! Capability::granted() ) {
			wp_die( esc_html__( 'Permission denied.', 'essentials-for-contact-form-7' ), 403 );
		}

		check_admin_referer( self::ACTION );

		// Read as text and resolved by Attachments::path(), which is where `..`
		// and anything else that points out of the folder is refused.
		$folder = isset( $_GET['dir'] ) ? sanitize_text_field( wp_unslash( $_GET['dir'] ) ) : '';
		$file   = isset( $_GET['file'] ) ? sanitize_text_field( wp_unslash( $_GET['file'] ) ) : '';

		$path = Attachments::path( $folder, $file );

		if ( '' === $path ) {
			wp_die( esc_html__( 'That file is no longer available.', 'essentials-for-contact-form-7' ), 404 );
		}

		$name = isset( $_GET['name'] ) ? sanitize_file_name( wp_unslash( $_GET['name'] ) ) : wp_basename( $path );
		if ( '' === $name ) {
			$name = wp_basename( $path );
		}

		// Always an attachment, and always octet-stream: serving an upload with
		// the type it claims is how an .html or .svg someone sent turns into a
		// script running on this site's own origin.
		nocache_headers();
		header( 'Content-Type: application/octet-stream' );
		header( 'Content-Disposition: attachment; filename="' . $name . '"' );
		header( 'Content-Length: ' . (string) filesize( $path ) );
		header( 'X-Content-Type-Options: nosniff' );

		// Straight off disk rather than through file_get_contents(): a large
		// attachment should not have to fit in PHP's memory limit first.
		readfile( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile

		exit;
	}
}
