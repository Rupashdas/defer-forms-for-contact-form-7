<?php
/**
 * File field with multi-upload support.
 *
 * CF7's own upload pipeline already handles several files per field — it
 * flattens `$_FILES[name]` and loops (see wpcf7_unship_uploaded_file) — but its
 * markup never offers them: no `multiple` attribute, and a scalar field name.
 * So we re-register the `file` tag at a later priority and swap ONLY the render
 * callback, keeping CF7's `file-uploading` feature flag so validation, the SWV
 * rules and the upload step all keep working untouched.
 *
 * The extra `data-*` attributes are what assets/js/file.js reads to enforce the
 * same limits in the browser before anything is sent.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class File_Field {

	public function register_hooks(): void {
		// Priority 5, i.e. BEFORE CF7 registers its own file handler at 10.
		// WPCF7_FormTagsManager::add() ignores a tag type that already exists,
		// so whoever registers first wins — registering later is a silent no-op.
		add_action( 'wpcf7_init', array( $this, 'add_form_tag' ), 5 );
	}

	public function add_form_tag(): void {
		if ( ! function_exists( 'wpcf7_add_form_tag' ) ) {
			return;
		}
		wpcf7_add_form_tag(
			array( 'file', 'file*' ),
			array( $this, 'render' ),
			array(
				'name-attr'      => true,
				'file-uploading' => true,
			)
		);
	}

	/**
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 */
	public function render( $tag ): string {
		$tag = new \WPCF7_FormTag( $tag );
		if ( '' === $tag->name ) {
			return '';
		}

		$validation_error = wpcf7_get_validation_error( $tag->name );
		$class            = wpcf7_form_controls_class( $tag->type );
		if ( $validation_error ) {
			$class .= ' wpcf7-not-valid';
		}

		$multiple = $tag->has_option( 'multiple' );
		$limit    = (int) $tag->get_limit_option();
		$maxfiles = (int) $tag->get_option( 'maxfiles', 'int', true );

		$atts = array(
			'type'          => 'file',
			// PHP only fills $_FILES with an array when the name ends in [].
			'name'          => $multiple ? $tag->name . '[]' : $tag->name,
			'size'          => $tag->get_size_option( '40' ),
			'class'         => $tag->get_class_option( $class ),
			'id'            => $tag->get_id_option(),
			'capture'       => $tag->get_option( 'capture', '(user|environment)', true ),
			'tabindex'      => $tag->get_option( 'tabindex', 'signed_int', true ),
			'accept'        => wpcf7_acceptable_filetypes( $tag->get_option( 'filetypes' ), 'attr' ),
			'data-limit'    => $limit > 0 ? (string) $limit : null,
			'data-maxfiles' => $maxfiles > 0 ? (string) $maxfiles : null,
		);

		if ( $multiple ) {
			$atts['multiple'] = 'multiple';
		}

		if ( $tag->is_required() ) {
			$atts['aria-required'] = 'true';
		}

		if ( $validation_error ) {
			$atts['aria-invalid']     = 'true';
			$atts['aria-describedby'] = wpcf7_get_validation_error_reference( $tag->name );
		} else {
			$atts['aria-invalid'] = 'false';
		}

		return sprintf(
			'<span class="wpcf7-form-control-wrap" data-name="%1$s"><input %2$s />%3$s</span>',
			esc_attr( $tag->name ),
			wpcf7_format_atts( $atts ),
			$validation_error
		);
	}
}
