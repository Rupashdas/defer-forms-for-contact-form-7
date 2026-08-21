<?php
/**
 * Submissions data access.
 *
 * On the `phpcs:ignore WordPress.DB.PreparedSQL` lines below: every one of them
 * is a query whose *values* go through prepare() and whose only interpolation
 * is a table name from $wpdb->prefix or a run of `%d` built by array_fill().
 * PHPCS cannot follow either through a variable, so it reports both as unsafe.
 *
 * The one place that could genuinely be unsafe is `ORDER BY {$column} {$order}`
 * in list(), and order_by() answers it: the column comes out of a fixed map
 * with a default, and the direction is 'ASC' or 'DESC' and nothing else. No
 * caller-supplied string reaches the SQL anywhere in this class.
 *
 * The ignores are per line rather than one for the file on purpose — a query
 * added later gets flagged like any other.
 *
 * DirectDatabaseQuery is the exception, disabled for the file below. It is not
 * a claim about any one query but about all of them: the plugin owns this table,
 * so a direct query is not a shortcut past an API, it is the only way to read
 * it, and the sniff is aimed at code reaching into core's tables. Caching is
 * applied where it pays rather than everywhere — count_unread() keeps a
 * transient and every write throws it away, while a filtered, paginated list is
 * different on almost every request.
 *
 * phpcs:disable WordPress.DB.DirectDatabaseQuery -- see above.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\DB;

defined( 'ABSPATH' ) || exit;

final class Submissions_Repository {

	private string $table;

	public function __construct() {
		$this->table = Schema::table();
	}

	/** The only values the status column may hold; anything else is a bug. */
	public const STATUSES = array( 'submitted', 'spam' );

	/**
	 * Insert a new submission row.
	 *
	 * @param int                  $form_id CF7 form ID.
	 * @param array<string, mixed> $data    Field values keyed by field name.
	 * @param string               $ip      Submitter IP, or '' to store none.
	 * @param string               $status  One of self::STATUSES.
	 * @return int Inserted row ID, or 0 on failure.
	 */
	public function insert( int $form_id, array $data, string $ip = '', string $status = 'submitted' ): int {
		global $wpdb;

		// The filters and stats only understand these two, so an unknown status
		// would create rows that no screen can ever show.
		if ( ! in_array( $status, self::STATUSES, true ) ) {
			$status = 'submitted';
		}

		$ok = $wpdb->insert(
			$this->table,
			array(
				'form_id'    => $form_id,
				'status'     => $status,
				'data'       => wp_json_encode( $data ),
				'ip'         => '' !== $ip ? $ip : null,
				'created_at' => current_time( 'mysql', true ),
			),
			array( '%d', '%s', '%s', '%s', '%s' )
		);

		// A new entry is an unread entry, so the badge is now out of date.
		$this->forget_unread();

		return false === $ok ? 0 : (int) $wpdb->insert_id;
	}

	/**
	 * @param array{per_page?: int, page?: int, search?: string, status?: string, form_id?: int, date_from?: string, date_to?: string, sort?: string} $args
	 * @return array<int, array<string, mixed>>
	 */
	public function list( array $args = array() ): array {
		global $wpdb;

		$per_page = max( 1, min( 200, (int) ( $args['per_page'] ?? 20 ) ) );
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$offset   = ( $page - 1 ) * $per_page;

		[ $where, $params ] = $this->build_where( $args );
		[ $column, $order ] = self::order_by( (string) ( $args['sort'] ?? '' ) );

		$params[] = $per_page;
		$params[] = $offset;

		$sql = "SELECT id, form_id, status, data, ip, created_at, read_at
				FROM {$this->table}
				WHERE {$where}
				ORDER BY {$column} {$order}
				LIMIT %d OFFSET %d";

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Translate the UI's `column_direction` sort key into SQL.
	 *
	 * Both halves come from fixed lists — they are interpolated into the query,
	 * so nothing from the request may reach it. Anything unrecognised falls back
	 * to newest first.
	 *
	 * @return array{0: string, 1: string} Column and direction.
	 */
	private static function order_by( string $sort ): array {
		$columns = array(
			'date' => 'created_at',
			'id'   => 'id',
		);

		$parts     = explode( '_', $sort );
		$column    = $columns[ $parts[0] ?? '' ] ?? 'created_at';
		$direction = ( 'asc' === ( $parts[1] ?? '' ) ) ? 'ASC' : 'DESC';

		return array( $column, $direction );
	}

	/**
	 * Build the shared WHERE clause for list/count/export.
	 *
	 * @param array<string, mixed> $args
	 * @return array{0: string, 1: array<int, mixed>}
	 */
	private function build_where( array $args ): array {
		global $wpdb;

		$where  = '1=1';
		$params = array();

		$search = trim( (string) ( $args['search'] ?? '' ) );
		if ( '' !== $search ) {
			$where   .= ' AND data LIKE %s';
			$params[] = '%' . $wpdb->esc_like( $search ) . '%';
		}

		$status = (string) ( $args['status'] ?? '' );
		if ( in_array( $status, self::STATUSES, true ) ) {
			$where   .= ' AND status = %s';
			$params[] = $status;
		}

		$form_id = (int) ( $args['form_id'] ?? 0 );
		if ( $form_id > 0 ) {
			$where   .= ' AND form_id = %d';
			$params[] = $form_id;
		}

		$date_from = (string) ( $args['date_from'] ?? '' );
		if ( '' !== $date_from ) {
			$where   .= ' AND created_at >= %s';
			$params[] = $date_from;
		}

		$date_to = (string) ( $args['date_to'] ?? '' );
		if ( '' !== $date_to ) {
			$where   .= ' AND created_at <= %s';
			$params[] = $date_to;
		}

		// Keyset pagination for stream(): walking by id beats OFFSET, which makes
		// the database count past every earlier row on each page.
		$after_id = (int) ( $args['after_id'] ?? 0 );
		if ( $after_id > 0 ) {
			$where   .= ' AND id > %d';
			$params[] = $after_id;
		}

		return array( $where, $params );
	}

	/**
	 * Walk every matching submission a batch at a time.
	 *
	 * Building one array of every row is fine for a few hundred and fatal for a
	 * few hundred thousand. This holds one batch in memory at a time, so an
	 * export costs the same whatever the table size.
	 *
	 * Ordered by id, and each batch continues after the last id rather than
	 * using OFFSET — so rows can neither repeat nor be skipped even if
	 * submissions arrive mid-export.
	 *
	 * @param array<string, mixed> $args Same filters as list().
	 * @return \Generator<int, array<string, mixed>>
	 */
	public function stream( array $args = array(), int $batch = 200 ): \Generator {
		$batch    = max( 1, min( 200, $batch ) );
		$after_id = 0;

		do {
			$rows = $this->list(
				array_merge(
					$args,
					array(
						'sort'     => 'id_asc',
						'per_page' => $batch,
						'page'     => 1,
						'after_id' => $after_id,
					)
				)
			);

			foreach ( $rows as $row ) {
				$after_id = (int) $row['id'];
				yield $row;
			}

			$fetched = count( $rows );
		} while ( $fetched === $batch );
	}

	/**
	 * Delete submissions by ID.
	 *
	 * @param int[] $ids Row IDs to delete.
	 * @return int Number of rows deleted.
	 */
	public function delete( array $ids ): int {
		global $wpdb;

		$ids = array_filter( array_map( 'intval', $ids ) );
		if ( empty( $ids ) ) {
			return 0;
		}

		$placeholders = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );

		// Read the rows before they go: the attachment folder is named inside
		// their data, and once the row is deleted nothing knows where it was.
		$this->announce_deletion( "SELECT data FROM {$this->table} WHERE id IN ({$placeholders})", $ids );

		$deleted = $wpdb->query(
			$wpdb->prepare( "DELETE FROM {$this->table} WHERE id IN ({$placeholders})", $ids ) // phpcs:ignore WordPress.DB.PreparedSQL, WordPress.DB.PreparedSQLPlaceholders, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock; the `%d`s arrive inside $placeholders.
		);

		// Some of what went may have been unread.
		$this->forget_unread();

		return false === $deleted ? 0 : (int) $deleted;
	}

	/**
	 * Announce the rows a delete is about to remove, while they can still be read.
	 *
	 * This used to reach into Attachments and unlink files itself — a data-access
	 * class that knew where uploads live. What it actually needs to say is "these
	 * rows are going", and let whoever kept something alongside them clean up.
	 * src/CF7/Attachments.php listens; so may anything else.
	 *
	 * @param string            $sql    A SELECT of the `data` column.
	 * @param array<int, mixed> $params Placeholders for it.
	 */
	private function announce_deletion( string $sql, array $params ): void {
		global $wpdb;

		// phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
		$rows = empty( $params )
			? $wpdb->get_results( $sql, ARRAY_A ) // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
			: $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.

		if ( is_array( $rows ) && ! empty( $rows ) ) {
			/**
			 * Fires before submissions are removed, with the rows still intact.
			 *
			 * @param array<int, array<string, mixed>> $rows Rows about to be deleted.
			 */
			do_action( 'cf7nl_submissions_deleted', $rows );
		}
	}

	/** Transient holding the unread count; see count_unread(). */
	private const UNREAD_CACHE = 'cf7nl_unread_count';

	/**
	 * Throw away the cached unread count.
	 *
	 * Called by everything that can change it. Deleting rather than recomputing:
	 * the next reader pays for it, and most writes here are submissions arriving
	 * on the front end, where nobody is waiting to see a badge.
	 */
	private function forget_unread(): void {
		delete_transient( self::UNREAD_CACHE );
	}

	/**
	 * Replace a row's stored data.
	 *
	 * Used once, right after an insert, when the attachments have been copied
	 * and the file names are known — the row has to exist before its files can
	 * be filed under its id.
	 *
	 * @param array<string, mixed> $data
	 */
	public function update_data( int $id, array $data ): bool {
		global $wpdb;

		return false !== $wpdb->update(
			$this->table,
			array( 'data' => wp_json_encode( $data ) ),
			array( 'id' => $id ),
			array( '%s' ),
			array( '%d' )
		);
	}

	/**
	 * Delete submissions older than the given number of days.
	 *
	 * @param int    $days   Age in days; anything under 1 disables the cleanup.
	 * @param string $status Limit to one status, or '' for every submission.
	 * @return int Number of rows deleted.
	 */
	public function delete_older_than( int $days, string $status = '' ): int {
		global $wpdb;

		if ( $days < 1 ) {
			return 0;
		}

		$where  = 'created_at < DATE_SUB( UTC_TIMESTAMP(), INTERVAL %d DAY )';
		$params = array( $days );

		if ( in_array( $status, self::STATUSES, true ) ) {
			$where   .= ' AND status = %s';
			$params[] = $status;
		}

		// Retention has to take the files with it, or a site that keeps nothing
		// for 30 days still keeps every attachment forever.
		$this->announce_deletion( "SELECT data FROM {$this->table} WHERE {$where}", $params );

		$deleted = $wpdb->query( $wpdb->prepare( "DELETE FROM {$this->table} WHERE {$where}", $params ) ); // phpcs:ignore WordPress.DB.PreparedSQL, WordPress.DB.PreparedSQLPlaceholders, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock; the placeholders arrive inside $where.

		$this->forget_unread();

		return false === $deleted ? 0 : (int) $deleted;
	}

	/**
	 * @return array{total: int, submitted: int, today: int, week: int, spam: int, unread: int}
	 */
	/**
	 * How many entries arrived on each of the last N days.
	 *
	 * Spam is left out. It is caught rather than received, and a day the filter
	 * did its job would otherwise read as a busy one.
	 *
	 * The window is dated through local_day_start(), the same as stats(), and
	 * that is not tidiness: the two are drawn on one screen, the chart's last
	 * bar directly under the "Today" figure. Dated any other way they disagree
	 * on a site that is not on UTC, and a reader has no way to tell which is
	 * lying.
	 *
	 * @return array<int, array{date: string, count: int}>
	 */
	public function daily( int $days = 30 ): array {
		global $wpdb;

		$days  = max( 1, $days );
		$since = self::local_day_start( $days - 1 );

		// Grouped in the site's own zone, not the column's. created_at is UTC, so
		// grouping it raw puts the small hours of a UTC+6 morning on the day
		// before — the same fault stats() carries a comment about.
		//
		// Shifted by adding seconds rather than with CONVERT_TZ, which answers
		// NULL unless the server has MySQL's timezone tables loaded — common
		// enough on shared hosting, and it fails in the worst possible way here:
		// every day would come back empty and the chart would read as a site
		// with no submissions, directly under a "Today" figure saying otherwise.
		// Interval arithmetic needs nothing loaded.
		$offset = (int) ( (float) get_option( 'gmt_offset' ) * HOUR_IN_SECONDS );

		$sql = "SELECT DATE( created_at + INTERVAL %d SECOND ) AS day, COUNT(*) AS hits
				FROM {$this->table}
				WHERE created_at >= %s AND status = 'submitted'
				GROUP BY day";

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $offset, $since ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.

		$counts = array();
		foreach ( (array) $rows as $row ) {
			$counts[ (string) ( $row['day'] ?? '' ) ] = (int) ( $row['hits'] ?? 0 );
		}

		return self::series( $counts, $days, current_time( 'Y-m-d' ) );
	}

	/**
	 * A run of days, gaps included.
	 *
	 * A GROUP BY only answers for days that have rows, so a quiet month comes
	 * back as four entries. Drawn straight, that is four evenly spaced bars —
	 * "something every week" rather than "almost nothing". The empty days are
	 * the shape, so they are put back.
	 *
	 * `$today` is a parameter rather than a call to the clock: it is what makes
	 * the boundaries checkable, and daily() is the one place that has to decide
	 * which day "today" is anyway.
	 *
	 * @param array<string, int|string> $counts Rows the query found, keyed Y-m-d.
	 * @param int                       $days   How many days the window holds.
	 * @param string                    $today  The last day in it, as Y-m-d.
	 * @return array<int, array{date: string, count: int}>
	 */
	public static function series( array $counts, int $days, string $today ): array {
		$days = max( 1, $days );
		$out  = array();

		for ( $back = $days - 1; $back >= 0; $back-- ) {
			$date = gmdate( 'Y-m-d', (int) strtotime( $today . ' -' . $back . ' days' ) );

			$out[] = array(
				'date'  => $date,
				'count' => (int) ( $counts[ $date ] ?? 0 ),
			);
		}

		return $out;
	}

	/**
	 * @return array<string, int>
	 */
	public function stats(): array {
		global $wpdb;

		// "Today" has to mean today where the site is, not where UTC is. Rows are
		// stored in UTC and the admin screen prints them in the reader's own zone,
		// so a bare UTC_DATE() put the boundary in the wrong place: on a UTC+6
		// site every entry from the first six hours of the morning showed today's
		// date in the table and was missing from the count above it.
		$today = self::local_day_start();
		$week  = self::local_day_start( 7 );

		// One pass with conditional counts: five separate COUNT(*) queries all
		// scanned the same table.
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*) AS total,
					SUM( status = 'submitted' ) AS submitted,
					SUM( status = 'spam' ) AS spam,
					SUM( created_at >= %s ) AS today,
					SUM( created_at >= %s ) AS week,
					SUM( read_at IS NULL AND status = 'submitted' ) AS unread
				FROM {$this->table}", // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
				$today,
				$week
			),
			ARRAY_A
		);

		return array(
			'total'     => (int) ( $row['total'] ?? 0 ),
			'submitted' => (int) ( $row['submitted'] ?? 0 ),
			'today'     => (int) ( $row['today'] ?? 0 ),
			'week'      => (int) ( $row['week'] ?? 0 ),
			'spam'      => (int) ( $row['spam'] ?? 0 ),
			'unread'    => (int) ( $row['unread'] ?? 0 ),
		);
	}

	/**
	 * Midnight at the start of a site-local day, expressed in UTC.
	 *
	 * The column is UTC, so the comparison has to be too — but the boundary the
	 * reader means is their own midnight, which is a different instant.
	 *
	 * @param int $days_ago 0 for today, 7 for a week back.
	 */
	private static function local_day_start( int $days_ago = 0 ): string {
		$midnight = gmdate( 'Y-m-d 00:00:00', strtotime( current_time( 'Y-m-d' ) . ' -' . max( 0, $days_ago ) . ' days' ) );

		return get_gmt_from_date( $midnight );
	}

	/**
	 * Every published CF7 form, with submission count and last submission date.
	 * Unlike forms_with_counts(), this includes forms with zero submissions.
	 *
	 * @return array<int, array{form_id: int, title: string, count: int, last_at: ?string}>
	 */
	public function all_forms(): array {
		global $wpdb;

		$sql = "SELECT p.ID AS form_id, p.post_title, COUNT( s.id ) AS submission_count, MAX( s.created_at ) AS last_at
				FROM {$wpdb->posts} p
				LEFT JOIN {$this->table} s ON s.form_id = p.ID
				WHERE p.post_type = 'wpcf7_contact_form' AND p.post_status = 'publish'
				GROUP BY p.ID, p.post_title
				ORDER BY submission_count DESC, p.post_title ASC";

		$rows = $wpdb->get_results( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
		if ( ! is_array( $rows ) ) {
			return array();
		}

		return array_map(
			static function ( array $row ): array {
				return array(
					'form_id' => (int) $row['form_id'],
					'title'   => (string) ( $row['post_title'] ?? '' ),
					'count'   => (int) $row['submission_count'],
					'last_at' => $row['last_at'] ?? null,
				);
			},
			$rows
		);
	}

	/**
	 * Forms that have at least one submission, with submission count and title.
	 *
	 * @return array<int, array{form_id: int, title: string, count: int}>
	 */
	public function forms_with_counts(): array {
		global $wpdb;

		$sql = "SELECT s.form_id, COUNT(*) AS submission_count, p.post_title
				FROM {$this->table} s
				LEFT JOIN {$wpdb->posts} p
					ON p.ID = s.form_id AND p.post_type = 'wpcf7_contact_form'
				GROUP BY s.form_id, p.post_title
				ORDER BY submission_count DESC";

		$rows = $wpdb->get_results( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
		if ( ! is_array( $rows ) ) {
			return array();
		}

		return array_map(
			static function ( array $row ): array {
				$id    = (int) $row['form_id'];
				$title = (string) ( $row['post_title'] ?? '' );
				return array(
					'form_id' => $id,
					'title'   => '' !== $title ? $title : sprintf( '#%d (deleted)', $id ),
					'count'   => (int) $row['submission_count'],
				);
			},
			$rows
		);
	}

	/**
	 * Entries nobody has opened yet.
	 *
	 * Spam is left out on purpose: an admin should not be pinged by what the
	 * spam checks already caught for them.
	 */
	public function count_unread(): int {
		global $wpdb;

		// Cached because the menu bubble asks on *every* admin page load, and the
		// answer is a COUNT over the whole table. On a site with a few hundred
		// thousand entries that is an index scan standing between an admin and
		// every screen in wp-admin, to draw a number that rarely moves.
		//
		// A day is only the ceiling: every insert, delete and mark-read throws it
		// away, so what a reader sees is current, not up to a day old.
		$cached = get_transient( self::UNREAD_CACHE );

		if ( false !== $cached ) {
			return (int) $cached;
		}

		$count = (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$this->table} WHERE read_at IS NULL AND status = 'submitted'" // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
		);

		set_transient( self::UNREAD_CACHE, $count, DAY_IN_SECONDS );

		return $count;
	}

	/**
	 * Mark entries as read.
	 *
	 * Only rows that are still unread are touched, so re-opening an entry does
	 * not keep moving the moment it was first read.
	 *
	 * @param int[] $ids Row IDs, or an empty array for every unread entry.
	 * @return int Number of rows marked.
	 */
	public function mark_read( array $ids = array() ): int {
		global $wpdb;

		$now = current_time( 'mysql', true );

		// Whichever branch runs, the badge has moved.
		$this->forget_unread();

		// "Everything" means the same set count_unread() counted, spam excluded.
		// Without the status filter this marked every unread row, so a button
		// reading "Mark 2 read" silently settled seventeen — the number the admin
		// was shown had nothing to do with what happened. Naming ids explicitly is
		// left alone: opening one spam entry should still mark that entry.
		if ( empty( $ids ) ) {
			$done = $wpdb->query(
				$wpdb->prepare( "UPDATE {$this->table} SET read_at = %s WHERE read_at IS NULL AND status = 'submitted'", $now ) // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
			);

			return false === $done ? 0 : (int) $done;
		}

		$ids = array_values( array_filter( array_map( 'intval', $ids ) ) );
		if ( empty( $ids ) ) {
			return 0;
		}

		$placeholders = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );
		$done         = $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$this->table} SET read_at = %s WHERE read_at IS NULL AND id IN ({$placeholders})", // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
				array_merge( array( $now ), $ids )
			)
		);

		return false === $done ? 0 : (int) $done;
	}

	/**
	 * @param array<string, mixed> $args Filters, as taken by build_where().
	 */
	public function count( array $args = array() ): int {
		global $wpdb;

		[ $where, $params ] = $this->build_where( $args );

		$sql = "SELECT COUNT(*) FROM {$this->table} WHERE {$where}";

		if ( empty( $params ) ) {
			return (int) $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
		}

		return (int) $wpdb->get_var( $wpdb->prepare( $sql, $params ) ); // phpcs:ignore WordPress.DB.PreparedSQL, PluginCheck.Security.DirectDB.UnescapedDBParameter -- see the class docblock.
	}
}
