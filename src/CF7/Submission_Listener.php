<?php
/**
 * Listens for Contact Form 7 submissions and persists them.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

use DF7\DB\Settings_Repository;
use DF7\DB\Submissions_Repository;

defined( 'ABSPATH' ) || exit;

final class Submission_Listener {

	private Submissions_Repository $repository;

	private Settings_Repository $settings;

	public function __construct( Submissions_Repository $repository, Settings_Repository $settings ) {
		$this->repository = $repository;
		$this->settings   = $settings;
	}

	/**
	 * CF7 outcomes worth keeping, mapped to the status we store them under.
	 *
	 * Everything absent is a form that was never completed — a failed validation
	 * or a missing acceptance box — and holds no submission worth a row.
	 */
	private const KEEP = array(
		'mail_sent'   => 'submitted',
		'mail_failed' => 'submitted',
		'aborted'     => 'submitted',
		'spam'        => 'spam',
	);

	public function register_hooks(): void {
		add_action( 'wpcf7_submit', array( $this, 'handle_submission' ), 10, 2 );
	}

	/**
	 * `wpcf7_submit` rather than `wpcf7_before_send_mail`: CF7 stops before the
	 * mail step once a submission is marked spam, so the mail hook never fires
	 * for one — which is why spam was silently dropped instead of stored.
	 *
	 * @param \WPCF7_ContactForm   $contact_form CF7 form instance.
	 * @param array<string, mixed> $result       CF7's outcome for this submission.
	 */
	public function handle_submission( $contact_form, $result = array() ): void {
		$status = self::KEEP[ (string) ( $result['status'] ?? '' ) ] ?? '';

		if ( '' === $status ) {
			return;
		}

		$store = 'spam' !== $status || $this->should_store_spam();

		/**
		 * Whether this submission is stored at all.
		 *
		 * The setting decides first and this has the last word, so a site can
		 * keep a form out of the table entirely -- one that asks for something
		 * there is no reason to hold on to, or one whose entries are kept
		 * somewhere else already. The mail still goes: this is about the row,
		 * not the form.
		 *
		 * @param bool               $store        Whether to store it.
		 * @param \WPCF7_ContactForm $contact_form The form it was posted to.
		 * @param string             $status       Either 'submitted' or 'spam'.
		 */
		if ( ! apply_filters( 'df7_store_submission', $store, $contact_form, $status ) ) {
			return;
		}

		$submission = \WPCF7_Submission::get_instance();

		if ( ! $submission ) {
			return;
		}

		$ip = empty( $this->settings->get_section( 'privacy' )['ip_logging'] )
			? ''
			: (string) $submission->get_meta( 'remote_ip' );

		$data = self::without_our_own_fields( (array) $submission->get_posted_data() );
		$data = self::without_unstorable( $data, $contact_form );

		/**
		 * The entry as it will be stored.
		 *
		 * Runs before the row is written, so what is dropped here is never in
		 * the table -- a field that has to reach somebody by mail but has no
		 * business being kept for years. What is added here is treated as an
		 * answer everywhere afterwards: the entry panel, the CSV, the chat
		 * notifications and the reply all read this one array.
		 *
		 * Keys beginning with an underscore are the plugin's own bookkeeping
		 * and are skipped by the things that display an entry, so a key added
		 * here should not start with one.
		 *
		 * @param array<string, mixed> $data         The submitted fields.
		 * @param \WPCF7_ContactForm   $contact_form The form it was posted to.
		 * @param string               $status       Either 'submitted' or 'spam'.
		 */
		$data = (array) apply_filters( 'df7_submission_data', $data, $contact_form, $status );

		$id = $this->repository->insert( (int) $contact_form->id(), $data, $ip, $status );

		if ( $id > 0 ) {
			// Returned, not just stored: keeping the files is also what turns a
			// file field's value from the hash CF7 uploaded under into the name
			// the visitor chose, and the notifications below print that value.
			$data = $this->keep_attachments( $id, $submission, $data, $this->should_copy_files( $status ) );
		}

		/*
		 * Only real entries reach a phone. Spam is stored so a misfiring check
		 * can be undone, not so a bot can make somebody's pocket buzz.
		 *
		 * After the row exists, because the message links to it — and after the
		 * attachments, so a notification cannot arrive announcing a file the
		 * site has not finished keeping.
		 */
		if ( $id > 0 && 'submitted' === $status ) {
			/*
			 * One description of the entry, four places it can go. The first
			 * three mark up text their own way — Telegram parses HTML, Slack and
			 * Discord each parse their own markdown — so the formatting is
			 * theirs and only the content is shared. The fourth has no reader to
			 * format for and sends the same content as JSON.
			 */
			$entry = new Notification( $id, $contact_form, $data );

			Telegram::notify( $this->settings->get_section( 'telegram' ), $entry );
			Slack::notify( $this->settings->get_section( 'slack' ), $entry );
			Discord::notify( $this->settings->get_section( 'discord' ), $entry );
			Webhook::notify( $this->settings->get_section( 'webhook' ), $entry );

			/**
			 * A fifth place to announce an entry.
			 *
			 * The four above are the ones with a screen to configure them, and
			 * the webhook among them will reach most endpoints already. This is
			 * for the rest: a second destination, a payload of another shape, or
			 * anywhere that needs a header or a signature this plugin does not
			 * send. What it costs is that the address lives in code rather than
			 * in Settings.
			 *
			 * Submitted entries only, like the three above it. Spam is stored so
			 * a misfiring check can be undone, not so a bot can make somebody's
			 * pocket buzz.
			 *
			 * @param Notification $entry The entry, already described.
			 */
			do_action( 'df7_notify', $entry );
		}

		/**
		 * Fires once an entry is stored and complete.
		 *
		 * Last, and after the notifications, for two reasons. The file field
		 * values are the names the visitor chose by this point rather than the
		 * hash Contact Form 7 uploaded under -- keeping the files is what
		 * changes them -- and the row exists, so $id can be linked to.
		 *
		 * The other reason is that this is where somebody else's code runs. A
		 * fatal in a callback here takes the rest of the request with it, and
		 * everything this plugin had to do is already done.
		 *
		 * Spam fires too, with $status saying so: a site forwarding entries
		 * somewhere should be able to decide that for itself.
		 *
		 * @param int                  $id           The stored entry.
		 * @param array<string, mixed> $data         The entry as stored.
		 * @param \WPCF7_ContactForm   $contact_form The form it was posted to.
		 * @param string               $status       Either 'submitted' or 'spam'.
		 */
		if ( $id > 0 ) {
			do_action( 'df7_submission_stored', $id, $data, $contact_form, $status );
		}
	}

	/**
	 * Fields the plugin puts in the form itself, which are not answers.
	 *
	 * `df7_ts` is the time-trap's signed token and `df7_hp` the honeypot.
	 * They were being stored and then shown to the admin as though somebody had
	 * typed them — and a signed token has no business sitting in a table for
	 * years either. CF7 already drops anything starting with an underscore, which
	 * is why its own `_wpcf7*` fields never appear.
	 *
	 * @param array<string, mixed> $data
	 * @return array<string, mixed>
	 */
	private static function without_our_own_fields( array $data ): array {
		foreach ( array_keys( $data ) as $key ) {
			if ( 0 === strpos( (string) $key, 'df7_' ) ) {
				unset( $data[ $key ] );
			}
		}

		return $data;
	}

	/**
	 * Fields Contact Form 7 itself says are not to be kept.
	 *
	 * A quiz answer and a captcha response are checks, not answers — CF7
	 * registers those tags with the `do-not-store` feature and leaves them out
	 * of its own storage for that reason. We were keeping them, so an entry list
	 * showed "1+1=?" answered "2" beside somebody's message, and every quiz
	 * answer a form had ever taken sat in the table.
	 *
	 * Read as a flag rather than as a list of tag names, so a check added by CF7
	 * or by another plugin is honoured the day it appears rather than the day
	 * somebody notices it in the entry list.
	 *
	 * @param array<string, mixed> $data         The posted data so far.
	 * @param \WPCF7_ContactForm   $contact_form The form it was posted to.
	 * @return array<string, mixed>
	 */
	private static function without_unstorable( array $data, $contact_form ): array {
		if ( ! method_exists( $contact_form, 'scan_form_tags' ) ) {
			return $data;
		}

		foreach ( $contact_form->scan_form_tags( array( 'feature' => 'do-not-store' ) ) as $tag ) {
			$name = (string) ( $tag->name ?? '' );

			if ( '' !== $name ) {
				unset( $data[ $name ] );
			}
		}

		return $data;
	}

	/**
	 * Take a copy of the uploads before CF7 deletes them.
	 *
	 * CF7 stores `hash_file( 'sha256', … )` as a file field's value and removes
	 * the file itself when the request ends, so the row alone can never show an
	 * admin what was sent. The hash is replaced with the file names, and where
	 * the copies went is recorded under a key the field list ignores.
	 *
	 * @param object               $submission CF7's submission. Typed loosely on
	 *                                         purpose: `uploaded_files()` is
	 *                                         checked for below rather than
	 *                                         assumed, so nothing here needs the
	 *                                         concrete CF7 class.
	 * @param array<string, mixed> $data       The data already written for this row.
	 * @param array<string, mixed> $data
	 * @return array<string, mixed> The entry as it now reads, with real filenames.
	 */
	private function keep_attachments( int $id, object $submission, array $data, bool $copy ): array {
		if ( ! method_exists( $submission, 'uploaded_files' ) ) {
			return $data;
		}

		$uploaded = (array) $submission->uploaded_files();

		if ( empty( $uploaded ) ) {
			return $data;
		}

		$kept = $copy ? Attachments::store( $id, $uploaded ) : array();

		if ( ! empty( $kept ) ) {
			foreach ( $kept['fields'] as $field => $files ) {
				$data[ $field ] = wp_list_pluck( $files, 'name' );
			}

			$data[ Attachments::DATA_KEY ] = $kept;
		} else {
			/*
			 * Nothing was copied — refused for spam, refused for space, or there
			 * was nowhere to put it. The value CF7 leaves behind is a sha256 of
			 * the file's contents, which tells the person reading the entry
			 * nothing at all, so the names go in regardless of whether the files
			 * did. What was sent is worth knowing even when it was not kept.
			 */
			foreach ( $uploaded as $field => $paths ) {
				$names = array_map( 'wp_basename', array_map( 'strval', (array) $paths ) );

				if ( ! empty( $names ) ) {
					$data[ (string) $field ] = $names;
				}
			}
		}

		$this->repository->update_data( $id, $data );

		return $data;
	}

	/**
	 * Whether this submission's uploads are worth a copy on the disk.
	 *
	 * A form that takes files is a public endpoint that writes to the disk, and
	 * nothing above stops it being used: the spam checks label a submission
	 * rather than refuse it, so a caught bot's attachment was kept exactly as a
	 * real one's was — a megabyte per attempt, for as long as spam is retained.
	 *
	 * Off by default and switchable, because the row itself is kept for a reason
	 * — a misfiring check should not destroy a real enquiry without trace — and a
	 * site that would rather have the file too can say so.
	 */
	private function should_copy_files( string $status ): bool {
		return 'spam' !== $status || ! empty( $this->settings->get_section( 'spam' )['spam_attachments'] );
	}

	/**
	 * Storing spam is what makes a wrongly-flagged enquiry recoverable, but it
	 * also lets a bot write a row per attempt — so it stays switchable.
	 */
	private function should_store_spam(): bool {
		return ! empty( $this->settings->get_section( 'spam' )['store_spam'] );
	}
}
