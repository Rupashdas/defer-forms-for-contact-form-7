<?php
/**
 * "There are new entries" — the count beside the menu item.
 *
 * Unread is a property of the entry, not of the visit: a row is unread until
 * somebody opens it, exactly like a message in an inbox. An earlier version
 * counted from a per-user "last looked at" timestamp instead, which made the
 * badge work but left the list unreadable — opening the page moved the marker,
 * so by the time the rows were on screen every one of them counted as seen.
 *
 * Read state is shared rather than per-user, the same way WordPress treats a
 * comment as pending or not for everyone. On a site with two admins, one opening
 * an entry settles it for both.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\Admin;

use CF7NL\DB\Submissions_Repository;

defined( 'ABSPATH' ) || exit;

final class Unread {

	/**
	 * Counted once per request: the menu asks, and so does the REST layer.
	 *
	 * @var int|null
	 */
	private static ?int $count = null;

	public static function count(): int {
		if ( null === self::$count ) {
			self::$count = ( new Submissions_Repository() )->count_unread();
		}

		return self::$count;
	}

	/**
	 * The bubble, in WordPress's own markup so it takes core's styling.
	 *
	 * This is what `wp_count_comments()` hangs off "Comments"; using the same
	 * classes means it matches the rest of the menu without a line of CSS, and
	 * keeps matching when an admin colour scheme changes.
	 */
	public static function bubble(): string {
		$count = self::count();

		if ( $count < 1 ) {
			return '';
		}

		return sprintf(
			' <span class="awaiting-mod count-%1$d"><span class="pending-count">%2$s</span></span>',
			$count,
			esc_html( number_format_i18n( $count ) )
		);
	}
}
