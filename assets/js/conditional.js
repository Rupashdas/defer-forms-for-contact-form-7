/**
 * Conditional fields. Each `.cf7e-if` block carries a `data-action` (show|hide)
 * and a base64-encoded JSON rule set in `data-groups`. Groups are OR'd; the rules
 * inside a group are AND'd — so the model expresses (A and B) or (C and D).
 * Hidden fields are disabled so they don't submit or block validation.
 */
( function () {
	'use strict';

	function decodeGroups( raw ) {
		if ( ! raw ) {
			return [];
		}
		try {
			var json = decodeURIComponent(
				atob( raw )
					.split( '' )
					.map( function ( character ) {
						return '%' + ( '00' + character.charCodeAt( 0 ).toString( 16 ) ).slice( -2 );
					} )
					.join( '' )
			);
			var data = JSON.parse( json );
			return Array.isArray( data ) ? data : [];
		} catch ( e ) {
			return [];
		}
	}

	function fieldValues( form, name ) {
		// Escaped the way validate.js escapes it. The rule set is base64 inside a
		// template anyone with the CF7 editor can hand-edit, so a quote or bracket
		// in a field name reaches this selector — and an unescaped one throws a
		// SyntaxError that stops conditional logic for the entire form, silently.
		var safe = ( window.CSS && CSS.escape ) ? CSS.escape( String( name ) ) : String( name );
		var nodes;

		try {
			nodes = form.querySelectorAll( '[name="' + safe + '"], [name="' + safe + '[]"]' );
		} catch ( e ) {
			return [];
		}

		var values = [];
		nodes.forEach( function ( control ) {
			var type = ( control.type || '' ).toLowerCase();
			if ( 'radio' === type || 'checkbox' === type ) {
				if ( control.checked ) {
					values.push( control.value );
				}
			} else if ( control.multiple && control.selectedOptions ) {
				// A multi-select's `value` is only its first pick.
				Array.prototype.forEach.call( control.selectedOptions, function ( option ) {
					values.push( option.value );
				} );
			} else {
				values.push( control.value );
			}
		} );
		return values;
	}

	function nonEmpty( values ) {
		return values.filter( function ( value ) {
			return '' !== String( value ).trim();
		} );
	}

	function testRule( form, rule ) {
		var values = fieldValues( form, rule.field );
		var target = String( rule.value );

		switch ( rule.operator ) {
			case 'empty':
				return 0 === nonEmpty( values ).length;
			case 'notempty':
				return nonEmpty( values ).length > 0;
			case 'neq':
				return ! values.some( function ( value ) {
					return String( value ) === target;
				} );
			case 'gt':
			case 'lt':
			case 'gte':
			case 'lte': {
				var actual = parseFloat( values[ 0 ] );
				var wanted = parseFloat( target );
				if ( isNaN( actual ) || isNaN( wanted ) ) {
					return false;
				}
				if ( 'gt' === rule.operator ) {
					return actual > wanted;
				}
				if ( 'lt' === rule.operator ) {
					return actual < wanted;
				}
				if ( 'gte' === rule.operator ) {
					return actual >= wanted;
				}
				return actual <= wanted;
			}
			case 'eq':
			default:
				return values.some( function ( value ) {
					return String( value ) === target;
				} );
		}
	}

	function matches( form, groups ) {
		return groups.some( function ( group ) {
			var rules = ( group && group.rules ) || [];
			if ( ! rules.length ) {
				return false;
			}
			return rules.every( function ( rule ) {
				return testRule( form, rule );
			} );
		} );
	}

	function apply( form, block ) {
		var groups  = decodeGroups( block.getAttribute( 'data-groups' ) );
		var isHide  = 'hide' === block.getAttribute( 'data-action' );
		var ok      = matches( form, groups );
		var visible = isHide ? ! ok : ok;

		block.style.display = visible ? '' : 'none';
		block.querySelectorAll( 'input, select, textarea' ).forEach( function ( control ) {
			control.disabled = ! visible;
		} );
		return visible;
	}

	function hiddenInputFor( form ) {
		var input = form.querySelector( 'input[name="_cf7e_hidden"]' );
		if ( ! input ) {
			input = document.createElement( 'input' );
			input.type = 'hidden';
			input.name = '_cf7e_hidden';
			form.appendChild( input );
		}
		return input;
	}

	function init( form ) {
		var blocks = form.querySelectorAll( '.cf7e-if' );
		if ( ! blocks.length || form.dataset.cf7eConditional ) {
			return;
		}
		form.dataset.cf7eConditional = '1';

		var carrier = hiddenInputFor( form );
		var run = function () {
			var names = [];
			blocks.forEach( function ( block ) {
				if ( apply( form, block ) ) {
					return;
				}
				block.querySelectorAll( '[name]' ).forEach( function ( control ) {
					var fieldName = ( control.name || '' ).replace( /\[\]$/, '' );
					if ( fieldName && names.indexOf( fieldName ) < 0 ) {
						names.push( fieldName );
					}
				} );
			} );
			carrier.value = JSON.stringify( names );
		};
		form.addEventListener( 'change', run );
		form.addEventListener( 'input', run );
		// A reset dispatches neither of those, so a region stayed open on a rule
		// that no longer held — and the field inside it stayed enabled and
		// required, with the server still told it was hidden.
		window.cf7e.onReset( form, run );
		run();
	}

	window.cf7e.forms( init );
} )();
