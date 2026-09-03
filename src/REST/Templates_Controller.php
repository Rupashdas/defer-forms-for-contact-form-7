<?php
/**
 * REST: The starter-template library and creating a form from one.
 *
 * @package DF7
 */

declare(strict_types=1);

namespace DF7\REST;

defined( 'ABSPATH' ) || exit;

final class Templates_Controller extends Controller {

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/templates',
			array(
				'methods'             => 'GET',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_list_templates' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/templates/(?P<slug>[a-z_]+)/create',
			array(
				'methods'             => 'POST',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_create_from_template' ),
				'args'                => array(
					'slug' => array( 'type' => 'string' ),
				),
			)
		);
	}

	public function rest_list_templates(): \WP_REST_Response {
		$registry = $this->container->make( 'templates.registry' );
		return new \WP_REST_Response( $registry->catalog(), 200 );
	}

	public function rest_create_from_template( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			return self::error( 'cf7_missing', __( 'Contact Form 7 is not active.', 'defer-forms-for-contact-form-7' ), 400 );
		}

		// Creating from a template is still creating a contact form, so it answers
		// to CF7's own gate rather than to this route's admin-only check alone.
		if ( ! current_user_can( 'wpcf7_edit_contact_forms' ) ) {
			return self::error( 'forbidden', __( 'You do not have permission to create forms.', 'defer-forms-for-contact-form-7' ), 403 );
		}

		$slug     = (string) $request->get_param( 'slug' );
		$registry = $this->container->make( 'templates.registry' );
		$template = $registry->get( $slug );

		if ( null === $template ) {
			return self::error( 'unavailable', __( 'There is no template by that name.', 'defer-forms-for-contact-form-7' ), 400 );
		}

		$contact_form = \WPCF7_ContactForm::get_template( array( 'title' => $template['name'] ) );
		$contact_form->set_title( $template['name'] );
		$contact_form->set_properties(
			array(
				'form' => $template['form'],
				'mail' => array_merge(
					(array) $contact_form->prop( 'mail' ),
					array(
						'subject' => '[_site_title] — ' . $template['name'],
						'body'    => $template['mail'],
					)
				),
			)
		);

		$contact_form->save();
		$id = $contact_form->id();

		if ( ! $id ) {
			return self::error( 'save_failed', __( 'The form could not be saved. Please try again.', 'defer-forms-for-contact-form-7' ), 500 );
		}

		// The builder, the same place creating a blank form lands. Sending people
		// to Contact Form 7's textarea instead was the one route that walked a new
		// user straight past the thing they came here for — and every template
		// survives a builder round-trip, which tests/php/templates.php checks.
		return new \WP_REST_Response(
			array(
				'form_id'     => (int) $id,
				'builder_url' => admin_url( 'admin.php?page=df7-builder&form=' . (int) $id ),
			),
			201
		);
	}
}
