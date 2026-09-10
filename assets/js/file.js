/**
 * Defer Forms — file drop zone.
 *
 * Same contract as the select widget: the real <input type="file"> stays in the
 * DOM and remains what the browser submits. We only hide it, and every drop or
 * removal is written back through a DataTransfer so `input.files` is always the
 * single source of truth. Without this script the visitor still gets a working
 * native file input.
 *
 * Limits come from the markup (`accept`, `data-limit`, `data-maxfiles`) so the
 * browser refuses the same files the server would.
 */
( function () {
	'use strict';

	var l10n = window.deferformsFileL10n || {};
	var TEXT = {
		drop:     l10n.drop     || 'Drag files here or click to browse',
		dropOne:  l10n.dropOne  || 'Drag a file here or click to browse',
		remove:   l10n.remove   || 'Remove',
		tooMany:  l10n.tooMany  || 'You can upload at most %d files.',
		tooBig:   l10n.tooBig   || '%s is larger than the %s limit.',
		badType:  l10n.badType  || '%s is not an accepted file type.',
		duplicate: l10n.duplicate || '%s was already added.'
	};

	/** Fills `%s` / `%d` in a translated string, in order, from the extra arguments. */
	function sprintf( template ) {
		var values = Array.prototype.slice.call( arguments, 1 );
		var next = 0;
		return template.replace( /%[ds]/g, function () { return values[ next++ ]; } );
	}

	function formatSize( bytes ) {
		if ( bytes >= 1048576 ) {
			return ( bytes / 1048576 ).toFixed( bytes >= 10485760 ? 0 : 1 ) + ' MB';
		}
		if ( bytes >= 1024 ) {
			return Math.round( bytes / 1024 ) + ' KB';
		}
		return bytes + ' B';
	}

	// Dropping a file anywhere but a zone makes the browser navigate away from
	// the page, losing whatever was typed. One listener guards the document for
	// all zones, rather than one per file field.
	var dropZones = [];

	[ 'dragover', 'drop' ].forEach( function ( name ) {
		document.addEventListener( name, function ( e ) {
			// Pruned first: CF7 replaces the form on an AJAX submit and fires
			// wpcf7init again, so the list would otherwise keep every zone the page
			// has ever had and test detached nodes on every drag event.
			dropZones = dropZones.filter( function ( zone ) { return zone.isConnected; } );

			var inZone = dropZones.some( function ( zone ) { return zone.contains( e.target ); } );
			if ( ! inZone ) {
				e.preventDefault();
			}
		} );
	} );

	var el = window.deferforms.el;

	/** Does the file satisfy the input's `accept` list? */
	function accepted( file, accept ) {
		if ( ! accept ) {
			return true;
		}
		var name = file.name.toLowerCase();
		var type = ( file.type || '' ).toLowerCase();

		return accept.split( ',' ).some( function ( rule ) {
			rule = rule.trim().toLowerCase();
			if ( ! rule ) {
				return false;
			}
			if ( '.' === rule.charAt( 0 ) ) {
				return name.slice( -rule.length ) === rule;
			}
			if ( rule.slice( -2 ) === '/*' ) {
				return type.indexOf( rule.slice( 0, -1 ) ) === 0;
			}
			return type === rule;
		} );
	}

	function setup( input ) {
		if ( input.dataset.deferformsFile ) {
			return;
		}
		input.dataset.deferformsFile = '1';

		var multiple = input.multiple;
		var accept   = input.getAttribute( 'accept' ) || '';
		var limit    = parseInt( input.dataset.limit || '0', 10 );
		var maxFiles = parseInt( input.dataset.maxfiles || '0', 10 );

		var wrap = el( 'div', 'deferforms-file' );
		input.parentNode.insertBefore( wrap, input );
		wrap.appendChild( input );
		input.classList.add( 'deferforms-file-native' );

		var zone = el( 'div', 'deferforms-file-zone' );
		zone.setAttribute( 'role', 'button' );
		zone.setAttribute( 'tabindex', '0' );
		zone.appendChild( el( 'span', 'deferforms-file-icon' ) );
		zone.appendChild( el( 'span', 'deferforms-file-text', multiple ? TEXT.drop : TEXT.dropOne ) );

		var hint = [];
		if ( accept ) {
			hint.push( accept.replace( /\./g, '' ).replace( /,/g, ', ' ) );
		}
		if ( limit > 0 ) {
			hint.push( formatSize( limit ) );
		}
		if ( multiple && maxFiles > 0 ) {
			hint.push( sprintf( TEXT.tooMany, maxFiles ) );
		}
		if ( hint.length ) {
			zone.appendChild( el( 'span', 'deferforms-file-hint', hint.join( ' · ' ) ) );
		}
		wrap.appendChild( zone );

		var list   = el( 'ul', 'deferforms-file-list' );
		var errors = el( 'div', 'deferforms-file-errors' );
		wrap.appendChild( list );
		wrap.appendChild( errors );

		// The picked files live here; input.files is rebuilt from it every time.
		var chosen = [];

		function syncInput() {
			var data = new DataTransfer();
			chosen.forEach( function ( file ) { data.items.add( file ); } );
			input.files = data.files;
			input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		}

		function showErrors( messages ) {
			errors.innerHTML = '';
			messages.forEach( function ( message ) {
				errors.appendChild( el( 'p', 'deferforms-file-error', message ) );
			} );
		}

		function renderList() {
			list.innerHTML = '';

			chosen.forEach( function ( file, index ) {
				var item = el( 'li', 'deferforms-file-item' );

				if ( file.type.indexOf( 'image/' ) === 0 ) {
					var thumb = el( 'img', 'deferforms-file-thumb' );
					thumb.alt = '';
					thumb.src = URL.createObjectURL( file );
					thumb.addEventListener( 'load', function () { URL.revokeObjectURL( thumb.src ); } );
					item.appendChild( thumb );
				} else {
					item.appendChild( el( 'span', 'deferforms-file-thumb deferforms-file-thumb--doc' ) );
				}

				var meta = el( 'span', 'deferforms-file-meta' );
				meta.appendChild( el( 'span', 'deferforms-file-name', file.name ) );
				meta.appendChild( el( 'span', 'deferforms-file-size', formatSize( file.size ) ) );
				item.appendChild( meta );

				var remove = el( 'button', 'deferforms-file-remove', '×' );
				remove.type = 'button';
				remove.setAttribute( 'aria-label', TEXT.remove + ': ' + file.name );
				remove.addEventListener( 'click', function () {
					chosen.splice( index, 1 );
					renderList();
					syncInput();
					showErrors( [] );
				} );
				item.appendChild( remove );

				list.appendChild( item );
			} );

			wrap.classList.toggle( 'has-files', chosen.length > 0 );
		}

		function add( files ) {
			var problems = [];
			var kept = [];
			var next = multiple ? chosen.slice() : [];

			Array.prototype.forEach.call( files, function ( file ) {
				if ( ! accepted( file, accept ) ) {
					problems.push( sprintf( TEXT.badType, file.name ) );
					return;
				}
				if ( limit > 0 && file.size > limit ) {
					problems.push( sprintf( TEXT.tooBig, file.name, formatSize( limit ) ) );
					return;
				}
				var clash = next.some( function ( have ) {
					return have.name === file.name && have.size === file.size;
				} );
				if ( clash ) {
					problems.push( sprintf( TEXT.duplicate, file.name ) );
					return;
				}
				if ( multiple && maxFiles > 0 && next.length >= maxFiles ) {
					problems.push( sprintf( TEXT.tooMany, maxFiles ) );
					return;
				}
				next.push( file );
				kept.push( file );
			} );

			// A single-file field only gives up what it is holding once something
			// has arrived to take its place. Replacing unconditionally meant a
			// rejected pick — wrong type, too big — silently threw away the good
			// file the visitor had already chosen, leaving an error and no file.
			if ( multiple ) {
				chosen = next;
			} else if ( kept.length ) {
				chosen = kept.slice( -1 );
			}

			showErrors( problems );
			renderList();
			syncInput();
		}

		zone.addEventListener( 'click', function () { input.click(); } );
		zone.addEventListener( 'keydown', function ( e ) {
			if ( 'Enter' === e.key || ' ' === e.key ) {
				e.preventDefault();
				input.click();
			}
		} );

		[ 'dragenter', 'dragover' ].forEach( function ( name ) {
			zone.addEventListener( name, function ( e ) {
				e.preventDefault();
				zone.classList.add( 'is-dragging' );
			} );
		} );

		[ 'dragleave', 'dragend', 'drop' ].forEach( function ( name ) {
			zone.addEventListener( name, function () { zone.classList.remove( 'is-dragging' ); } );
		} );

		zone.addEventListener( 'drop', function ( e ) {
			e.preventDefault();
			if ( e.dataTransfer && e.dataTransfer.files.length ) {
				add( e.dataTransfer.files );
			}
		} );

		// Picking through the native dialog goes through the same path.
		input.addEventListener( 'change', function ( e ) {
			if ( e.isTrusted ) {
				add( input.files );
			}
		} );

		dropZones.push( zone );

		// The list is drawn from `chosen`, not from input.files, so emptying the
		// form left every thumbnail on screen over an input holding nothing —
		// files the visitor could see attached and that would never be sent.
		if ( input.form ) {
			window.deferforms.onReset( input.form, function () {
				chosen = [];
				showErrors( [] );
				renderList();
			} );
		}

		renderList();
	}

	window.deferforms.forms( function ( form ) {
		form.querySelectorAll( 'input[type="file"]' ).forEach( setup );
	} );
} )();
