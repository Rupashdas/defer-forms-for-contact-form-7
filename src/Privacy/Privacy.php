<?php
/**
 * GDPR helpers: plug our stored submissions into WordPress's built-in personal
 * data export and erase tools (Tools → Export/Erase Personal Data). Submissions
 * whose stored values contain the requested email address count as that person's
 * data.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\Privacy;

use CF7NL\DB\Submissions_Repository;

defined( 'ABSPATH' ) || exit;

final class Privacy {

	private const PER_PAGE = 100;

	private Submissions_Repository $repository;

	public function __construct( Submissions_Repository $repository ) {
		$this->repository = $repository;
	}

	public function register_hooks(): void {
		add_filter( 'wp_privacy_personal_data_exporters', array( $this, 'register_exporter' ) );
		add_filter( 'wp_privacy_personal_data_erasers', array( $this, 'register_eraser' ) );
	}

	/**
	 * @param array<string, mixed> $exporters
	 * @return array<string, mixed>
	 */
	public function register_exporter( array $exporters ): array {
		$exporters['cf7-nova-lite'] = array(
			'exporter_friendly_name' => __( 'Contact form submissions (Nova)', 'cf7-nova-lite' ),
			'callback'               => array( $this, 'export' ),
		);
		return $exporters;
	}

	/**
	 * @param array<string, mixed> $erasers
	 * @return array<string, mixed>
	 */
	public function register_eraser( array $erasers ): array {
		$erasers['cf7-nova-lite'] = array(
			'eraser_friendly_name' => __( 'Contact form submissions (Nova)', 'cf7-nova-lite' ),
			'callback'             => array( $this, 'erase' ),
		);
		return $erasers;
	}

	/**
	 * @return array{data: array<int, array<string, mixed>>, done: bool}
	 */
	public function export( string $email, int $page = 1 ): array {
		// Nothing is deleted here, so the set is stable and the page number can be
		// honoured by skipping the matches earlier pages already reported.
		[ $rows, $done ] = $this->find( $email, ( max( 1, $page ) - 1 ) * self::PER_PAGE );

		$items = array();

		foreach ( $rows as $row ) {
			$items[] = array(
				'group_id'    => 'cf7nl-submissions',
				'group_label' => __( 'Contact form submissions', 'cf7-nova-lite' ),
				'item_id'     => 'cf7nl-submission-' . (int) $row['id'],
				'data'        => $this->row_fields( $row ),
			);
		}

		return array(
			'data' => $items,
			'done' => $done,
		);
	}

	/**
	 * @return array{items_removed: bool, items_retained: bool, messages: array<int, string>, done: bool}
	 */
	public function erase( string $email, int $page = 1 ): array {
		// The page number is ignored on purpose. Each pass deletes what it found,
		// so the next one starts from the top again — advancing an offset over a
		// set that is shrinking underneath it would step straight past rows.
		[ $rows, $done ] = $this->find( $email, 0 );

		$ids     = array_map( static fn( $row ) => (int) $row['id'], $rows );
		$removed = empty( $ids ) ? 0 : $this->repository->delete( $ids );

		return array(
			'items_removed'  => $removed > 0,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => $done,
		);
	}

	/**
	 * Submissions that really belong to this person, a batch at a time.
	 *
	 * The LIKE the repository runs is only a way of not reading the whole table:
	 * it matches anywhere inside the stored JSON, so on its own it also matches an
	 * address the requested one is merely a prefix of — erasing `bob@x.com` would
	 * take `bob@x.com.au` with it, a different person's entry, permanently. Every
	 * candidate is therefore re-checked against whole addresses here.
	 *
	 * That re-check is why the walk is a keyset stream rather than a page of rows.
	 * A page of a hundred database matches can yield three real ones, and "fewer
	 * than a hundred came back" would then be read as "there is no more to do" —
	 * ending an export, or an erasure, with the rest of the person's data still in
	 * the table.
	 *
	 * @param int $skip How many real matches to step over before collecting.
	 * @return array{0: array<int, array<string, mixed>>, 1: bool} Rows, and whether the walk reached the end.
	 */
	private function find( string $email, int $skip ): array {
		$email = trim( $email );
		if ( '' === $email ) {
			return array( array(), true );
		}

		$rows = array();
		$seen = 0;

		foreach ( $this->repository->stream( array( 'search' => $email ) ) as $row ) {
			if ( ! self::mentions( (string) $row['data'], $email ) ) {
				continue;
			}

			++$seen;
			if ( $seen <= $skip ) {
				continue;
			}

			$rows[] = $row;

			if ( count( $rows ) >= self::PER_PAGE ) {
				// Stopped early, so there may well be more behind this batch.
				return array( $rows, false );
			}
		}

		return array( $rows, true );
	}

	/**
	 * Does this row hold the address itself, rather than one it is a prefix of?
	 */
	private static function mentions( string $json, string $email ): bool {
		$found = array();

		if ( ! preg_match_all( '/[^\s<>"\',;:()\[\]]+@[^\s<>"\',;:()\[\]]+/', $json, $found ) ) {
			return false;
		}

		foreach ( $found[0] as $candidate ) {
			// Addresses are case-insensitive in practice, and a JSON blob can leave
			// trailing punctuation on one.
			if ( 0 === strcasecmp( rtrim( $candidate, '.' ), $email ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @param array<string, mixed> $row
	 * @return array<int, array{name: string, value: string}>
	 */
	private function row_fields( array $row ): array {
		$fields = array();
		$data   = json_decode( (string) $row['data'], true );

		if ( is_array( $data ) ) {
			foreach ( $data as $key => $value ) {
				$fields[] = array(
					'name'  => (string) $key,
					'value' => is_array( $value ) ? implode( ', ', array_map( 'strval', $value ) ) : (string) $value,
				);
			}
		}

		// IP logging is on by default, which makes the address personal data this
		// plugin collects — so an export that leaves it out is not the export the
		// regulation asks for.
		if ( ! empty( $row['ip'] ) ) {
			$fields[] = array(
				'name'  => __( 'IP address', 'cf7-nova-lite' ),
				'value' => (string) $row['ip'],
			);
		}

		$fields[] = array(
			'name'  => __( 'Submitted at', 'cf7-nova-lite' ),
			'value' => (string) $row['created_at'],
		);

		return $fields;
	}
}
