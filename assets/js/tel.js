/**
 * Defer Forms — phone fields.
 *
 * Two jobs, both on the real <input type="tel"> rather than a replacement:
 *  - keep everything but digits out of it, letters included;
 *  - lay those digits into a format as they are typed.
 *
 * The format travels from the builder as a marker class, base64url-encoded so a
 * pattern like `(###) ###-####` survives being a CSS class. `#` is a digit slot;
 * every other character is punctuation the field fills in by itself.
 *
 * Settings are read off the control, so a form rendered without the builder — or
 * with the module switched off — is left exactly as CF7 wrote it.
 */
( function () {
	'use strict';

	var DIGITS = 'df7-tel';
	var FORMAT = 'df7-telfmt-';

	function digitsOnly( value ) {
		return String( value ).replace( /\D+/g, '' );
	}

	/** The format this control was given, or '' for none. */
	function formatOf( input ) {
		var found = '';

		Array.prototype.forEach.call( input.classList, function ( name ) {
			if ( 0 !== name.indexOf( FORMAT ) ) {
				return;
			}
			// base64url on the way in, because `+` and `/` are not class-safe.
			// The `=` padding was dropped for the same reason; atob accepts it
			// missing, so there is nothing to put back.
			var token = name.slice( FORMAT.length ).replace( /-/g, '+' ).replace( /_/g, '/' );
			try {
				found = window.atob( token );
			} catch ( e ) {
				// A hand-edited class is not worth breaking the field over.
				found = '';
			}
		} );

		return found;
	}

	/**
	 * Lay digits into the pattern, stopping at whatever runs out first.
	 *
	 * Trailing punctuation is left off until the digit after it arrives —
	 * otherwise the caret sits after a dangling "(" or "-" the moment the field
	 * is touched.
	 */
	function applyFormat( digits, pattern ) {
		var out = '';
		var digitIndex = 0;

		for ( var i = 0; i < pattern.length && digitIndex < digits.length; i++ ) {
			if ( '#' === pattern.charAt( i ) ) {
				out += digits.charAt( digitIndex );
				digitIndex++;
			} else {
				out += pattern.charAt( i );
			}
		}

		return out;
	}

	/**
	 * Reformat the field, keeping the caret where the visitor left it.
	 *
	 * Position is tracked by how many digits sit before the caret rather than by
	 * character offset: inserting punctuation shifts every offset after it, so a
	 * plain restore drags the caret backwards a character on every keystroke.
	 */
	function reformat( input ) {
		var pattern = formatOf( input );
		var start = input.selectionStart;
		var before = null === start ? null : digitsOnly( input.value.slice( 0, start ) ).length;

		// applyFormat stops when the pattern runs out, so a pattern is its own
		// length limit — anything typed past it simply never lands.
		var digits = digitsOnly( input.value );
		var next = pattern ? applyFormat( digits, pattern ) : digits;
		if ( next === input.value ) {
			return;
		}

		input.value = next;

		if ( null === before ) {
			return;
		}

		// Walk forward until that many digits have gone by.
		var seen = 0;
		var caret = next.length;
		for ( var i = 0; i < next.length; i++ ) {
			if ( seen >= before ) {
				caret = i;
				break;
			}
			if ( /\d/.test( next.charAt( i ) ) ) {
				seen++;
			}
		}

		try {
			input.setSelectionRange( caret, caret );
		} catch ( e ) {
			// Some browsers refuse setSelectionRange on type="tel"; harmless.
		}
	}

	function isOurs( input ) {
		return input.classList.contains( DIGITS ) || '' !== formatOf( input );
	}

	// Delegated, so fields that arrive later — a conditional group opening, a
	// CF7 form replaced after an AJAX submit — need no second pass.
	document.addEventListener( 'input', function ( e ) {
		var input = e.target;
		if ( input && 'tel' === input.type && isOurs( input ) ) {
			reformat( input );
		}
	} );

	// A field can be pre-filled from the URL or restored by the browser, so the
	// first render has to be formatted too.
	function init() {
		document.querySelectorAll( 'input[type="tel"]' ).forEach( function ( input ) {
			if ( isOurs( input ) && '' !== input.value ) {
				reformat( input );
			}
		} );
	}

	// ready(), not forms(): isOurs() already limits this to fields carrying our
	// marker class, so the scan stays document-wide rather than per-form.
	window.df7.ready( init );
} )();
