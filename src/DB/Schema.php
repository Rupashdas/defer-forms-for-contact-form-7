<?php
/**
 * Database schema installer and migrator.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\DB;

defined( 'ABSPATH' ) || exit;

final class Schema {

	/**
	 * Table name without the site prefix.
	 *
	 * Public because Submissions_Repository queries the same table and uninstall
	 * drops it; three separate spellings of one name is a typo waiting to be made.
	 */
	public const TABLE = 'deferforms_submissions';

	private const VERSION_KEY = 'deferforms_db_version';

	private const LOCK_KEY = 'deferforms_db_upgrading';

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
		if ( (string) get_option( self::VERSION_KEY, '' ) === (string) DEFERFORMS_DB_VERSION ) {
			return;
		}

		/*
		 * An update lands while traffic is still flowing, so several requests can
		 * reach this at once. Without a lock they all run dbDelta together and
		 * race on the same ALTER TABLE.
		 *
		 * Not autoloaded, because it exists for seconds and only under an
		 * upgrade — there is no reason for it to ride along on every page load.
		 */
		if ( ! self::claim_lock() ) {
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

			/*
			 * Abandoned mid-upgrade. Released and re-claimed through the same
			 * single-statement insert, so requests that all saw the same stale
			 * lock are still settled one winner at a time.
			 */
			delete_option( self::LOCK_KEY );

			if ( ! self::claim_lock() ) {
				return;
			}
		}

		try {
			self::install();
		} finally {
			delete_option( self::LOCK_KEY );
		}
	}

	/**
	 * Take the upgrade lock, or say who won.
	 *
	 * A direct INSERT IGNORE, not add_option(): modern WordPress spells that
	 * INSERT … ON DUPLICATE KEY UPDATE, so when two requests race past its
	 * existence pre-check, the loser's insert succeeds as an update and both
	 * believe they hold the lock. INSERT IGNORE has no such second act — the
	 * duplicate is swallowed, zero rows are affected, and the unique key on
	 * option_name settles the claim in one statement.
	 *
	 * Impure, and it has to be said out loud: it takes no arguments and returns
	 * a bool, so static analysis reads a second call as certain to answer what
	 * the first one did. The answer is a row in the database, and the whole
	 * point of the retry above is that it can have changed.
	 *
	 * @phpstan-impure
	 *
	 * @return bool True when this request now holds the lock.
	 */
	private static function claim_lock(): bool {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- being one statement is the whole point; see above.
		$inserted = $wpdb->query(
			$wpdb->prepare(
				'INSERT IGNORE INTO ' . $wpdb->options . ' (option_name, option_value, autoload) VALUES (%s, %s, %s)',
				self::LOCK_KEY,
				(string) time(),
				'off'
			)
		);

		/*
		 * Written behind add_option()'s back, so the caches it maintains are
		 * cleared by hand. On both outcomes, not just the winning one: it is the
		 * loser that reads this row next, and a `notoptions` entry naming the key
		 * would answer that read with "no lock" while the winner is holding it —
		 * whereupon the loser would call the lock abandoned, delete it, and both
		 * would upgrade at once.
		 */
		wp_cache_delete( self::LOCK_KEY, 'options' );
		wp_cache_delete( 'notoptions', 'options' );

		return 1 === (int) $inserted;
	}

	public static function install(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table   = self::table();
		$charset = $wpdb->get_charset_collate();

		/*
		 * `stage` is how far you have got with an entry, which is not what the
		 * entry is. `status` says submitted or spam — a fact about the message.
		 * `stage` says new, replied or done — a fact about you. An entry can be
		 * submitted AND done; spam is never either, which is why one column
		 * could not carry both.
		 *
		 * Empty rather than 'new', so an entry nobody has touched says so at no
		 * cost and every row that already existed is correct without being
		 * rewritten.
		 *
		 * Its index pairs with created_at because that is how the list asks:
		 * these ones, newest first. Added with the column, since an index added
		 * later is a second migration.
		 *
		 * Nothing in here may carry a comment. dbDelta reads this statement line
		 * by line to work out what the table should look like, and MySQL does not
		 * take // at all.
		 */
		$sql = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			form_id bigint(20) unsigned NOT NULL,
			status varchar(20) NOT NULL DEFAULT 'submitted',
			data longtext NOT NULL,
			ip varchar(45) DEFAULT NULL,
			created_at datetime NOT NULL,
			read_at datetime DEFAULT NULL,
			stage varchar(20) NOT NULL DEFAULT '',
			PRIMARY KEY  (id),
			KEY form_id (form_id),
			KEY created_at (created_at),
			KEY read_at (read_at),
			KEY form_created (form_id,created_at),
			KEY status_created (status,created_at),
			KEY stage_created (stage,created_at)
		) {$charset};";

		dbDelta( $sql );

		update_option( self::VERSION_KEY, DEFERFORMS_DB_VERSION );
	}
}
