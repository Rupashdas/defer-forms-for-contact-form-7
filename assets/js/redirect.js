/**
 * Redirect after a successful submit.
 *
 * CF7 fires `wpcf7mailsent` on the form once the mail is away; the marker inside
 * that form carries where to go and how. A delay gives the visitor a moment to
 * read the success message first.
 *
 * The destination may name fields — `[your-name]` in the address or in a query
 * parameter — which are filled in from the submission. Those values come from
 * CF7's own event payload rather than from reading the form back, because CF7
 * resets the form moments after firing the event.
 */
( function () {
	'use strict';

	/** Submitted values by field name, from CF7's event detail. */
	function submitted( detail ) {
		var map = {};
		var inputs = ( detail && detail.inputs ) || [];

		inputs.forEach( function ( input ) {
			if ( ! input || ! input.name || input.value instanceof File ) {
				return;
			}

			// Checkboxes and multi-selects arrive once per checked value, and
			// under a `name[]` key that nobody would type into a URL.
			var name = input.name.replace( /\[\]$/, '' );

			map[ name ] = Object.prototype.hasOwnProperty.call( map, name )
				? map[ name ] + ', ' + input.value
				: String( input.value );
		} );

		return map;
	}

	/**
	 * Swap `[field-name]` for what was submitted.
	 *
	 * A name that was not submitted — a conditional field that stayed hidden, or
	 * simply a typo — resolves to nothing rather than leaving `[field]` sitting
	 * in the address bar.
	 *
	 * `encode` is on when filling into the address itself, where a value holding
	 * `#`, `?`, `&` or `/` would otherwise stop being a value and start being
	 * part of the URL's structure. Parameters skip it because searchParams
	 * encodes them on the way in, and doing both would double-encode.
	 */
	function fill( text, values, encode ) {
		return String( text ).replace( /\[([A-Za-z0-9_-]+)\]/g, function ( whole, name ) {
			var value = Object.prototype.hasOwnProperty.call( values, name ) ? values[ name ] : '';
			return encode ? encodeURIComponent( value ) : value;
		} );
	}

	/**
	 * The finished address, or '' if it is not one we should send anybody to.
	 *
	 * Built through the URL API so every substituted value is encoded properly
	 * wherever it landed, and so a relative address resolves against this page.
	 */
	function destination( marker, values ) {
		var raw = fill( marker.value || '', values, true );
		if ( ! raw ) {
			return '';
		}

		var url;
		try {
			url = new URL( raw, window.location.href );
		} catch ( e ) {
			return '';
		}

		// The marker is markup, and markup can be edited. Nothing but a real page
		// address gets navigated to.
		if ( 'http:' !== url.protocol && 'https:' !== url.protocol ) {
			return '';
		}

		params( marker ).forEach( function ( param ) {
			if ( param && param.key ) {
				url.searchParams.set( param.key, fill( param.value || '', values, false ) );
			}
		} );

		return url.href;
	}

	function params( marker ) {
		try {
			var list = JSON.parse( marker.dataset.params || '[]' );
			return Array.isArray( list ) ? list : [];
		} catch ( e ) {
			return [];
		}
	}

	document.addEventListener( 'wpcf7mailsent', function ( e ) {
		var form = e.target;
		var marker = form ? form.querySelector( '.cf7nl-redirect' ) : null;

		if ( ! marker ) {
			return;
		}

		var url = destination( marker, submitted( e.detail ) );
		if ( ! url ) {
			return;
		}

		var go = function () {
			if ( 'blank' === marker.dataset.target ) {
				// Popup blockers only allow this because it follows a user submit.
				window.open( url, '_blank', 'noopener' );
				return;
			}
			if ( 'replace' === marker.dataset.method ) {
				// Leaves no history entry, so Back can't return to the sent form.
				window.location.replace( url );
				return;
			}
			window.location.assign( url );
		};

		var delay = parseInt( marker.dataset.delay || '0', 10 );

		if ( delay > 0 ) {
			window.setTimeout( go, delay * 1000 );
		} else {
			go();
		}
	} );
} )();
