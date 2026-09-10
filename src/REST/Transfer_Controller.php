<?php
/**
 * REST: forms out as a JSON file, and forms back in from one.
 *
 * Two routes with one job between them — moving a form to another site without
 * rebuilding it there. Form_Bundle owns what a bundle may contain; this file
 * owns talking to WordPress and Contact Form 7 about it.
 *
 * Import always creates. It never updates a form that happens to share a title,
 * because a title is not an identity: two sites can each have a "Contact form 1"
 * that has nothing to do with the other, and overwriting one of them on the
 * strength of its name is a way to lose a form nobody backed up.
 *
 * @package DEFERFORMS
 */

declare(strict_types=1);

namespace DEFERFORMS\REST;

use DEFERFORMS\CF7\Form_Bundle;
use DEFERFORMS\CF7\Form_Html;
use DEFERFORMS\CF7\Redirect;
use DEFERFORMS\CF7\Steps;

defined( 'ABSPATH' ) || exit;

final class Transfer_Controller extends Controller {

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/forms/export',
			array(
				'methods'             => 'POST',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_export' ),
				'args'                => array(
					'ids' => array(
						'type'     => 'array',
						'required' => true,
						'items'    => array( 'type' => 'integer' ),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/forms/import',
			array(
				'methods'             => 'POST',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_import' ),
			)
		);
	}

	/**
	 * The chosen forms, as the bundle a browser saves to a file.
	 *
	 * A form the caller may not read is skipped rather than refused: asking for
	 * five forms and getting four is a better answer than getting none because
	 * of the one.
	 */
	public function rest_export( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			return self::error( 'cf7_missing', __( 'Contact Form 7 is not active.', 'defer-forms-for-contact-form-7' ), 400 );
		}

		$ids = array_filter( array_map( 'absint', (array) $request->get_param( 'ids' ) ) );

		if ( empty( $ids ) ) {
			return self::error( 'no_forms', __( 'No forms were chosen to export.', 'defer-forms-for-contact-form-7' ), 400 );
		}

		$forms = array();

		foreach ( array_unique( $ids ) as $id ) {
			$form = \WPCF7_ContactForm::get_instance( $id );

			if ( ! $form || ! current_user_can( 'wpcf7_edit_contact_form', $id ) ) {
				continue;
			}

			$forms[] = array(
				'title'      => $form->title(),
				'locale'     => $form->locale(),
				'properties' => $form->get_properties(),
				'meta'       => array(
					'redirect' => Redirect::config( $id ),
					'steps'    => Steps::config( $id ),
				),
			);
		}

		if ( empty( $forms ) ) {
			return self::error( 'no_forms', __( 'None of the chosen forms could be read.', 'defer-forms-for-contact-form-7' ), 404 );
		}

		return new \WP_REST_Response( Form_Bundle::pack( $forms ), 200 );
	}

	/**
	 * A bundle in, new forms out.
	 *
	 * Every form goes through `wpcf7_save_contact_form()`, the same call CF7's
	 * own editor makes, so CF7's sanitisers run over every property rather than
	 * this file deciding for itself what a mail template may say.
	 */
	public function rest_import( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! function_exists( 'wpcf7_save_contact_form' ) ) {
			return self::error( 'cf7_missing', __( 'Contact Form 7 is not active.', 'defer-forms-for-contact-form-7' ), 400 );
		}

		// The route is admin-only already; this is CF7's own gate on creating a
		// contact form, and a site that has narrowed it should still be obeyed.
		if ( ! current_user_can( 'wpcf7_edit_contact_forms' ) ) {
			return self::error( 'forbidden', __( 'You do not have permission to create forms.', 'defer-forms-for-contact-form-7' ), 403 );
		}

		$params = $request->get_json_params();
		$bundle = is_array( $params ) ? ( $params['bundle'] ?? null ) : null;

		if ( ! is_array( $bundle ) ) {
			return self::error( 'not_a_bundle', __( 'That file is not a form bundle from this plugin.', 'defer-forms-for-contact-form-7' ), 400 );
		}

		$forms = Form_Bundle::unpack( $bundle );

		if ( empty( $forms ) ) {
			return self::error( 'nothing_to_import', __( 'The bundle holds no forms this version can read.', 'defer-forms-for-contact-form-7' ), 400 );
		}

		$created = array();
		$failed  = 0;

		foreach ( $forms as $form ) {
			$properties = $form['properties'];

			// A bundle is a file somebody uploaded, so its template is untrusted
			// input — more so than the builder's, which at least came from our own
			// editor. `wpcf7_save_contact_form()` does not filter it and
			// `Form_Bundle::unpack()` only allow-lists which *keys* may travel, so
			// without this the import route was the one write path where a user
			// who lacks `unfiltered_html` could store a `<script>` that then
			// renders for every public visitor.
			if ( isset( $properties['form'] ) ) {
				$properties['form'] = Form_Html::filter( (string) $properties['form'] );
			}

			$saved = wpcf7_save_contact_form(
				array_merge(
					$properties,
					array(
						'id'     => -1,
						'title'  => $form['title'],
						'locale' => $form['locale'],
					)
				)
			);

			if ( ! $saved || ! $saved->id() ) {
				++$failed;
				continue;
			}

			$id = (int) $saved->id();

			// Each class sanitises and stores its own key, exactly as it does
			// when the builder saves.
			Redirect::save( $id, (array) ( $form['meta']['redirect'] ?? array() ) );
			Steps::save( $id, (array) ( $form['meta']['steps'] ?? array() ) );

			$created[] = array(
				'form_id'     => $id,
				'title'       => $saved->title(),
				'builder_url' => admin_url( 'admin.php?page=deferforms-builder&form=' . $id ),
			);
		}

		return new \WP_REST_Response(
			array(
				'created' => $created,
				'failed'  => $failed,
			),
			201
		);
	}
}
