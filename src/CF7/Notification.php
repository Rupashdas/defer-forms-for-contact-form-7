<?php
/**
 * What a submission says, without deciding how it looks.
 *
 * Three destinations want the same four things — which form, when, what was
 * filled in, and where to read it — and each marks them up differently.
 * Telegram parses HTML, Slack and Discord each parse a markdown of their own,
 * and every one of them escapes different characters. So this holds the
 * content and none of the presentation, and each destination formats it.
 *
 * Built once per submission and handed to all three, which also means the time
 * on three notifications about one entry is the same time.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Notification {

	public int $entry_id;

	public string $title;

	public string $when;

	/** @var array<string, string> Field name to value, in the order they were filled in. */
	public array $fields;

	public string $link;

	/**
	 * @param object|null          $contact_form CF7's form object; typed loosely because CF7 may not be loaded.
	 * @param array<string, mixed> $data         The submitted fields.
	 */
	public function __construct( int $entry_id, ?object $contact_form, array $data ) {
		$this->entry_id = $entry_id;

		$title = null !== $contact_form && method_exists( $contact_form, 'title' )
			? (string) $contact_form->title()
			: '';

		// A form nobody named still has to be announced as something.
		$this->title = '' !== $title ? $title : __( 'New submission', 'cf7-nova-lite' );

		$this->when = (string) ( wp_date( 'j M Y, g:i a' ) ?: '' );

		$this->fields = array();

		foreach ( $data as $field => $value ) {
			$field = (string) $field;

			/*
			 * Underscored keys are the plugin's own bookkeeping, not answers.
			 * Keeping the files writes _cf7nl_files into the entry — where the
			 * files were put and under what names — and a notification listing
			 * that as though somebody had typed it is noise at best.
			 *
			 * CF7 already drops its own _wpcf7* fields before we see them; this
			 * covers what we add afterwards, and whatever is added next.
			 */
			if ( str_starts_with( $field, '_' ) ) {
				continue;
			}

			$this->fields[ $field ] = self::flatten( $value );
		}

		$this->link = admin_url( 'admin.php?page=cf7-nova-submissions&entry=' . $entry_id );
	}

	/**
	 * One field's value as a line of text.
	 *
	 * Checkboxes and multi-selects arrive as arrays; anything else is cast,
	 * because a value that is not a string is not a reason to send nothing.
	 *
	 * @param mixed $value
	 */
	private static function flatten( $value ): string {
		if ( is_array( $value ) ) {
			return implode( ', ', array_map( static fn( $one ): string => (string) $one, $value ) );
		}

		return (string) $value;
	}
}
