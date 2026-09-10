<?php
/**
 * CSV export of submissions.
 *
 * Written straight to the output stream in batches rather than assembled in
 * memory: a site with a hundred thousand entries would otherwise exhaust PHP's
 * memory limit and hand the admin a blank page.
 *
 * Two passes are needed because a CSV needs its full header before any row, and
 * submissions store their fields as JSON — so the set of columns is only known
 * once every row has been looked at. Both passes stream.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\Admin;

use DEFERFORMS\CF7\Entry_Fields;
use DEFERFORMS\Core\Capability;
use DEFERFORMS\DB\Submissions_Repository;

defined( 'ABSPATH' ) || exit;

final class Csv_Export {

	private Submissions_Repository $repository;

	public function __construct( Submissions_Repository $repository ) {
		$this->repository = $repository;
	}

	public function register_hooks(): void {
		add_action( 'admin_post_deferforms_export_csv', array( $this, 'handle' ) );
	}

	public function handle(): void {
		if ( ! Capability::granted() ) {
			wp_die( esc_html__( 'Permission denied.', 'defer-forms-for-contact-form-7' ), 403 );
		}

		check_admin_referer( 'deferforms_export_csv' );

		$args    = $this->filters();
		$columns = $this->columns( $args );

		/*
		 * Before the headers, so a stream that refuses to open is answered with a
		 * normal admin error page rather than one written into a download that has
		 * already begun.
		 */
		$output = fopen( 'php://output', 'w' );

		if ( false === $output ) {
			wp_die( esc_html__( 'The export could not be started.', 'defer-forms-for-contact-form-7' ), 500 );
		}

		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="deferforms-submissions-' . gmdate( 'Y-m-d' ) . '.csv"' );

		// A long export must not be cut short by the default execution limit.
		// Discouraged in general because most code has no business extending it;
		// an export that streams every row a site has ever received is the case
		// the discouragement is not about. Guarded, because hosts disable it.
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 0 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, Squiz.PHP.DiscouragedFunctions.Discouraged -- see above.
		}

		// Anything WordPress already buffered would otherwise land in the file.
		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}

		/*
		 * php://output, not a file. This is a download being written to the
		 * response as it is generated, so a site with a hundred thousand
		 * submissions never has to hold the whole CSV in memory first.
		 *
		 * WP_Filesystem cannot do this, and the sniff asking for it has the
		 * wrong context: it abstracts *file* access for hosts where PHP cannot
		 * write directly — it puts contents at a path. There is no path here and
		 * no file. The fwrite and fclose below are on that output handle.
		 */

		// Byte-order mark, so Excel opens UTF-8 as UTF-8.
		fwrite( $output, "\xEF\xBB\xBF" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite -- see above; the response, not a file.
		// The four fixed columns are ours to name, so they are named in the
		// reader's language. The rest are the visitor's own field names and stay
		// exactly as the form spelled them. Nothing re-imports this file, so
		// there is no machine on the other side to keep the headings stable for.
		$headings = array(
			__( 'ID', 'defer-forms-for-contact-form-7' ),
			__( 'Form ID', 'defer-forms-for-contact-form-7' ),
			__( 'Status', 'defer-forms-for-contact-form-7' ),
			__( 'Date', 'defer-forms-for-contact-form-7' ),
		);

		fputcsv( $output, array_map( array( $this, 'defuse' ), array_merge( $headings, $columns ) ) );

		$written = 0;
		foreach ( $this->repository->stream( $args ) as $row ) {
			fputcsv( $output, $this->line( $row, $columns ) );

			++$written;

			// Push each batch to the browser instead of growing a buffer.
			if ( 0 === $written % 200 ) {
				flush();
			}
		}

		fclose( $output ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- see above; this is the response, not a file.
		exit;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function filters(): array {
		// Nonce already verified by check_admin_referer() in handle().
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		return array(
			'search'    => isset( $_GET['search'] ) ? sanitize_text_field( wp_unslash( $_GET['search'] ) ) : '',
			'status'    => isset( $_GET['status'] ) ? sanitize_text_field( wp_unslash( $_GET['status'] ) ) : '',
			'form_id'   => isset( $_GET['form_id'] ) ? (int) $_GET['form_id'] : 0,
			'date_from' => isset( $_GET['date_from'] ) ? sanitize_text_field( wp_unslash( $_GET['date_from'] ) ) : '',
			'date_to'   => isset( $_GET['date_to'] ) ? sanitize_text_field( wp_unslash( $_GET['date_to'] ) ) : '',
		);
		// phpcs:enable
	}

	/**
	 * Every field name across the matching submissions, in first-seen order.
	 *
	 * @param array<string, mixed> $args
	 * @return array<int, string>
	 */
	private function columns( array $args ): array {
		$columns = array();

		foreach ( $this->repository->stream( $args ) as $row ) {
			$data = json_decode( (string) $row['data'], true );
			if ( ! is_array( $data ) ) {
				continue;
			}
			foreach ( array_keys( $data ) as $key ) {
				if ( Entry_Fields::is_answer( (string) $key ) ) {
					$columns[ $key ] = true;
				}
			}
		}

		return array_keys( $columns );
	}

	/**
	 * @param array<string, mixed> $row
	 * @param array<int, string>   $columns
	 * @return array<int, string>
	 */
	private function line( array $row, array $columns ): array {
		$data = json_decode( (string) $row['data'], true );
		$data = is_array( $data ) ? $data : array();

		$line = array( $row['id'], $row['form_id'], $row['status'], $row['created_at'] );

		foreach ( $columns as $key ) {
			$value  = $data[ $key ] ?? '';
			$line[] = $this->defuse( is_array( $value ) ? implode( ', ', $value ) : (string) $value );
		}

		return $line;
	}

	/**
	 * Stop a spreadsheet reading a submitted value as a formula.
	 *
	 * Everything in a cell here was typed by a member of the public. Excel,
	 * LibreOffice and Sheets all treat a leading `=`, `+`, `-` or `@` as the start
	 * of an expression, so `=cmd|'/c calc'!A1` in a "Your message" box becomes
	 * code the moment an admin opens the export. A leading tab or carriage return
	 * does the same thing, because the parsers skip over it first.
	 *
	 * A leading apostrophe is the standard defusing: every spreadsheet reads the
	 * rest of the cell as text and none of them display the quote.
	 */
	private function defuse( string $value ): string {
		if ( '' === $value || false === strpos( "=+-@\t\r\n", $value[0] ) ) {
			return $value;
		}

		return "'" . $value;
	}
}
