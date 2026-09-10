<?php
/**
 * Country dropdown field. A registered CF7 form-tag `[country]` that renders a
 * <select> populated from a built-in country list — so the saved form markup
 * stays clean (`[country* name]`) instead of baking ~250 options into it.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class Country {

	use Required_Check {
		validate as validate_required;
	}

	public function register_hooks(): void {
		add_action( 'wpcf7_init', array( $this, 'add_form_tag' ) );
		add_filter( 'wpcf7_validate_country', array( $this, 'validate' ), 10, 2 );
		add_filter( 'wpcf7_validate_country*', array( $this, 'validate' ), 10, 2 );
	}

	/**
	 * A dropdown only offers what it rendered, so anything else was not chosen —
	 * it was posted. Contact Form 7 derives an enum rule for its own select from
	 * its schema; a tag registered here gets none, so the list has to be checked
	 * against by hand or the field means nothing once the form leaves the browser.
	 *
	 * @param \WPCF7_Validation                   $result
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 * @return \WPCF7_Validation
	 */
	public function validate( $result, $tag ) {
		$result = $this->validate_required( $result, $tag );
		$tag    = new \WPCF7_FormTag( $tag );

		$value = isset( $_POST[ $tag->name ] ) ? wp_unslash( $_POST[ $tag->name ] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
		$value = is_scalar( $value ) ? trim( (string) $value ) : '';

		// Empty is the placeholder option; whether that is allowed is the required
		// check's business, already settled above.
		//
		// Checked against the keys, which are the canonical English names — the
		// values are the translated labels, and what a browser posts is the
		// option's value.
		if ( '' === $value || array_key_exists( $value, self::countries() ) ) {
			return $result;
		}

		$result->invalidate( $tag, wpcf7_get_message( 'invalid_required' ) );

		return $result;
	}

	public function add_form_tag(): void {
		if ( ! function_exists( 'wpcf7_add_form_tag' ) ) {
			return;
		}
		wpcf7_add_form_tag(
			array( 'country', 'country*' ),
			array( $this, 'render' ),
			array( 'name-attr' => true )
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

		// Prefill is handled here rather than by the shared Prefill filter: a
		// select carries its choices in `values`, so the match is a `selected`
		// attribute instead of a replacement value.
		$prefill  = (string) ( $tag->get_option( 'prefill', '', true ) ?: '' );
		$selected = '' !== $prefill ? Value_Source::resolve( $prefill ) : '';

		$options = '<option value="">' . esc_html__( 'Select a country…', 'defer-forms-for-contact-form-7' ) . '</option>';

		// Value and label are deliberately different now. The value is the
		// canonical English name, so what lands in the submissions table does not
		// change the day somebody switches the site language — a table holding
		// "Bangladesh" for half its rows and the translation for the rest is not
		// something you can sort, filter or export sensibly. The label is what a
		// visitor reads, and that follows the locale.
		foreach ( self::countries() as $name => $label ) {
			// Either spelling satisfies a `prefill:`, since a link could carry
			// the canonical name or the one the visitor saw.
			$is_selected = 0 === strcasecmp( $name, $selected ) || 0 === strcasecmp( $label, $selected );

			$options .= sprintf(
				'<option value="%1$s"%3$s>%2$s</option>',
				esc_attr( $name ),
				esc_html( $label ),
				$is_selected ? ' selected' : ''
			);
		}

		// get_class_option carries the user's classes plus our marker classes
		// (deferforms-search), which the select widget reads.
		$class = $tag->get_class_option( wpcf7_form_controls_class( $tag->type ) ) . ' deferforms-country';

		return sprintf(
			'<span class="wpcf7-form-control-wrap" data-name="%1$s"><select name="%1$s" class="%2$s"%3$s>%4$s</select>%5$s</span>',
			esc_attr( $tag->name ),
			esc_attr( trim( $class ) ),
			$tag->is_required() ? ' aria-required="true"' : '',
			$options,
			wpcf7_get_validation_error( $tag->name )
		);
	}


	/**
	 * Canonical English name => the name to show, in the site's language.
	 *
	 * @return array<string, string>
	 */
	private static function countries(): array {
		return array(
			'Afghanistan'                      => __( 'Afghanistan', 'defer-forms-for-contact-form-7' ),
			'Albania'                          => __( 'Albania', 'defer-forms-for-contact-form-7' ),
			'Algeria'                          => __( 'Algeria', 'defer-forms-for-contact-form-7' ),
			'Andorra'                          => __( 'Andorra', 'defer-forms-for-contact-form-7' ),
			'Angola'                           => __( 'Angola', 'defer-forms-for-contact-form-7' ),
			'Antigua and Barbuda'              => __( 'Antigua and Barbuda', 'defer-forms-for-contact-form-7' ),
			'Argentina'                        => __( 'Argentina', 'defer-forms-for-contact-form-7' ),
			'Armenia'                          => __( 'Armenia', 'defer-forms-for-contact-form-7' ),
			'Australia'                        => __( 'Australia', 'defer-forms-for-contact-form-7' ),
			'Austria'                          => __( 'Austria', 'defer-forms-for-contact-form-7' ),
			'Azerbaijan'                       => __( 'Azerbaijan', 'defer-forms-for-contact-form-7' ),
			'Bahamas'                          => __( 'Bahamas', 'defer-forms-for-contact-form-7' ),
			'Bahrain'                          => __( 'Bahrain', 'defer-forms-for-contact-form-7' ),
			'Bangladesh'                       => __( 'Bangladesh', 'defer-forms-for-contact-form-7' ),
			'Barbados'                         => __( 'Barbados', 'defer-forms-for-contact-form-7' ),
			'Belarus'                          => __( 'Belarus', 'defer-forms-for-contact-form-7' ),
			'Belgium'                          => __( 'Belgium', 'defer-forms-for-contact-form-7' ),
			'Belize'                           => __( 'Belize', 'defer-forms-for-contact-form-7' ),
			'Benin'                            => __( 'Benin', 'defer-forms-for-contact-form-7' ),
			'Bhutan'                           => __( 'Bhutan', 'defer-forms-for-contact-form-7' ),
			'Bolivia'                          => __( 'Bolivia', 'defer-forms-for-contact-form-7' ),
			'Bosnia and Herzegovina'           => __( 'Bosnia and Herzegovina', 'defer-forms-for-contact-form-7' ),
			'Botswana'                         => __( 'Botswana', 'defer-forms-for-contact-form-7' ),
			'Brazil'                           => __( 'Brazil', 'defer-forms-for-contact-form-7' ),
			'Brunei'                           => __( 'Brunei', 'defer-forms-for-contact-form-7' ),
			'Bulgaria'                         => __( 'Bulgaria', 'defer-forms-for-contact-form-7' ),
			'Burkina Faso'                     => __( 'Burkina Faso', 'defer-forms-for-contact-form-7' ),
			'Burundi'                          => __( 'Burundi', 'defer-forms-for-contact-form-7' ),
			'Cabo Verde'                       => __( 'Cabo Verde', 'defer-forms-for-contact-form-7' ),
			'Cambodia'                         => __( 'Cambodia', 'defer-forms-for-contact-form-7' ),
			'Cameroon'                         => __( 'Cameroon', 'defer-forms-for-contact-form-7' ),
			'Canada'                           => __( 'Canada', 'defer-forms-for-contact-form-7' ),
			'Central African Republic'         => __( 'Central African Republic', 'defer-forms-for-contact-form-7' ),
			'Chad'                             => __( 'Chad', 'defer-forms-for-contact-form-7' ),
			'Chile'                            => __( 'Chile', 'defer-forms-for-contact-form-7' ),
			'China'                            => __( 'China', 'defer-forms-for-contact-form-7' ),
			'Colombia'                         => __( 'Colombia', 'defer-forms-for-contact-form-7' ),
			'Comoros'                          => __( 'Comoros', 'defer-forms-for-contact-form-7' ),
			'Congo'                            => __( 'Congo', 'defer-forms-for-contact-form-7' ),
			'Costa Rica'                       => __( 'Costa Rica', 'defer-forms-for-contact-form-7' ),
			'Croatia'                          => __( 'Croatia', 'defer-forms-for-contact-form-7' ),
			'Cuba'                             => __( 'Cuba', 'defer-forms-for-contact-form-7' ),
			'Cyprus'                           => __( 'Cyprus', 'defer-forms-for-contact-form-7' ),
			'Czechia'                          => __( 'Czechia', 'defer-forms-for-contact-form-7' ),
			'Denmark'                          => __( 'Denmark', 'defer-forms-for-contact-form-7' ),
			'Djibouti'                         => __( 'Djibouti', 'defer-forms-for-contact-form-7' ),
			'Dominica'                         => __( 'Dominica', 'defer-forms-for-contact-form-7' ),
			'Dominican Republic'               => __( 'Dominican Republic', 'defer-forms-for-contact-form-7' ),
			'Ecuador'                          => __( 'Ecuador', 'defer-forms-for-contact-form-7' ),
			'Egypt'                            => __( 'Egypt', 'defer-forms-for-contact-form-7' ),
			'El Salvador'                      => __( 'El Salvador', 'defer-forms-for-contact-form-7' ),
			'Equatorial Guinea'                => __( 'Equatorial Guinea', 'defer-forms-for-contact-form-7' ),
			'Eritrea'                          => __( 'Eritrea', 'defer-forms-for-contact-form-7' ),
			'Estonia'                          => __( 'Estonia', 'defer-forms-for-contact-form-7' ),
			'Eswatini'                         => __( 'Eswatini', 'defer-forms-for-contact-form-7' ),
			'Ethiopia'                         => __( 'Ethiopia', 'defer-forms-for-contact-form-7' ),
			'Fiji'                             => __( 'Fiji', 'defer-forms-for-contact-form-7' ),
			'Finland'                          => __( 'Finland', 'defer-forms-for-contact-form-7' ),
			'France'                           => __( 'France', 'defer-forms-for-contact-form-7' ),
			'Gabon'                            => __( 'Gabon', 'defer-forms-for-contact-form-7' ),
			'Gambia'                           => __( 'Gambia', 'defer-forms-for-contact-form-7' ),
			'Georgia'                          => __( 'Georgia', 'defer-forms-for-contact-form-7' ),
			'Germany'                          => __( 'Germany', 'defer-forms-for-contact-form-7' ),
			'Ghana'                            => __( 'Ghana', 'defer-forms-for-contact-form-7' ),
			'Greece'                           => __( 'Greece', 'defer-forms-for-contact-form-7' ),
			'Grenada'                          => __( 'Grenada', 'defer-forms-for-contact-form-7' ),
			'Guatemala'                        => __( 'Guatemala', 'defer-forms-for-contact-form-7' ),
			'Guinea'                           => __( 'Guinea', 'defer-forms-for-contact-form-7' ),
			'Guinea-Bissau'                    => __( 'Guinea-Bissau', 'defer-forms-for-contact-form-7' ),
			'Guyana'                           => __( 'Guyana', 'defer-forms-for-contact-form-7' ),
			'Haiti'                            => __( 'Haiti', 'defer-forms-for-contact-form-7' ),
			'Honduras'                         => __( 'Honduras', 'defer-forms-for-contact-form-7' ),
			'Hungary'                          => __( 'Hungary', 'defer-forms-for-contact-form-7' ),
			'Iceland'                          => __( 'Iceland', 'defer-forms-for-contact-form-7' ),
			'India'                            => __( 'India', 'defer-forms-for-contact-form-7' ),
			'Indonesia'                        => __( 'Indonesia', 'defer-forms-for-contact-form-7' ),
			'Iran'                             => __( 'Iran', 'defer-forms-for-contact-form-7' ),
			'Iraq'                             => __( 'Iraq', 'defer-forms-for-contact-form-7' ),
			'Ireland'                          => __( 'Ireland', 'defer-forms-for-contact-form-7' ),
			'Israel'                           => __( 'Israel', 'defer-forms-for-contact-form-7' ),
			'Italy'                            => __( 'Italy', 'defer-forms-for-contact-form-7' ),
			'Jamaica'                          => __( 'Jamaica', 'defer-forms-for-contact-form-7' ),
			'Japan'                            => __( 'Japan', 'defer-forms-for-contact-form-7' ),
			'Jordan'                           => __( 'Jordan', 'defer-forms-for-contact-form-7' ),
			'Kazakhstan'                       => __( 'Kazakhstan', 'defer-forms-for-contact-form-7' ),
			'Kenya'                            => __( 'Kenya', 'defer-forms-for-contact-form-7' ),
			'Kiribati'                         => __( 'Kiribati', 'defer-forms-for-contact-form-7' ),
			'Kuwait'                           => __( 'Kuwait', 'defer-forms-for-contact-form-7' ),
			'Kyrgyzstan'                       => __( 'Kyrgyzstan', 'defer-forms-for-contact-form-7' ),
			'Laos'                             => __( 'Laos', 'defer-forms-for-contact-form-7' ),
			'Latvia'                           => __( 'Latvia', 'defer-forms-for-contact-form-7' ),
			'Lebanon'                          => __( 'Lebanon', 'defer-forms-for-contact-form-7' ),
			'Lesotho'                          => __( 'Lesotho', 'defer-forms-for-contact-form-7' ),
			'Liberia'                          => __( 'Liberia', 'defer-forms-for-contact-form-7' ),
			'Libya'                            => __( 'Libya', 'defer-forms-for-contact-form-7' ),
			'Liechtenstein'                    => __( 'Liechtenstein', 'defer-forms-for-contact-form-7' ),
			'Lithuania'                        => __( 'Lithuania', 'defer-forms-for-contact-form-7' ),
			'Luxembourg'                       => __( 'Luxembourg', 'defer-forms-for-contact-form-7' ),
			'Madagascar'                       => __( 'Madagascar', 'defer-forms-for-contact-form-7' ),
			'Malawi'                           => __( 'Malawi', 'defer-forms-for-contact-form-7' ),
			'Malaysia'                         => __( 'Malaysia', 'defer-forms-for-contact-form-7' ),
			'Maldives'                         => __( 'Maldives', 'defer-forms-for-contact-form-7' ),
			'Mali'                             => __( 'Mali', 'defer-forms-for-contact-form-7' ),
			'Malta'                            => __( 'Malta', 'defer-forms-for-contact-form-7' ),
			'Marshall Islands'                 => __( 'Marshall Islands', 'defer-forms-for-contact-form-7' ),
			'Mauritania'                       => __( 'Mauritania', 'defer-forms-for-contact-form-7' ),
			'Mauritius'                        => __( 'Mauritius', 'defer-forms-for-contact-form-7' ),
			'Mexico'                           => __( 'Mexico', 'defer-forms-for-contact-form-7' ),
			'Micronesia'                       => __( 'Micronesia', 'defer-forms-for-contact-form-7' ),
			'Moldova'                          => __( 'Moldova', 'defer-forms-for-contact-form-7' ),
			'Monaco'                           => __( 'Monaco', 'defer-forms-for-contact-form-7' ),
			'Mongolia'                         => __( 'Mongolia', 'defer-forms-for-contact-form-7' ),
			'Montenegro'                       => __( 'Montenegro', 'defer-forms-for-contact-form-7' ),
			'Morocco'                          => __( 'Morocco', 'defer-forms-for-contact-form-7' ),
			'Mozambique'                       => __( 'Mozambique', 'defer-forms-for-contact-form-7' ),
			'Myanmar'                          => __( 'Myanmar', 'defer-forms-for-contact-form-7' ),
			'Namibia'                          => __( 'Namibia', 'defer-forms-for-contact-form-7' ),
			'Nauru'                            => __( 'Nauru', 'defer-forms-for-contact-form-7' ),
			'Nepal'                            => __( 'Nepal', 'defer-forms-for-contact-form-7' ),
			'Netherlands'                      => __( 'Netherlands', 'defer-forms-for-contact-form-7' ),
			'New Zealand'                      => __( 'New Zealand', 'defer-forms-for-contact-form-7' ),
			'Nicaragua'                        => __( 'Nicaragua', 'defer-forms-for-contact-form-7' ),
			'Niger'                            => __( 'Niger', 'defer-forms-for-contact-form-7' ),
			'Nigeria'                          => __( 'Nigeria', 'defer-forms-for-contact-form-7' ),
			'North Korea'                      => __( 'North Korea', 'defer-forms-for-contact-form-7' ),
			'North Macedonia'                  => __( 'North Macedonia', 'defer-forms-for-contact-form-7' ),
			'Norway'                           => __( 'Norway', 'defer-forms-for-contact-form-7' ),
			'Oman'                             => __( 'Oman', 'defer-forms-for-contact-form-7' ),
			'Pakistan'                         => __( 'Pakistan', 'defer-forms-for-contact-form-7' ),
			'Palau'                            => __( 'Palau', 'defer-forms-for-contact-form-7' ),
			'Palestine'                        => __( 'Palestine', 'defer-forms-for-contact-form-7' ),
			'Panama'                           => __( 'Panama', 'defer-forms-for-contact-form-7' ),
			'Papua New Guinea'                 => __( 'Papua New Guinea', 'defer-forms-for-contact-form-7' ),
			'Paraguay'                         => __( 'Paraguay', 'defer-forms-for-contact-form-7' ),
			'Peru'                             => __( 'Peru', 'defer-forms-for-contact-form-7' ),
			'Philippines'                      => __( 'Philippines', 'defer-forms-for-contact-form-7' ),
			'Poland'                           => __( 'Poland', 'defer-forms-for-contact-form-7' ),
			'Portugal'                         => __( 'Portugal', 'defer-forms-for-contact-form-7' ),
			'Qatar'                            => __( 'Qatar', 'defer-forms-for-contact-form-7' ),
			'Romania'                          => __( 'Romania', 'defer-forms-for-contact-form-7' ),
			'Russia'                           => __( 'Russia', 'defer-forms-for-contact-form-7' ),
			'Rwanda'                           => __( 'Rwanda', 'defer-forms-for-contact-form-7' ),
			'Saint Kitts and Nevis'            => __( 'Saint Kitts and Nevis', 'defer-forms-for-contact-form-7' ),
			'Saint Lucia'                      => __( 'Saint Lucia', 'defer-forms-for-contact-form-7' ),
			'Saint Vincent and the Grenadines' => __( 'Saint Vincent and the Grenadines', 'defer-forms-for-contact-form-7' ),
			'Samoa'                            => __( 'Samoa', 'defer-forms-for-contact-form-7' ),
			'San Marino'                       => __( 'San Marino', 'defer-forms-for-contact-form-7' ),
			'Sao Tome and Principe'            => __( 'Sao Tome and Principe', 'defer-forms-for-contact-form-7' ),
			'Saudi Arabia'                     => __( 'Saudi Arabia', 'defer-forms-for-contact-form-7' ),
			'Senegal'                          => __( 'Senegal', 'defer-forms-for-contact-form-7' ),
			'Serbia'                           => __( 'Serbia', 'defer-forms-for-contact-form-7' ),
			'Seychelles'                       => __( 'Seychelles', 'defer-forms-for-contact-form-7' ),
			'Sierra Leone'                     => __( 'Sierra Leone', 'defer-forms-for-contact-form-7' ),
			'Singapore'                        => __( 'Singapore', 'defer-forms-for-contact-form-7' ),
			'Slovakia'                         => __( 'Slovakia', 'defer-forms-for-contact-form-7' ),
			'Slovenia'                         => __( 'Slovenia', 'defer-forms-for-contact-form-7' ),
			'Solomon Islands'                  => __( 'Solomon Islands', 'defer-forms-for-contact-form-7' ),
			'Somalia'                          => __( 'Somalia', 'defer-forms-for-contact-form-7' ),
			'South Africa'                     => __( 'South Africa', 'defer-forms-for-contact-form-7' ),
			'South Korea'                      => __( 'South Korea', 'defer-forms-for-contact-form-7' ),
			'South Sudan'                      => __( 'South Sudan', 'defer-forms-for-contact-form-7' ),
			'Spain'                            => __( 'Spain', 'defer-forms-for-contact-form-7' ),
			'Sri Lanka'                        => __( 'Sri Lanka', 'defer-forms-for-contact-form-7' ),
			'Sudan'                            => __( 'Sudan', 'defer-forms-for-contact-form-7' ),
			'Suriname'                         => __( 'Suriname', 'defer-forms-for-contact-form-7' ),
			'Sweden'                           => __( 'Sweden', 'defer-forms-for-contact-form-7' ),
			'Switzerland'                      => __( 'Switzerland', 'defer-forms-for-contact-form-7' ),
			'Syria'                            => __( 'Syria', 'defer-forms-for-contact-form-7' ),
			'Taiwan'                           => __( 'Taiwan', 'defer-forms-for-contact-form-7' ),
			'Tajikistan'                       => __( 'Tajikistan', 'defer-forms-for-contact-form-7' ),
			'Tanzania'                         => __( 'Tanzania', 'defer-forms-for-contact-form-7' ),
			'Thailand'                         => __( 'Thailand', 'defer-forms-for-contact-form-7' ),
			'Timor-Leste'                      => __( 'Timor-Leste', 'defer-forms-for-contact-form-7' ),
			'Togo'                             => __( 'Togo', 'defer-forms-for-contact-form-7' ),
			'Tonga'                            => __( 'Tonga', 'defer-forms-for-contact-form-7' ),
			'Trinidad and Tobago'              => __( 'Trinidad and Tobago', 'defer-forms-for-contact-form-7' ),
			'Tunisia'                          => __( 'Tunisia', 'defer-forms-for-contact-form-7' ),
			'Turkey'                           => __( 'Turkey', 'defer-forms-for-contact-form-7' ),
			'Turkmenistan'                     => __( 'Turkmenistan', 'defer-forms-for-contact-form-7' ),
			'Tuvalu'                           => __( 'Tuvalu', 'defer-forms-for-contact-form-7' ),
			'Uganda'                           => __( 'Uganda', 'defer-forms-for-contact-form-7' ),
			'Ukraine'                          => __( 'Ukraine', 'defer-forms-for-contact-form-7' ),
			'United Arab Emirates'             => __( 'United Arab Emirates', 'defer-forms-for-contact-form-7' ),
			'United Kingdom'                   => __( 'United Kingdom', 'defer-forms-for-contact-form-7' ),
			'United States'                    => __( 'United States', 'defer-forms-for-contact-form-7' ),
			'Uruguay'                          => __( 'Uruguay', 'defer-forms-for-contact-form-7' ),
			'Uzbekistan'                       => __( 'Uzbekistan', 'defer-forms-for-contact-form-7' ),
			'Vanuatu'                          => __( 'Vanuatu', 'defer-forms-for-contact-form-7' ),
			'Vatican City'                     => __( 'Vatican City', 'defer-forms-for-contact-form-7' ),
			'Venezuela'                        => __( 'Venezuela', 'defer-forms-for-contact-form-7' ),
			'Vietnam'                          => __( 'Vietnam', 'defer-forms-for-contact-form-7' ),
			'Yemen'                            => __( 'Yemen', 'defer-forms-for-contact-form-7' ),
			'Zambia'                           => __( 'Zambia', 'defer-forms-for-contact-form-7' ),
			'Zimbabwe'                         => __( 'Zimbabwe', 'defer-forms-for-contact-form-7' ),
		);
	}
}
