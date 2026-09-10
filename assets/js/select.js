/**
 * Defer Forms — select widget.
 *
 * Progressive enhancement: the real <select> never leaves the DOM. It is only
 * moved out of sight, and every interaction writes back to it and fires a
 * `change` event — so CF7 validation, mail, and our conditional logic keep
 * reading the same source of truth. If this script fails to load, the visitor
 * simply gets the native control.
 *
 * A `deferforms-search` marker class on the select turns on the filter box.
 */
( function () {
	'use strict';

	var l10n = window.deferformsSelectL10n || {};
	var TEXT = {
		one:    l10n.placeholder      || 'Select…',
		many:   l10n.placeholderMulti || 'Select options…',
		search: l10n.search           || 'Search…',
		empty:  l10n.noResults        || 'No matches',
		clear:  l10n.clear            || 'Clear',
		remove: l10n.remove           || 'Remove'
	};

	// Every enhanced dropdown registers here so one document listener can close
	// whichever of them the click fell outside.
	var openWidgets = [];

	document.addEventListener( 'mousedown', function ( e ) {
		// CF7 replaces the whole form on an AJAX submit and fires wpcf7init again,
		// so without this the list keeps every widget the page has ever had and
		// closes detached nodes on every click for the rest of the visit.
		openWidgets = openWidgets.filter( function ( widget ) {
			return widget.wrap.isConnected;
		} );

		openWidgets.forEach( function ( widget ) {
			if ( ! widget.wrap.contains( e.target ) ) {
				widget.close();
			}
		} );
	} );

	var el = window.deferforms.el;

	function enhance( select ) {
		if ( select.dataset.deferformsSelect || select.disabled ) {
			return;
		}
		select.dataset.deferformsSelect = '1';

		var multiple   = select.multiple;
		var searchable = select.classList.contains( 'deferforms-search' );
		var options    = Array.prototype.slice.call( select.options );

		// The blank option doubles as the placeholder label when it has text.
		var blank = options.filter( function ( option ) { return '' === option.value; } )[ 0 ];
		var placeholder = ( blank && blank.textContent.trim() ) || ( multiple ? TEXT.many : TEXT.one );

		var wrap = el( 'div', 'deferforms-select' + ( multiple ? ' deferforms-select--multiple' : '' ) );
		select.parentNode.insertBefore( wrap, select );
		wrap.appendChild( select );
		select.classList.add( 'deferforms-select-native' );

		var trigger = el( 'button', 'deferforms-select-trigger' );
		trigger.type = 'button';
		trigger.setAttribute( 'aria-haspopup', 'listbox' );
		trigger.setAttribute( 'aria-expanded', 'false' );

		// The caption, not the control. This pointed at `select.id` — the id of the
		// <select> itself — so the trigger borrowed the select's own accessible
		// name, which is usually nothing at all. The wording lives in the <label>
		// or <legend> wrapping it, and that is what a screen reader should read.
		var caption = select.closest( 'fieldset' )
			? select.closest( 'fieldset' ).querySelector( 'legend' )
			: select.closest( 'label' );

		if ( caption ) {
			trigger.setAttribute( 'aria-label', ( caption.textContent || '' ).trim() );
		}

		var value = el( 'span', 'deferforms-select-value' );
		trigger.appendChild( value );
		trigger.appendChild( el( 'span', 'deferforms-select-arrow' ) );
		wrap.appendChild( trigger );

		var panel = el( 'div', 'deferforms-select-panel' );
		panel.hidden = true;
		wrap.appendChild( panel );

		var search = null;
		if ( searchable ) {
			search = el( 'input', 'deferforms-select-search' );
			search.type = 'text';
			search.placeholder = TEXT.search;
			search.setAttribute( 'aria-label', TEXT.search );
			panel.appendChild( search );
		}

		var list = el( 'div', 'deferforms-select-list' );
		list.setAttribute( 'role', 'listbox' );
		if ( multiple ) {
			list.setAttribute( 'aria-multiselectable', 'true' );
		}
		panel.appendChild( list );

		var empty = el( 'div', 'deferforms-select-empty', TEXT.empty );
		empty.hidden = true;
		panel.appendChild( empty );

		// One row per real <option>, kept in the same order.
		var rows = options.map( function ( option ) {
			var row = el( 'div', 'deferforms-select-option', option.textContent );
			row.setAttribute( 'role', 'option' );
			row.dataset.value = option.value;
			if ( option.disabled ) {
				row.classList.add( 'is-disabled' );
			}
			row.addEventListener( 'mousedown', function ( e ) {
				e.preventDefault(); // Keep focus where it is.
				if ( option.disabled ) {
					return;
				}
				pick( option );
			} );
			list.appendChild( row );
			return { row: row, option: option };
		} );

		var active = -1;

		function selected() {
			return options.filter( function ( option ) { return option.selected && '' !== option.value; } );
		}

		function commit() {
			select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
			select.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		}

		function pick( option ) {
			if ( multiple ) {
				option.selected = ! option.selected;
			} else {
				options.forEach( function ( other ) { other.selected = false; } );
				option.selected = true;
				close();
			}
			render();
			commit();
		}

		function render() {
			var chosen = selected();

			value.innerHTML = '';
			if ( ! chosen.length ) {
				value.appendChild( el( 'span', 'deferforms-select-placeholder', placeholder ) );
			} else if ( ! multiple ) {
				value.appendChild( document.createTextNode( chosen[ 0 ].textContent ) );
			} else {
				chosen.forEach( function ( option ) {
					var chip = el( 'span', 'deferforms-select-chip', option.textContent );
					var remove = el( 'button', 'deferforms-select-chip-remove', '×' );
					remove.type = 'button';
					remove.setAttribute( 'aria-label', TEXT.remove + ': ' + option.textContent );
					remove.addEventListener( 'click', function ( e ) {
						e.stopPropagation();
						option.selected = false;
						render();
						commit();
					} );
					chip.appendChild( remove );
					value.appendChild( chip );
				} );
			}

			rows.forEach( function ( item ) {
				var isSelected = item.option.selected && '' !== item.option.value;
				item.row.classList.toggle( 'is-selected', isSelected );
				item.row.setAttribute( 'aria-selected', isSelected ? 'true' : 'false' );
			} );
		}

		function visibleRows() {
			return rows.filter( function ( item ) {
				return ! item.row.hidden && ! item.option.disabled;
			} );
		}

		function filter( query ) {
			var needle = ( query || '' ).trim().toLowerCase();
			var shown = 0;

			rows.forEach( function ( item ) {
				var hit = '' === needle || item.option.textContent.toLowerCase().indexOf( needle ) > -1;
				item.row.hidden = ! hit;
				if ( hit ) {
					shown += 1;
				}
			} );

			empty.hidden = shown > 0;
			setActive( -1 );
		}

		function setActive( index ) {
			var visible = visibleRows();
			rows.forEach( function ( item ) { item.row.classList.remove( 'is-active' ); } );
			active = index;
			if ( index < 0 || index >= visible.length ) {
				return;
			}
			var row = visible[ index ].row;
			row.classList.add( 'is-active' );
			row.scrollIntoView( { block: 'nearest' } );
		}

		function move( step ) {
			var count = visibleRows().length;
			if ( ! count ) {
				return;
			}
			setActive( ( active + step + count ) % count );
		}

		function open() {
			if ( ! panel.hidden ) {
				return;
			}
			panel.hidden = false;
			wrap.classList.add( 'is-open' );
			trigger.setAttribute( 'aria-expanded', 'true' );
			if ( search ) {
				search.value = '';
				filter( '' );
				search.focus();
			} else {
				filter( '' );
			}
		}

		function close() {
			if ( panel.hidden ) {
				return;
			}
			panel.hidden = true;
			wrap.classList.remove( 'is-open' );
			trigger.setAttribute( 'aria-expanded', 'false' );
			setActive( -1 );
		}

		function toggle() {
			if ( panel.hidden ) {
				open();
			} else {
				close();
			}
		}

		trigger.addEventListener( 'click', toggle );

		trigger.addEventListener( 'keydown', function ( e ) {
			if ( 'ArrowDown' === e.key || 'ArrowUp' === e.key || 'Enter' === e.key || ' ' === e.key ) {
				e.preventDefault();
				open();
				move( 'ArrowUp' === e.key ? -1 : 1 );
			}
		} );

		panel.addEventListener( 'keydown', onPanelKey );
		if ( search ) {
			search.addEventListener( 'input', function () { filter( search.value ); } );
		}

		function onPanelKey( e ) {
			if ( 'ArrowDown' === e.key ) {
				e.preventDefault();
				move( 1 );
			} else if ( 'ArrowUp' === e.key ) {
				e.preventDefault();
				move( -1 );
			} else if ( 'Enter' === e.key ) {
				e.preventDefault();
				var current = visibleRows()[ active ];
				if ( current ) {
					pick( current.option );
				}
			} else if ( 'Escape' === e.key ) {
				e.preventDefault();
				close();
				trigger.focus();
			} else if ( 'Tab' === e.key ) {
				close();
			}
		}

		// Closing on an outside click is handled by one shared listener rather
		// than one per widget — a page of twenty dropdowns would otherwise hang
		// twenty listeners off the document, all firing on every click.
		openWidgets.push( { wrap: wrap, close: close } );

		// A <label for="…"> still points at the native select; send that focus on.
		select.addEventListener( 'focus', function () { trigger.focus(); } );

		// Something else (pre-fill, conditional logic) may change the select —
		// mirror it rather than fight it.
		select.addEventListener( 'change', function ( e ) {
			if ( ! e.isTrusted ) {
				render();
			}
		} );

		// A reset does not come through above: it dispatches no event of any
		// kind, so the widget went on naming a country the select no longer held.
		if ( select.form ) {
			window.deferforms.onReset( select.form, render );
		}

		render();
	}

	window.deferforms.forms( function ( form ) {
		form.querySelectorAll( 'select' ).forEach( enhance );
	} );
} )();
