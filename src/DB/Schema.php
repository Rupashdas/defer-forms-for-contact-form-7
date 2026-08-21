<?php
/**
 * Database schema installer and migrator.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\DB;

defined( 'ABSPATH' ) || exit;

final class Schema {

	/**
	 * Table name without the site prefix.
	 *
	 * Public because Submissions_Repository queries the same table and uninstall
	 * drops it; three separate spellings of one name is a typo waiting to be made.
	 */
	public const TABLE = 'cf7nl_submissions';

	private const VERSION_KEY = 'cf7nl_db_version';

	private const LOCK_KEY = 'cf7nl_db_upgrading';

	/** How long a claim on the upgrade lock is believed before it is treated as abandoned. */
	private const LOCK_TIMEOUT = MINUTE_IN_SECONDS;

	/** Fully qualified table name for the current site. */
	public static function table(): string {
		global $wpdb;

		return $wpdb->prefix . self::TABLE;
	}

	/**
	 * Bring the schema up to date on a normal page load.
	 *
	 * WordPress does not re-run the activation hook when a plugin is *updated*,
	 * so activation alone would leave every existing site on the old schema and
	 * the first submission after the update would hit a missing column.
	 *
	 * A plain inequality, not version_compare: whatever is stored, the goal is
	 * always the schema this code expects — that makes a rollback converge too.
	 */
	public static function maybe_upgrade(): void {
		if ( (string) get_option( self::VERSION_KEY, '' ) === (string) CF7NL_DB_VERSION ) {
			return;
		}

		/*
		 * An update lands while traffic is still flowing, so several requests can
		 * reach this at once. Without a lock they all run dbDelta together and
		 * race on the same ALTER TABLE.
		 *
		 * `add_option()` rather than a get-then-set on a transient. Reading a
		 * transient and then writing it is two statements with a gap between
		 * them, and two requests can both pass the read before either writes —
		 * which made the thing that reads like a lock not one. `add_option()`
		 * returns false when the row already exists, so the claim is decided by
		 * MySQL's uniqueness constraint in a single statement, and exactly one
		 * caller can win it.
		 *
		 * Not autoloaded, because it exists for seconds and only under an
		 * upgrade — there is no reason for it to ride along on every page load.
		 */
		if ( ! add_option( self::LOCK_KEY, time(), '', false ) ) {
			/*
			 * Somebody holds it — unless they died holding it. The transient this
			 * replaced expired on its own, so a request that fatalled mid-upgrade
			 * released the lock a minute later; an option does not, and without
			 * this a single crash would block every future upgrade on the site
			 * for ever. The value is the timestamp of the claim, so a lock nobody
			 * could still be using is one that can be taken.
			 */
			$claimed = (int) get_option( self::LOCK_KEY, 0 );

			if ( $claimed > time() - self::LOCK_TIMEOUT ) {
				return;
			}

			update_option( self::LOCK_KEY, time(), false );
		}

		try {
			self::install();
		} finally {
			delete_option( self::LOCK_KEY );
		}
	}

	public static function install(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table   = self::table();
		$charset = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			form_id bigint(20) unsigned NOT NULL,
			status varchar(20) NOT NULL DEFAULT 'submitted',
			data longtext NOT NULL,
			ip varchar(45) DEFAULT NULL,
			created_at datetime NOT NULL,
			read_at datetime DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY form_id (form_id),
			KEY created_at (created_at),
			KEY read_at (read_at)
		) {$charset};";

		dbDelta( $sql );

		update_option( self::VERSION_KEY, CF7NL_DB_VERSION );
	}
}
