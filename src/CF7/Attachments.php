<?php
/**
 * Keeping the files people attach to a form.
 *
 * Contact Form 7 does not keep them. It moves an upload into a temporary
 * directory for the length of the request, attaches it to the mail, and then
 * `WPCF7_Submission::__destruct()` deletes it. What it leaves in the posted data
 * is `hash_file( 'sha256', $path )` — a content hash, which tells an admin
 * nothing and cannot be turned back into a file.
 *
 * So a copy is taken while the file still exists, before CF7 tidies up.
 *
 * Where the copy goes matters. It is under uploads, because that is the only
 * directory a plugin can rely on being writable, and it is defended three ways:
 *
 *  - the directory name carries a random component, so a path cannot be guessed
 *    from a submission id;
 *  - `.htaccess` and a silent `index.php` go in on first use;
 *  - nothing links to it. Files are served by src/Admin/Attachment_Download.php,
 *    which checks a capability and a nonce first.
 *
 * The first two are belt and braces — Nginx ignores .htaccess — but the third
 * holds on any server.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

use CF7E\Core\Filesystem;

defined( 'ABSPATH' ) || exit;

final class Attachments {

	public function register_hooks(): void {
		// The repository says which rows are going; deciding that files went with
		// them is this class's business, not a data-access class's.
		add_action( 'cf7e_submissions_deleted', array( __CLASS__, 'remove_for' ) );
	}

	/** Folder under wp-content/uploads. */
	private const FOLDER = 'cf7e-attachments';

	/** Key the file list travels under, out of the way of the visitor's answers. */
	public const DATA_KEY = '_cf7e_files';

	/** Running total of the bytes under FOLDER, so the ceiling costs no disk read. */
	private const BYTES_KEY = 'cf7e_attachment_bytes';

	/** How much of the disk this may take before it stops taking any more. */
	private const DEFAULT_LIMIT = 1024 * MB_IN_BYTES;

	/**
	 * The ceiling, in bytes. Zero and below mean no ceiling.
	 *
	 * There has to be one. A form that accepts uploads is a public endpoint that
	 * writes to the disk, and nothing upstream of here bounds how often it is
	 * used: the spam checks label a submission, they do not stop it being stored,
	 * and retention is a broom rather than a wall — thirty days of a flood is
	 * still thirty days of a flood. Without a ceiling the worst case is the size
	 * of the disk.
	 *
	 * A gigabyte is a guess at "more than any honest site needs and less than any
	 * host gives you", which is why it is filterable:
	 *
	 *     add_filter( 'cf7e_attachment_limit', fn() => 5 * GB_IN_BYTES );
	 */
	public static function limit(): int {
		return (int) apply_filters( 'cf7e_attachment_limit', self::DEFAULT_LIMIT );
	}

	/**
	 * How many bytes are already down there.
	 *
	 * Kept as a running total rather than measured, because this is read on the
	 * submission path: walking the tree on every upload would hand an attacker a
	 * cheaper way to hurt the site than filling the disk was. Measured only when
	 * the total has never been written — a site upgrading into this feature, or
	 * one whose option was deleted.
	 */
	public static function used(): int {
		$stored = get_option( self::BYTES_KEY, null );

		if ( null === $stored ) {
			$measured = self::measure();
			update_option( self::BYTES_KEY, $measured, false );

			return $measured;
		}

		return max( 0, (int) $stored );
	}

	/**
	 * Move the running total, and never below nothing.
	 *
	 * It drifts: a file removed by hand, a folder lost with the uploads
	 * directory, a delete that half worked. Drift downward is harmless and drift
	 * upward would eventually refuse uploads a site has room for, so
	 * `recount()` puts it right once a day rather than this trying to be exact.
	 */
	private static function remember( int $delta ): void {
		update_option( self::BYTES_KEY, max( 0, self::used() + $delta ), false );
	}

	/**
	 * Put the running total back in step with the disk. Daily, from cron.
	 */
	public static function recount(): void {
		if ( '' === self::root() ) {
			return;
		}

		update_option( self::BYTES_KEY, self::measure(), false );
	}

	/**
	 * Total size of one submission's kept files.
	 *
	 * Reads the sizes recorded when the copies were made rather than asking the
	 * disk again, so removing a submission costs nothing even when its folder is
	 * already gone.
	 *
	 * @param array<string, array<int, array<string, mixed>>> $fields As stored under DATA_KEY.
	 */
	private static function bytes_in( array $fields ): int {
		$bytes = 0;

		foreach ( $fields as $files ) {
			foreach ( (array) $files as $file ) {
				$bytes += (int) ( $file['size'] ?? 0 );
			}
		}

		return $bytes;
	}

	/** Whether uploads are currently being turned away, for the admin notice. */
	public const FULL_KEY = 'cf7e_attachments_full';

	/**
	 * Say that a file was turned away.
	 *
	 * A transient rather than an option: once the site has room again — retention
	 * ran, somebody deleted a year of entries, the filter was raised — the notice
	 * should stop on its own rather than wait to be dismissed.
	 */
	private static function report_full(): void {
		set_transient( self::FULL_KEY, time(), DAY_IN_SECONDS );
	}

	/** Every byte under the attachments root, counted the slow way. */
	private static function measure(): int {
		$root = self::root();

		if ( '' === $root || ! is_dir( $root ) ) {
			return 0;
		}

		$bytes = 0;

		$walk = new \RecursiveIteratorIterator(
			new \RecursiveDirectoryIterator( $root, \FilesystemIterator::SKIP_DOTS ),
			\RecursiveIteratorIterator::LEAVES_ONLY
		);

		foreach ( $walk as $file ) {
			if ( $file->isFile() ) {
				$bytes += (int) $file->getSize();
			}
		}

		return $bytes;
	}

	/**
	 * Absolute path to the attachments root, or '' if uploads is unusable.
	 */
	public static function root(): string {
		$uploads = wp_upload_dir();

		if ( ! empty( $uploads['error'] ) || empty( $uploads['basedir'] ) ) {
			return '';
		}

		return rtrim( (string) $uploads['basedir'], '/\\' ) . '/' . self::FOLDER;
	}

	/**
	 * WP_Filesystem, asked about the one directory this class ever writes in.
	 *
	 * Always the root rather than the per-submission folder: the question
	 * `get_filesystem_method()` answers is about ownership of the tree, and the
	 * folder we are about to write in is one we just created ourselves.
	 */
	private static function files(): ?\WP_Filesystem_Base {
		return Filesystem::get( self::root() );
	}

	/**
	 * Copy this submission's uploads somewhere they will still be tomorrow.
	 *
	 * @param int                               $submission_id Row the files belong to.
	 * @param array<string, array<int, string>> $uploaded    CF7's uploaded_files().
	 * @return array<string, mixed> What to store under DATA_KEY; empty if nothing was kept.
	 */
	public static function store( int $submission_id, array $uploaded ): array {
		if ( $submission_id < 1 || empty( $uploaded ) ) {
			return array();
		}

		$root = self::root();
		if ( '' === $root ) {
			return array();
		}

		/*
		 * Checked before anything is written, and the whole submission is refused
		 * rather than filled to the brim — a ceiling that admits files until the
		 * exact byte would keep a flood alive at a trickle, and half of somebody's
		 * three attachments is not a kept submission either.
		 *
		 * The row is still written and the mail has already gone. What is lost is
		 * the copy, which is the only part that costs disk.
		 */
		$limit = self::limit();

		if ( $limit > 0 && self::used() >= $limit ) {
			self::report_full();

			return array();
		}

		// The random half is what stops a path being guessed from the id alone.
		$folder = $submission_id . '-' . wp_generate_password( 20, false, false );
		$dir    = $root . '/' . $folder;

		if ( ! wp_mkdir_p( $dir ) ) {
			return array();
		}

		self::protect( $root );

		$fields = array();

		foreach ( $uploaded as $field => $paths ) {
			$kept = array();

			foreach ( (array) $paths as $path ) {
				$stored = self::copy_one( (string) $path, $dir );
				if ( null !== $stored ) {
					$kept[] = $stored;
				}
			}

			if ( ! empty( $kept ) ) {
				$fields[ (string) $field ] = $kept;
			}
		}

		if ( empty( $fields ) ) {
			$files = self::files();
			if ( $files ) {
				$files->rmdir( $dir );
			}
			return array();
		}

		self::remember( self::bytes_in( $fields ) );

		return array(
			'dir'    => $folder,
			'fields' => $fields,
		);
	}

	/**
	 * @return array{name: string, file: string, size: int}|null
	 */
	private static function copy_one( string $path, string $dir ): ?array {
		if ( '' === $path || ! is_file( $path ) || ! is_readable( $path ) ) {
			return null;
		}

		// sanitize_file_name() is what WordPress trusts for an upload's name, and
		// it is what keeps a crafted name from walking out of this directory.
		$name = sanitize_file_name( wp_basename( $path ) );
		if ( '' === $name ) {
			return null;
		}

		// A form-tag's `filetypes:` is whatever the site owner typed, so CF7 having
		// accepted the upload does not make it safe to keep. This directory lives
		// under uploads, and the .htaccess above it is read by Apache and ignored
		// by Nginx — so a `.php` accepted by a too-generous form would sit inside
		// the web root, one guessed path away from running. wp_check_filetype() is
		// WordPress's own answer to "may this extension be stored", and it honours
		// whatever `upload_mimes` the site has set.
		$checked = wp_check_filetype( $name );
		if ( empty( $checked['ext'] ) || empty( $checked['type'] ) ) {
			return null;
		}

		$target = $dir . '/' . $name;

		// Two files of the same name in one submission is ordinary — a phone that
		// names every photo image.jpg, for instance. The second one becomes
		// `2-image.jpg`, the third `3-image.jpg`, and the display name the admin
		// sees is unaffected either way.
		$copy_number = 1;
		while ( file_exists( $target ) ) {
			$target = $dir . '/' . (string) ( ++$copy_number ) . '-' . $name;
		}

		// Through WP_Filesystem rather than copy(), so the stored file lands with
		// the permissions the site configured for an uploaded file rather than
		// whatever umask the PHP process happens to run under.
		$files = self::files();

		if ( ! $files || ! $files->copy( $path, $target, false, FS_CHMOD_FILE ) ) {
			return null;
		}

		return array(
			'name' => $name,
			'file' => wp_basename( $target ),
			'size' => (int) filesize( $target ),
		);
	}

	/**
	 * Resolve one stored file, refusing anything that points outside its folder.
	 *
	 * @return string Absolute path, or '' when there is no such file.
	 */
	public static function path( string $folder, string $file ): string {
		$root = self::root();
		if ( '' === $root ) {
			return '';
		}

		// Names are taken apart rather than trusted: `..`, a slash or a null byte
		// in either half is how a download endpoint becomes a file reader.
		$folder = wp_basename( $folder );
		$file   = wp_basename( $file );

		if ( '' === $folder || '' === $file || '.' === $folder || '.' === $file ) {
			return '';
		}

		$path = $root . '/' . $folder . '/' . $file;
		$real = realpath( $path );

		if ( false === $real || ! is_file( $real ) ) {
			return '';
		}

		// realpath() on the root too, so a symlinked uploads dir still compares.
		$root_real = realpath( $root );

		return ( $root_real && 0 === strpos( $real, $root_real . DIRECTORY_SEPARATOR ) ) ? $real : '';
	}

	/**
	 * Delete the files kept for these submissions.
	 *
	 * @param array<int, array<string, mixed>> $rows Rows with a `data` column.
	 */
	public static function remove_for( array $rows ): void {
		$root = self::root();
		if ( '' === $root ) {
			return;
		}

		$freed = 0;

		foreach ( $rows as $row ) {
			$data = json_decode( (string) ( $row['data'] ?? '' ), true );
			$kept = is_array( $data ) ? (array) ( $data[ self::DATA_KEY ] ?? array() ) : array();
			$dir  = (string) ( $kept['dir'] ?? '' );

			if ( '' === $dir ) {
				continue;
			}

			self::rmdir( $root . '/' . wp_basename( $dir ) );

			$freed += self::bytes_in( (array) ( $kept['fields'] ?? array() ) );
		}

		if ( $freed > 0 ) {
			self::remember( -$freed );
		}
	}

	/**
	 * Remove a submission's folder and everything in it.
	 *
	 * This was a glob(), a wp_delete_file() loop and a silenced rmdir(). The
	 * recursive delete WP_Filesystem already has does the same walk, reports
	 * failure instead of swallowing it, and cannot leave a subdirectory behind
	 * the way the one-level loop did.
	 */
	private static function rmdir( string $dir ): void {
		$files = self::files();

		if ( ! $files || ! $files->is_dir( $dir ) ) {
			return;
		}

		$files->delete( $dir, true );
	}

	/**
	 * Write the guards, once.
	 *
	 * Apache reads the .htaccess; Nginx does not, which is why nothing links to
	 * these files and the download endpoint checks a capability.
	 */
	private static function protect( string $root ): void {
		$guards = array(
			$root . '/.htaccess' => "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n",
			$root . '/index.php' => "<?php\n// Silence is golden.\n",
		);

		$guards = array_filter( $guards, static fn( $body, $path ) => ! file_exists( $path ), ARRAY_FILTER_USE_BOTH );

		if ( empty( $guards ) ) {
			return;
		}

		$files = self::files();

		if ( ! $files ) {
			return;
		}

		foreach ( $guards as $path => $body ) {
			$files->put_contents( $path, $body, FS_CHMOD_FILE );
		}
	}
}
