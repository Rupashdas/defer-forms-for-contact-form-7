<?php
/**
 * Listens for Contact Form 7 submissions and persists them.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

use CF7NL\DB\Settings_Repository;
use CF7NL\DB\Submissions_Repository;

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

		if ( 'spam' === $status && ! $this->should_store_spam() ) {
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

		$id = $this->repository->insert( (int) $contact_form->id(), $data, $ip, $status );

		if ( $id > 0 ) {
			$this->keep_attachments( $id, $submission, $data );
		}
	}

	/**
	 * Fields the plugin puts in the form itself, which are not answers.
	 *
	 * `cf7nl_ts` is the time-trap's signed token and `cf7nl_hp` the honeypot.
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
			if ( 0 === strpos( (string) $key, 'cf7nl_' ) ) {
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
	 */
	private function keep_attachments( int $id, object $submission, array $data ): void {
		if ( ! method_exists( $submission, 'uploaded_files' ) ) {
			return;
		}

		$uploaded = (array) $submission->uploaded_files();

		if ( empty( $uploaded ) ) {
			return;
		}

		$kept = Attachments::store( $id, $uploaded );

		if ( empty( $kept ) ) {
			return;
		}

		foreach ( $kept['fields'] as $field => $files ) {
			$data[ $field ] = wp_list_pluck( $files, 'name' );
		}

		$data[ Attachments::DATA_KEY ] = $kept;

		$this->repository->update_data( $id, $data );
	}

	/**
	 * Storing spam is what makes a wrongly-flagged enquiry recoverable, but it
	 * also lets a bot write a row per attempt — so it stays switchable.
	 */
	private function should_store_spam(): bool {
		return ! empty( $this->settings->get_section( 'spam' )['store_spam'] );
	}
}
