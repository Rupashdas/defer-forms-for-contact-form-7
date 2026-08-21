<?php
/**
 * REST: Reading, deleting and counting stored submissions.
 *
 * @package CF7_Nova_Lite
 */

declare(strict_types=1);

namespace CF7NL\REST;

use CF7NL\DB\Submissions_Repository;

defined( 'ABSPATH' ) || exit;

final class Submissions_Controller extends Controller {

	/**
	 * What a date filter may look like.
	 *
	 * Not `'format' => 'date-time'`, which is the obvious choice and the wrong
	 * one: that wants RFC 3339, and this plugin's own list screen sends MySQL
	 * datetimes — `2026-08-19 00:00:00`, a space rather than a `T` — because
	 * that is what the `created_at` column holds and what the comparison is
	 * against. Declaring the stricter format would have rejected every request
	 * the Submissions page makes.
	 *
	 * The empty alternation is the "no filter" case, which is the default.
	 *
	 * The ranges are spelled out rather than left as `\d{2}`, so `2026-13-45`
	 * is refused here instead of reaching MySQL and quietly matching nothing.
	 * It is still a shape check, not a calendar — 31 February gets through —
	 * but a comparison against that is merely empty, not wrong.
	 */
	private const DATE_PATTERN = '^$|^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])([ T]([01]\d|2[0-3]):[0-5]\d:[0-5]\d)?$';

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/submissions',
			array(
				'methods'             => 'GET',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_list_submissions' ),

				/*
				 * The constraints are declared here as well as enforced in the
				 * repository, and the repetition is the point.
				 *
				 * The repository is what actually keeps the query safe — every
				 * value is parameterised, `status` is checked against STATUSES,
				 * `sort` goes through a fixed column map and `per_page` is
				 * clamped. None of that was in doubt. But the guarantee lived a
				 * layer away from the declaration, so the route advertised
				 * `date_from` as any string at all, and a caller reading the
				 * schema learned nothing about what it would accept.
				 *
				 * With the constraints here WordPress refuses bad input at the
				 * boundary with a 400 and a message naming the parameter, instead
				 * of a malformed date silently matching no rows and looking like
				 * an empty inbox.
				 */
				'args'                => array(
					'per_page'  => array(
						'type'    => 'integer',
						'default' => 20,
						'minimum' => 1,
						'maximum' => 200,
					),
					'page'      => array(
						'type'    => 'integer',
						'default' => 1,
						'minimum' => 1,
					),
					'search'    => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'status'    => array(
						'type'    => 'string',
						'default' => '',
						// '' is "any status", which is why it is in the list.
						'enum'    => array_merge( array( '' ), Submissions_Repository::STATUSES ),
					),
					'form_id'   => array(
						'type'    => 'integer',
						'default' => 0,
						'minimum' => 0,
					),
					'date_from' => array(
						'type'    => 'string',
						'default' => '',
						'pattern' => self::DATE_PATTERN,
					),
					'date_to'   => array(
						'type'    => 'string',
						'default' => '',
						'pattern' => self::DATE_PATTERN,
					),
					'sort'      => array(
						'type'    => 'string',
						'default' => 'date_desc',
						'enum'    => array( 'date_desc', 'date_asc', 'id_desc', 'id_asc' ),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/submissions/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_delete_submission' ),
				'args'                => array(
					'id' => array( 'type' => 'integer' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/submissions/bulk-delete',
			array(
				'methods'             => 'POST',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_bulk_delete_submissions' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/submissions/mark-read',
			array(
				'methods'             => 'POST',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_mark_read' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/stats',
			array(
				'methods'             => 'GET',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_get_stats' ),
			)
		);
	}

	/**
	 * Mark entries as read.
	 *
	 * `ids` marks those entries; `all: true` marks every unread one. Sending
	 * neither is a request to mark nothing, which is refused rather than quietly
	 * treated as "everything" — a bug in the caller should not empty the badge.
	 */
	public function rest_mark_read( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$params = (array) $request->get_json_params();
		$all    = ! empty( $params['all'] );
		$ids    = array_values( array_filter( array_map( 'intval', (array) ( $params['ids'] ?? array() ) ) ) );

		if ( ! $all && empty( $ids ) ) {
			return self::error( 'nothing_to_mark', __( 'No entries were named to mark as read.', 'cf7-nova-lite' ), 400 );
		}

		$repo   = $this->container->make( 'submissions.repository' );
		$marked = $repo->mark_read( $all ? array() : $ids );

		return new \WP_REST_Response(
			array(
				'marked' => $marked,
				'unread' => $repo->count_unread(),
			),
			200
		);
	}

	public function rest_list_submissions( \WP_REST_Request $request ): \WP_REST_Response {
		$repo = $this->container->make( 'submissions.repository' );
		$args = $this->collect_list_args( $request );

		return new \WP_REST_Response(
			array(
				'items' => $repo->list( $args ),
				'total' => $repo->count( $args ),
			),
			200
		);
	}

	public function rest_delete_submission( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$repo    = $this->container->make( 'submissions.repository' );
		$deleted = $repo->delete( array( (int) $request->get_param( 'id' ) ) );

		if ( 0 === $deleted ) {
			return self::error( 'not_found', __( 'That entry no longer exists.', 'cf7-nova-lite' ), 404 );
		}

		return new \WP_REST_Response( array( 'deleted' => $deleted ), 200 );
	}

	public function rest_bulk_delete_submissions( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$ids = (array) ( $request->get_json_params()['ids'] ?? array() );

		if ( empty( $ids ) ) {
			return self::error( 'no_ids', __( 'No entries were named to delete.', 'cf7-nova-lite' ), 400 );
		}

		$repo    = $this->container->make( 'submissions.repository' );
		$deleted = $repo->delete( self::row_ids( $ids ) );

		return new \WP_REST_Response( array( 'deleted' => $deleted ), 200 );
	}

	/**
	 * Keep only the values that name a row.
	 *
	 * `intval()` is not a filter: intval(array()) is 1, so a nested array in the
	 * payload would delete submission #1 — a row the caller never asked for.
	 *
	 * @param array<int|string, mixed> $ids
	 * @return array<int, int>
	 */
	private static function row_ids( array $ids ): array {
		$clean = array();

		foreach ( $ids as $id ) {
			if ( is_int( $id ) || ( is_string( $id ) && ctype_digit( $id ) ) ) {
				$id = (int) $id;
				if ( $id > 0 ) {
					$clean[] = $id;
				}
			}
		}

		return $clean;
	}

	/**
	 * The dashboard's whole payload, in one request.
	 *
	 * `daily` rides along with the totals rather than getting a route of its own:
	 * the screen has no use for one without the other, and two requests would let
	 * the chart and the figures above it be drawn from two different moments.
	 */
	public function rest_get_stats(): \WP_REST_Response {
		$repo = $this->container->make( 'submissions.repository' );

		return new \WP_REST_Response(
			$repo->stats() + array( 'daily' => $repo->daily( 30 ) ),
			200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function collect_list_args( \WP_REST_Request $request ): array {
		return array(
			'per_page'  => (int) $request->get_param( 'per_page' ),
			'page'      => (int) $request->get_param( 'page' ),
			'search'    => (string) $request->get_param( 'search' ),
			'status'    => (string) $request->get_param( 'status' ),
			'form_id'   => (int) $request->get_param( 'form_id' ),
			'date_from' => (string) $request->get_param( 'date_from' ),
			'date_to'   => (string) $request->get_param( 'date_to' ),
			'sort'      => (string) $request->get_param( 'sort' ),
		);
	}
}
