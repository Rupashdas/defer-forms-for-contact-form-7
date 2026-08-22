<?php
/**
 * Answering an enquiry from the entry itself.
 *
 * The plugin stored the message and the address and then sent you to an email
 * client to copy them out. This closes that.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Reply {

	/**
	 * Who this entry can be answered at, or '' if nobody.
	 *
	 * Found by the shape of the value, not the name of the field. A form asks
	 * for an address under whatever name whoever built it chose — `your-email`,
	 * `email`, `contact_email`, or a word in a language this plugin has never
	 * seen — and a list of names to look for would be a list that is wrong on
	 * somebody's site.
	 *
	 * The first one wins. A form with a confirm-address field has two identical
	 * values, and a form with a "who should we copy" field has two different
	 * ones — in both cases the first is the person who wrote in, because that is
	 * the order the fields were filled in.
	 *
	 * Underscored keys are skipped: they are the plugin's own bookkeeping, and
	 * _cf7nl_files holds filenames rather than answers.
	 *
	 * @param array<string, mixed> $data The submitted fields.
	 */
	public static function address_in( array $data ): string {
		foreach ( $data as $field => $value ) {
			if ( str_starts_with( (string) $field, '_' ) ) {
				continue;
			}

			foreach ( (array) $value as $one ) {
				$one = trim( (string) $one );

				if ( '' !== $one && is_email( $one ) ) {
					return $one;
				}
			}
		}

		return '';
	}

	/**
	 * Send one reply. Returns '' when it went, or why it did not.
	 *
	 * Plain text, not HTML. A reply is a person typing to a person, and the box
	 * it is typed in has no formatting — sending it as HTML would mean deciding
	 * what a blank line means and getting it wrong for somebody.
	 *
	 * @param array<string, mixed> $data The entry, for the address.
	 */
	public static function send( array $data, string $subject, string $message ): string {
		$to = self::address_in( $data );

		if ( '' === $to ) {
			return __( 'This entry has no email address to reply to.', 'cf7-nova-lite' );
		}

		$subject = trim( wp_strip_all_tags( $subject ) );
		$message = trim( wp_strip_all_tags( $message ) );

		if ( '' === $subject || '' === $message ) {
			return __( 'A reply needs a subject and a message.', 'cf7-nova-lite' );
		}

		/*
		 * From the site, replying to the person who is sending it.
		 *
		 * Sending AS the admin would be a forgery: the address is on a domain
		 * the site does not control, so SPF and DKIM fail and the reply lands in
		 * spam — the one place it must not. From the site's own domain with a
		 * Reply-To means an answer comes back to the right person and the mail
		 * is still from who it says it is.
		 */
		$admin = wp_get_current_user();
		$name  = $admin && $admin->display_name ? $admin->display_name : get_bloginfo( 'name' );

		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );

		if ( $admin && is_email( $admin->user_email ) ) {
			$headers[] = sprintf( 'Reply-To: %s <%s>', $name, $admin->user_email );
		}

		$sent = wp_mail( $to, $subject, $message, $headers );

		return $sent ? '' : __( 'WordPress could not send the mail. Check the site&#8217;s email setup.', 'cf7-nova-lite' );
	}
}
