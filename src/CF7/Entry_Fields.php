<?php
/**
 * Which keys in a stored entry are answers, and which are ours.
 *
 * The rule lived on Csv_Export, which was where it was first needed and the
 * wrong place to keep it: three readers apply it and one of them — the GDPR
 * exporter — has no business reaching into an admin screen's class to ask.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Entry_Fields {

	/**
	 * Is this stored key something a visitor answered, rather than something the
	 * plugin put in the form itself?
	 *
	 * Two prefixes are not answers. `_` covers Contact Form 7's own bookkeeping
	 * and our `_df7_files`; `df7_` covers the honeypot and the time-trap's
	 * signed token.
	 *
	 * Submission_Listener drops the second group before a row is written, so this
	 * looks redundant — and is not. That strip only ever applied to rows written
	 * after it existed, and every install upgraded from an earlier version still
	 * holds rows carrying a signed token. An export is the last place one should
	 * reappear: it leaves the site, and nothing else in the row is a secret.
	 *
	 * A CSV leaves the site to an admin. A personal-data export leaves it to the
	 * member of the public who asked for it, so the rule matters more there, not
	 * less.
	 */
	public static function is_answer( string $key ): bool {
		return 0 !== strpos( $key, '_' ) && 0 !== strpos( $key, 'df7_' );
	}
}
