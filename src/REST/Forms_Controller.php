<?php
/**
 * REST: Listing CF7 forms and loading or saving one in the builder.
 *
 * @package CF7_Nova_Lite
 */

declare(strict_types=1);

namespace CF7NL\REST;

use CF7NL\CF7\Form_Html;
use CF7NL\CF7\Form_Tag_Parser;
use CF7NL\CF7\Redirect;
use CF7NL\CF7\Revisions;
use CF7NL\CF7\Steps;

defined( 'ABSPATH' ) || exit;

final class Forms_Controller extends Controller {

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/forms',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => self::can_manage(),
					'callback'            => array( $this, 'rest_list_forms' ),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => self::can_manage(),
					'callback'            => array( $this, 'rest_create_form' ),
					'args'                => array(
						'title' => array(
							'type'              => 'string',
							'required'          => true,
							'sanitize_callback' => 'sanitize_text_field',
						),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/forms/overview',
			array(
				'methods'             => 'GET',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_forms_overview' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/forms/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_delete_form' ),
				'args'                => array(
					'id' => array( 'type' => 'integer' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/forms/(?P<id>\d+)/builder',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => self::can_manage(),
					'callback'            => array( $this, 'rest_get_form_builder' ),
				),
				array(
					'methods'             => 'PUT',
					'permission_callback' => self::can_manage(),
					'callback'            => array( $this, 'rest_save_form_builder' ),
				),
				'args' => array(
					'id' => array( 'type' => 'integer' ),
				),
			)
		);

		/*
		 * Two routes rather than one. The list runs every time the History modal
		 * opens and returns only `rev` and `time`, so it reads ten meta rows and
		 * parses nothing; the payload is fetched for the one revision actually
		 * chosen. Returning all ten payloads at once would work — perhaps 100 KB
		 * — but it would parse ten templates to draw a screen on which nine of
		 * them are never opened.
		 */
		register_rest_route(
			self::NAMESPACE,
			'/forms/(?P<id>\d+)/revisions',
			array(
				'methods'             => 'GET',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_list_revisions' ),
				'args'                => array(
					'id' => array( 'type' => 'integer' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/forms/(?P<id>\d+)/revisions/(?P<rev>\d+)',
			array(
				'methods'             => 'GET',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_get_revision' ),
				'args'                => array(
					'id'  => array( 'type' => 'integer' ),
					'rev' => array( 'type' => 'integer' ),
				),
			)
		);
	}

	public function rest_list_forms(): \WP_REST_Response {
		$repo = $this->container->make( 'submissions.repository' );
		return new \WP_REST_Response( $repo->forms_with_counts(), 200 );
	}

	public function rest_forms_overview(): \WP_REST_Response {
		$repo  = $this->container->make( 'submissions.repository' );
		$forms = $repo->all_forms();

		// Ask CF7 for the shortcode rather than composing one — it owns the hash
		// format and lets other plugins filter the result.
		if ( class_exists( 'WPCF7_ContactForm' ) && ! empty( $forms ) ) {
			// get_instance() reads the post and its _hash meta, which without
			// this would be two queries per form. Priming fills both caches for
			// the whole page in two queries total.
			_prime_post_caches( array_map( static fn( $form ) => (int) $form['form_id'], $forms ), false, true );

			foreach ( $forms as &$form ) {
				$cf7               = \WPCF7_ContactForm::get_instance( (int) $form['form_id'] );
				$form['shortcode'] = $cf7 ? $cf7->shortcode() : '';

				if ( ! $cf7 ) {
					continue;
				}

				// The submit button is a form tag like any other, and counting it
				// would report every form as one field bigger than it is.
				$tags = array_filter(
					$cf7->scan_form_tags(),
					static fn( $tag ) => 'submit' !== $tag->basetype
				);

				$form['fields']   = count( $tags );
				$form['required'] = count( array_filter( $tags, static fn( $tag ) => $tag->is_required() ) );
			}
			unset( $form );
		}

		return new \WP_REST_Response( $forms, 200 );
	}

	/**
	 * Create a blank form and hand back where to edit it.
	 *
	 * `wpcf7_save_contact_form()` with id -1 is the same call Contact Form 7's
	 * own New Form screen makes: it starts from CF7's default template, runs
	 * CF7's sanitisers over every property and saves. Building the post here
	 * instead would be a second copy of that, drifting the day CF7 changes what
	 * a new form starts with.
	 */
	public function rest_create_form( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! function_exists( 'wpcf7_save_contact_form' ) ) {
			return self::error( 'cf7_missing', __( 'Contact Form 7 is not active.', 'cf7-nova-lite' ), 400 );
		}

		// The route is admin-only already; this is CF7's own gate on writing a
		// contact form, and a site that has narrowed it should still be obeyed.
		if ( ! current_user_can( 'wpcf7_edit_contact_forms' ) ) {
			return self::error( 'forbidden', __( 'You do not have permission to create forms.', 'cf7-nova-lite' ), 403 );
		}

		$title = trim( (string) $request->get_param( 'title' ) );

		if ( '' === $title ) {
			return self::error( 'title_required', __( 'Give the form a name.', 'cf7-nova-lite' ), 400 );
		}

		// Long enough to be a mistake rather than a name, and post_title is not
		// the place to find out.
		if ( mb_strlen( $title ) > 200 ) {
			return self::error( 'title_too_long', __( 'That name is too long.', 'cf7-nova-lite' ), 400 );
		}

		$contact_form = wpcf7_save_contact_form(
			array(
				'id'    => -1,
				'title' => $title,
			)
		);

		if ( ! $contact_form || ! $contact_form->id() ) {
			return self::error( 'save_failed', __( 'The form could not be saved. Please try again.', 'cf7-nova-lite' ), 500 );
		}

		$id = (int) $contact_form->id();

		return new \WP_REST_Response(
			array(
				'form_id'     => $id,
				'title'       => $contact_form->title(),
				'builder_url' => admin_url( 'admin.php?page=cf7-nova-builder&form=' . $id ),
			),
			201
		);
	}

	/**
	 * Delete a form.
	 *
	 * The entries it collected are left alone. They are a record of something
	 * that actually happened, they are still exportable, and the submissions
	 * list has always labelled entries whose form is gone as "#N (deleted)" —
	 * so nothing here has to invent a behaviour for them.
	 *
	 * CF7's own `delete()` is what runs, for the same reason the create route
	 * goes through CF7: it knows what deleting one of its posts entails.
	 */
	public function rest_delete_form( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			return self::error( 'cf7_missing', __( 'Contact Form 7 is not active.', 'cf7-nova-lite' ), 400 );
		}

		$id   = (int) $request->get_param( 'id' );
		$form = \WPCF7_ContactForm::get_instance( $id );

		if ( ! $form ) {
			return self::error( 'not_found', __( 'That form no longer exists.', 'cf7-nova-lite' ), 404 );
		}

		// CF7's own gate, per form, which a site may have narrowed.
		if ( ! current_user_can( 'wpcf7_delete_contact_form', $id ) ) {
			return self::error( 'forbidden', __( 'You do not have permission to delete this form.', 'cf7-nova-lite' ), 403 );
		}

		if ( ! $form->delete() ) {
			return self::error( 'delete_failed', __( 'The form could not be deleted. Please try again.', 'cf7-nova-lite' ), 500 );
		}

		return new \WP_REST_Response(
			array(
				'deleted' => true,
				'form_id' => $id,
			),
			200
		);
	}

	public function rest_get_form_builder( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			return self::error( 'cf7_missing', __( 'Contact Form 7 is not active.', 'cf7-nova-lite' ), 400 );
		}

		$id   = (int) $request->get_param( 'id' );
		$form = \WPCF7_ContactForm::get_instance( $id );

		if ( ! $form ) {
			return self::error( 'not_found', __( 'That form no longer exists.', 'cf7-nova-lite' ), 404 );
		}

		$fields = Form_Tag_Parser::parse( (string) $form->prop( 'form' ) );

		return new \WP_REST_Response(
			array(
				'id'       => $id,
				'title'    => $form->title(),
				'fields'   => $fields,
				'redirect' => Redirect::config( $id ),
				'steps'    => Steps::config( $id ),
			),
			200
		);
	}

	/**
	 * What this form can be rolled back to, newest first.
	 *
	 * Timestamps only. The modal lists these every time it opens and shows no
	 * more than when each one was taken, so parsing ten templates to draw it
	 * would be work nobody sees.
	 */
	public function rest_list_revisions( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id = (int) $request->get_param( 'id' );

		if ( ! class_exists( 'WPCF7_ContactForm' ) || ! \WPCF7_ContactForm::get_instance( $id ) ) {
			return self::error( 'not_found', __( 'That form no longer exists.', 'cf7-nova-lite' ), 404 );
		}

		return new \WP_REST_Response( Revisions::all( $id ), 200 );
	}

	/**
	 * One revision, in the shape the builder already knows how to load.
	 *
	 * Deliberately identical to what `rest_get_form_builder()` returns, and
	 * parsed by the same `Form_Tag_Parser::parse()`. A restored revision is not
	 * a special kind of form — it is the same payload from an older template, so
	 * the builder needs no second way to fill its canvas, and there is no second
	 * write path for `Form_Html` to be forgotten on.
	 */
	public function rest_get_revision( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id  = (int) $request->get_param( 'id' );
		$rev = (int) $request->get_param( 'rev' );

		if ( ! class_exists( 'WPCF7_ContactForm' ) || ! \WPCF7_ContactForm::get_instance( $id ) ) {
			return self::error( 'not_found', __( 'That form no longer exists.', 'cf7-nova-lite' ), 404 );
		}

		$revision = Revisions::get( $id, $rev );

		if ( null === $revision ) {
			return self::error( 'no_revision', __( 'That version is no longer kept.', 'cf7-nova-lite' ), 404 );
		}

		return new \WP_REST_Response(
			array(
				'rev'      => (int) $revision['rev'],
				'time'     => (int) $revision['time'],
				'fields'   => Form_Tag_Parser::parse( (string) ( $revision['form'] ?? '' ) ),
				'redirect' => (array) ( $revision['redirect'] ?? array() ),
				'steps'    => (array) ( $revision['steps'] ?? array() ),
			),
			200
		);
	}

	public function rest_save_form_builder( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			return self::error( 'cf7_missing', __( 'Contact Form 7 is not active.', 'cf7-nova-lite' ), 400 );
		}

		$id   = (int) $request->get_param( 'id' );
		$form = \WPCF7_ContactForm::get_instance( $id );

		if ( ! $form ) {
			return self::error( 'not_found', __( 'That form no longer exists.', 'cf7-nova-lite' ), 404 );
		}

		// CF7's own gate, per form, the same way create and delete ask for theirs.
		// Without it a site that narrowed who may edit a given form was obeyed
		// everywhere except on the one route that rewrites the whole template.
		if ( ! current_user_can( 'wpcf7_edit_contact_form', $id ) ) {
			return self::error( 'forbidden', __( 'You do not have permission to edit this form.', 'cf7-nova-lite' ), 403 );
		}

		$params = $request->get_json_params();
		$items  = $params['fields'] ?? array();
		$markup = Form_Tag_Parser::serialize( is_array( $items ) ? $items : array() );

		// `html` items pass through the serializer verbatim — that is what lets an
		// existing hand-written form survive a round-trip, and what makes this the
		// point where the allow-list has to run. Form_Html owns both halves of that
		// rule, so import gets the same one.
		$markup = Form_Html::filter( $markup );

		$form->set_properties( array( 'form' => $markup ) );
		$form->save();

		// Each class owns its own meta key and its own rule for what counts as
		// nothing worth storing; both used to be spelled out again here.
		$redirect = Redirect::save( $id, (array) ( $params['redirect'] ?? array() ) );
		$steps    = Steps::save( $id, (array) ( $params['steps'] ?? array() ) );

		return new \WP_REST_Response(
			array(
				'saved'    => true,
				'fields'   => Form_Tag_Parser::parse( $markup ),
				'redirect' => $redirect,
				'steps'    => $steps,
			),
			200
		);
	}
}
