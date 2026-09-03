import { createRoot, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __, _n, sprintf } from '@wordpress/i18n';
import { FileText, Search, Plus, Pencil, Inbox, PencilRuler, Settings, Eye, Loader2, Trash2, Palette, ArrowDownUp, Download, Upload } from 'lucide-react';

import { Page, PageHeader } from '@shared/components/page';
import { Modal, btnPrimary, btnGhost, btnDanger, control, focusRing, Shimmer } from '@shared/components/ui';
import { ShortcodeBox } from '@shared/components/shortcode';
import '@shared/styles/admin.css';

const builderUrl = ( id ) => `admin.php?page=df7-builder&form=${ id }`;
const previewUrl = ( id ) => `${ builderUrl( id ) }&tab=preview`;
const editUrl    = ( id ) => `admin.php?page=wpcf7&post=${ id }&action=edit`;

/**
 * What went wrong, in words rather than a code.
 *
 * The REST layer answers with a WP_Error, so `err.message` is already a
 * translated sentence and is what everything else in this admin shows. These
 * two maps stay because the slug lets a screen say something the route cannot:
 * the server knows the capability check failed, but "you do not have permission
 * to delete this form" is a sentence only the delete button is in a position to
 * write.
 */
const createError = ( err ) => {
	const known = {
		cf7_missing:    __( 'Contact Form 7 is not active.', 'defer-forms-for-contact-form-7' ),
		forbidden:      __( 'You do not have permission to create forms.', 'defer-forms-for-contact-form-7' ),
		title_required: __( 'Give the form a name.', 'defer-forms-for-contact-form-7' ),
		title_too_long: __( 'That name is too long.', 'defer-forms-for-contact-form-7' ),
		save_failed:    __( 'The form could not be saved. Please try again.', 'defer-forms-for-contact-form-7' ),
	};

	return known[ err && err.code ] || ( err && err.message ) || __( 'Something went wrong.', 'defer-forms-for-contact-form-7' );
};

const deleteError = ( err ) => {
	const known = {
		cf7_missing:   __( 'Contact Form 7 is not active.', 'defer-forms-for-contact-form-7' ),
		forbidden:     __( 'You do not have permission to delete this form.', 'defer-forms-for-contact-form-7' ),
		not_found:     __( 'That form no longer exists.', 'defer-forms-for-contact-form-7' ),
		delete_failed: __( 'The form could not be deleted. Please try again.', 'defer-forms-for-contact-form-7' ),
	};

	return known[ err && err.code ] || ( err && err.message ) || __( 'Something went wrong.', 'defer-forms-for-contact-form-7' );
};

/**
 * Name a form, then go straight to its builder.
 *
 * Contact Form 7's own New Form screen is never opened: the form is created
 * through our REST route, which calls CF7's `wpcf7_save_contact_form()` so the
 * result is exactly the form that screen would have produced.
 */
const NewFormDialog = ( { onClose } ) => {
	const [ name, setName ]   = useState( '' );
	const [ busy, setBusy ]   = useState( false );
	const [ error, setError ] = useState( null );

	const trimmed = name.trim();

	const create = () => {
		if ( ! trimmed || busy ) {
			return;
		}

		setBusy( true );
		setError( null );

		apiFetch( { path: 'df7/v1/forms', method: 'POST', data: { title: trimmed } } )
			.then( ( res ) => {
				// A full reload, not a router push: the builder is its own admin
				// page, and this is the same navigation the card's Builder link makes.
				window.location.href = res.builder_url || builderUrl( res.form_id );
			} )
			.catch( ( err ) => {
				setError( createError( err ) );
				setBusy( false );
			} );
	};

	return (
		<Modal
			title={ __( 'New form', 'defer-forms-for-contact-form-7' ) }
			busy={ busy }
			onClose={ onClose }
			footer={
				<>
					<span className="df7-flex-1" />
					<button type="button" className={ btnGhost } onClick={ onClose } disabled={ busy }>
						{ __( 'Cancel', 'defer-forms-for-contact-form-7' ) }
					</button>
					<button type="button" className={ btnPrimary } onClick={ create } disabled={ busy || ! trimmed }>
						{ busy && <Loader2 className="df7-h-4 df7-w-4 df7-animate-spin" /> }
						{ busy ? __( 'Creating…', 'defer-forms-for-contact-form-7' ) : __( 'Create and open builder', 'defer-forms-for-contact-form-7' ) }
					</button>
				</>
			}
		>
			<div className="df7-flex df7-flex-col df7-gap-1.5">
				<label htmlFor="df7-new-form-name" className="df7-text-[14px] df7-font-semibold df7-text-ink">
					{ __( 'Form name', 'defer-forms-for-contact-form-7' ) }
				</label>
				<input
					id="df7-new-form-name"
					type="text"
					value={ name }
					disabled={ busy }
					maxLength={ 200 }
					onChange={ ( event ) => setName( event.target.value ) }
					onKeyDown={ ( event ) => 'Enter' === event.key && create() }
					placeholder={ __( 'Contact us', 'defer-forms-for-contact-form-7' ) }
					className={ `${ control } df7-w-full` }
				/>
				<span className="df7-text-[14px] df7-text-stone-400">
					{ __( 'You can rename it later. The form opens in the visual builder once created.', 'defer-forms-for-contact-form-7' ) }
				</span>

				{ error && (
					<div className="df7-mt-2 df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-3.5 df7-py-2.5 df7-text-sm df7-font-medium df7-text-red-700">
						{ error }
					</div>
				) }
			</div>
		</Modal>
	);
};

/**
 * Confirm deleting a form.
 *
 * The entry count is spelled out because the two things are separable and people
 * assume they are not: the form goes, the entries stay and remain exportable
 * from the Submissions page.
 */
/**
 * A form is text, so moving one to another site is a file.
 *
 * Both directions in one dialog because they are one job seen from two ends,
 * and because the export half is the answer to "what am I supposed to import?".
 */
const TransferDialog = ( { forms, onClose, onImported } ) => {
	const [ picked, setPicked ] = useState( () => forms.map( ( form ) => form.form_id ) );
	const [ busy, setBusy ]     = useState( false );
	const [ error, setError ]   = useState( null );
	const [ report, setReport ] = useState( null );

	const toggle = ( id ) =>
		setPicked( ( curr ) => ( curr.includes( id ) ? curr.filter( ( one ) => one !== id ) : [ ...curr, id ] ) );

	const download = () => {
		if ( busy || ! picked.length ) {
			return;
		}
		setBusy( true );
		setError( null );
		setReport( null );

		apiFetch( { path: 'df7/v1/forms/export', method: 'POST', data: { ids: picked } } )
			.then( ( bundle ) => {
				// The browser saves it; nothing is written on the server. An object
				// URL rather than a data: one, because a bundle of twenty forms is
				// bigger than a URL is allowed to be in some browsers.
				const url  = URL.createObjectURL( new Blob( [ JSON.stringify( bundle, null, '\t' ) ], { type: 'application/json' } ) );
				const link = document.createElement( 'a' );
				link.href     = url;
				link.download = `df7-forms-${ new Date().toISOString().slice( 0, 10 ) }.json`;
				document.body.appendChild( link );
				link.click();
				link.remove();
				URL.revokeObjectURL( url );
			} )
			.catch( ( err ) => setError( err.message || __( 'The export failed.', 'defer-forms-for-contact-form-7' ) ) )
			.finally( () => setBusy( false ) );
	};

	const upload = ( file ) => {
		if ( ! file || busy ) {
			return;
		}
		setBusy( true );
		setError( null );
		setReport( null );

		file.text()
			.then( ( text ) => {
				let bundle;
				// A file picked by hand is as likely to be the wrong file as a bad
				// one, and "Unexpected token < in JSON" is not what to tell somebody
				// who just chose a screenshot.
				try {
					bundle = JSON.parse( text );
				} catch ( e ) {
					throw new Error( __( 'That file is not JSON.', 'defer-forms-for-contact-form-7' ) );
				}
				return apiFetch( { path: 'df7/v1/forms/import', method: 'POST', data: { bundle } } );
			} )
			.then( ( res ) => {
				setReport( res );
				onImported();
			} )
			.catch( ( err ) => setError( err.message || __( 'The import failed.', 'defer-forms-for-contact-form-7' ) ) )
			.finally( () => setBusy( false ) );
	};

	return (
		<Modal
			title={ __( 'Import / Export', 'defer-forms-for-contact-form-7' ) }
			busy={ busy }
			onClose={ onClose }
			footer={
				<>
					<span className="df7-flex-1" />
					<button type="button" className={ btnGhost } onClick={ onClose } disabled={ busy }>
						{ __( 'Close', 'defer-forms-for-contact-form-7' ) }
					</button>
				</>
			}
		>
			<div className="df7-flex df7-flex-col df7-gap-6">
				{ error && (
					<div className="df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-4 df7-py-3 df7-text-sm df7-font-medium df7-text-red-700">
						{ error }
					</div>
				) }

				<section className="df7-flex df7-flex-col df7-gap-3">
					<h3 className="df7-m-0 df7-text-sm df7-font-semibold df7-text-ink">{ __( 'Export', 'defer-forms-for-contact-form-7' ) }</h3>
					<p className="df7-m-0 df7-text-[14px] df7-text-stone-500">
						{ __( 'Downloads the chosen forms as one JSON file — the template, the mail, the messages and the settings this plugin adds. Entries are not included.', 'defer-forms-for-contact-form-7' ) }
					</p>

					{ forms.length ? (
						<div className="df7-max-h-48 df7-overflow-y-auto df7-rounded-lg df7-border df7-border-line">
							{ forms.map( ( form ) => (
								<label
									key={ form.form_id }
									className="df7-flex df7-cursor-pointer df7-items-center df7-gap-2.5 df7-border-b df7-border-line df7-px-3.5 df7-py-2 df7-text-sm df7-text-ink last:df7-border-b-0 hover:df7-bg-stone-50/60"
								>
									<input
										type="checkbox"
										checked={ picked.includes( form.form_id ) }
										onChange={ () => toggle( form.form_id ) }
									/>
									<span className="df7-truncate">
										{ form.title || sprintf( /* translators: %d: form ID. */ __( 'Form #%d', 'defer-forms-for-contact-form-7' ), form.form_id ) }
									</span>
								</label>
							) ) }
						</div>
					) : (
						<p className="df7-m-0 df7-text-[14px] df7-text-stone-500">{ __( 'There is nothing to export yet.', 'defer-forms-for-contact-form-7' ) }</p>
					) }

					<div>
						<button type="button" className={ btnPrimary } onClick={ download } disabled={ busy || ! picked.length }>
							{ busy ? <Loader2 className="df7-h-4 df7-w-4 df7-animate-spin" /> : <Download className="df7-h-4 df7-w-4" /> }
							{ sprintf( /* translators: %d: number of forms. */ _n( 'Download %d form', 'Download %d forms', picked.length, 'defer-forms-for-contact-form-7' ), picked.length ) }
						</button>
					</div>
				</section>

				<section className="df7-flex df7-flex-col df7-gap-3 df7-border-t df7-border-line df7-pt-6">
					<h3 className="df7-m-0 df7-text-sm df7-font-semibold df7-text-ink">{ __( 'Import', 'defer-forms-for-contact-form-7' ) }</h3>
					<p className="df7-m-0 df7-text-[14px] df7-text-stone-500">
						{ __( 'Every form in the file is created as a new form. Nothing already here is overwritten, so importing the same file twice gives you two copies.', 'defer-forms-for-contact-form-7' ) }
					</p>

					<label className={ `${ btnGhost } df7-w-fit` }>
						<Upload className="df7-h-4 df7-w-4" />
						{ __( 'Choose a JSON file', 'defer-forms-for-contact-form-7' ) }
						<input
							type="file"
							accept="application/json,.json"
							className="df7-hidden"
							disabled={ busy }
							onChange={ ( event ) => {
								upload( event.target.files?.[ 0 ] );
								// Cleared so choosing the same file again still fires.
								event.target.value = '';
							} }
						/>
					</label>

					{ report && (
						<div className="df7-rounded-lg df7-border df7-border-line df7-bg-stone-50/60 df7-px-3.5 df7-py-2.5 df7-text-[14px] df7-text-stone-600">
							{ sprintf(
								/* translators: %d: number of forms created. */
								_n( '%d form imported.', '%d forms imported.', report.created.length, 'defer-forms-for-contact-form-7' ),
								report.created.length
							) }
							{ report.failed > 0 && ' ' + sprintf(
								/* translators: %d: number of forms that could not be created. */
								_n( '%d could not be created.', '%d could not be created.', report.failed, 'defer-forms-for-contact-form-7' ),
								report.failed
							) }
						</div>
					) }
				</section>
			</div>
		</Modal>
	);
};

const DeleteFormDialog = ( { form, onClose, onDeleted } ) => {
	const [ busy, setBusy ]   = useState( false );
	const [ error, setError ] = useState( null );

	const remove = () => {
		if ( busy ) {
			return;
		}
		setBusy( true );
		setError( null );

		apiFetch( { path: `df7/v1/forms/${ form.form_id }`, method: 'DELETE' } )
			.then( () => onDeleted( form.form_id ) )
			.catch( ( err ) => {
				setError( deleteError( err ) );
				setBusy( false );
			} );
	};

	const name = form.title || sprintf( /* translators: %d: form ID. */ __( 'Form #%d', 'defer-forms-for-contact-form-7' ), form.form_id );

	return (
		<Modal
			title={ __( 'Delete form', 'defer-forms-for-contact-form-7' ) }
			busy={ busy }
			onClose={ onClose }
			footer={
				<>
					<span className="df7-flex-1" />
					<button type="button" className={ btnGhost } onClick={ onClose } disabled={ busy }>
						{ __( 'Cancel', 'defer-forms-for-contact-form-7' ) }
					</button>
					<button type="button" className={ btnDanger } onClick={ remove } disabled={ busy }>
						{ busy ? <Loader2 className="df7-h-4 df7-w-4 df7-animate-spin" /> : <Trash2 className="df7-h-4 df7-w-4" /> }
						{ busy ? __( 'Deleting…', 'defer-forms-for-contact-form-7' ) : __( 'Delete form', 'defer-forms-for-contact-form-7' ) }
					</button>
				</>
			}
		>
			<div className="df7-flex df7-flex-col df7-gap-3">
				<p className="df7-m-0 df7-text-sm df7-text-ink">
					{ sprintf( /* translators: %s: form name. */ __( '“%s” will be deleted. Any page still using its shortcode will stop showing a form.', 'defer-forms-for-contact-form-7' ), name ) }
				</p>

				<p className="df7-m-0 df7-text-sm df7-text-stone-500">
					{ form.count > 0
						? sprintf(
							/* translators: %s: number of entries. */
							_n(
								'Its %s entry is kept and stays exportable from Submissions.',
								'Its %s entries are kept and stay exportable from Submissions.',
								form.count,
								'defer-forms-for-contact-form-7'
							),
							form.count.toLocaleString()
						)
						: __( 'It has no entries.', 'defer-forms-for-contact-form-7' ) }
				</p>

				<p className="df7-m-0 df7-text-sm df7-font-semibold df7-text-red-700">
					{ __( 'This cannot be undone.', 'defer-forms-for-contact-form-7' ) }
				</p>

				{ error && (
					<div className="df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-3.5 df7-py-2.5 df7-text-sm df7-font-medium df7-text-red-700">
						{ error }
					</div>
				) }
			</div>
		</Modal>
	);
};

/**
 * The shape of the form in one line: how much there is to fill in, and how much
 * of it the visitor cannot skip.
 *
 * Returns null when the counts are absent rather than zero — Contact Form 7
 * being inactive leaves them off the response entirely, and "0 fields" would be
 * a claim about the form rather than about what we could read.
 */
const fieldSummary = ( form ) => {
	if ( 'number' !== typeof form.fields ) {
		return null;
	}

	const fields = sprintf(
		/* translators: %s: number of fields. */
		_n( '%s field', '%s fields', form.fields, 'defer-forms-for-contact-form-7' ),
		form.fields.toLocaleString()
	);

	if ( ! form.required ) {
		return fields;
	}

	return sprintf(
		/* translators: 1: field count, already phrased, e.g. "8 fields". 2: number of required fields. */
		__( '%1$s · %2$s required', 'defer-forms-for-contact-form-7' ),
		fields,
		form.required.toLocaleString()
	);
};

const lastActivity = ( mysqlUtc ) => {
	if ( ! mysqlUtc ) {
		return null;
	}
	const date = new Date( mysqlUtc.replace( ' ', 'T' ) + 'Z' );
	const diff = Date.now() - date.getTime();
	const hour = 3600000;
	const day  = 86400000;
	const rtf  = new Intl.RelativeTimeFormat( undefined, { numeric: 'auto' } );

	if ( diff < hour ) {
		return rtf.format( -Math.round( diff / 60000 ), 'minute' );
	}
	if ( diff < day ) {
		return rtf.format( -Math.round( diff / hour ), 'hour' );
	}
	if ( diff < day * 30 ) {
		return rtf.format( -Math.round( diff / day ), 'day' );
	}
	return date.toLocaleDateString( undefined, { dateStyle: 'medium' } );
};

// `px-3` is the fix: these carried no horizontal padding at all, and four
// buttons across a 240px card left `flex-1` about 60px each — exactly what
// "Builder" and "Entries" measure — so the label sat flush against both edges
// with nothing to breathe into. `min-w-0` + `truncate` keep a long label inside
// its own button rather than spilling over the background.
const actionBtn =
	`df7-inline-flex df7-h-9 df7-min-w-0 df7-flex-1 df7-cursor-pointer df7-items-center df7-justify-center df7-gap-1.5 df7-truncate df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-px-3 df7-text-[14px] df7-font-semibold df7-text-ink df7-no-underline df7-transition-colors hover:df7-bg-stone-50`;

// The card's primary action. Same box as `actionBtn` down to the padding, so
// the two sit level when they share a row; only the fill differs.
const primaryBtn =
	`df7-inline-flex df7-h-9 df7-min-w-0 df7-flex-1 df7-cursor-pointer df7-items-center df7-justify-center df7-gap-1.5 df7-truncate df7-rounded-lg df7-border-0 df7-bg-ink df7-px-3 df7-text-[14px] df7-font-semibold df7-text-white df7-no-underline df7-transition hover:df7-opacity-90`;

// One click copies the whole shortcode. The Clipboard API needs a secure
// context, which a plain-http local site is not, so fall back to a scratch
// textarea + execCommand.
/**
 * The shortcode, and the same box with nothing in it yet.
 *
 * `loading` renders the shell rather than a separate skeleton copy of it: the
 * padding, border and the line inside are written once, so the box cannot be
 * one height before the fetch and another after.
 */
const FormCard = ( { form, onDelete } ) => {
	const last   = lastActivity( form.last_at );
	const fields = fieldSummary( form );

	return (
		<div className="df7-flex df7-h-full df7-flex-col df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-5 df7-transition-colors hover:df7-border-stroke">
			<div className="df7-mb-3 df7-flex df7-items-start df7-justify-between">
				<div className="df7-flex df7-h-11 df7-w-11 df7-items-center df7-justify-center df7-rounded-xl df7-bg-accent-50 df7-text-accent">
					<FileText className="df7-h-5 df7-w-5" />
				</div>
				{ /* Delete sits up here rather than in the action row below: that row
				     is already two buttons and an icon inside a 240px card, and a
				     fourth would squeeze "Entries" past its own text width. */ }
				<div className="df7-flex df7-items-center df7-gap-1">
					<span className="df7-text-[14px] df7-font-semibold df7-text-stone-400 df7-tnum">#{ form.form_id }</span>
					<button
						type="button"
						onClick={ onDelete }
						aria-label={ sprintf( /* translators: %s: form title. */ __( 'Delete %s', 'defer-forms-for-contact-form-7' ), form.title || `#${ form.form_id }` ) }
						title={ __( 'Delete form', 'defer-forms-for-contact-form-7' ) }
						className={ `df7-flex df7-h-7 df7-w-7 df7-shrink-0 df7-cursor-pointer df7-items-center df7-justify-center df7-rounded-lg df7-border-0 df7-bg-transparent df7-text-stone-400 df7-transition-colors hover:df7-bg-red-50 hover:df7-text-red-600` }
					>
						<Trash2 className="df7-h-3.5 df7-w-3.5" />
					</button>
				</div>
			</div>

			<h3 className="df7-m-0 df7-truncate df7-text-base df7-font-semibold df7-text-ink" title={ form.title }>
				{ form.title || sprintf( /* translators: %d: form ID. */ __( 'Form #%d', 'defer-forms-for-contact-form-7' ), form.form_id ) }
			</h3>

			{ fields && (
				<p className="df7-mb-0 df7-mt-1 df7-truncate df7-text-[14px] df7-text-stone-400">{ fields }</p>
			) }

			<div className="df7-mt-2 df7-flex df7-items-baseline df7-gap-2">
				<span className="df7-text-2xl df7-font-bold df7-text-ink df7-tnum">
					{ form.count.toLocaleString() }
				</span>
				<span className="df7-text-sm df7-text-stone-500">
					{ _n( 'entry', 'entries', form.count, 'defer-forms-for-contact-form-7' ) }
				</span>
			</div>
			<p className="df7-mb-0 df7-mt-1 df7-text-[14px] df7-text-stone-400">
				{ last
					? sprintf( /* translators: %s: relative time. */ __( 'Last entry %s', 'defer-forms-for-contact-form-7' ), last )
					: __( 'No entries yet', 'defer-forms-for-contact-form-7' ) }
			</p>

			<ShortcodeBox code={ form.shortcode } />

			{ /* Two rows on purpose. All four on one line gave each about 60px in a
			     240px card — the exact width of their own text, leaving no room for
			     padding. Measured at 240px: the primary action now has the line to
			     itself, and Edit / Entries get 94px each against 67 and 84 of
			     content. */ }
			<div className="df7-mt-4 df7-flex df7-flex-col df7-gap-2 df7-border-t df7-border-line df7-pt-4">
				{ /* Builder gives up half its line to Preview rather than the row
				     below taking a fourth button: at 240px that row is already
				     "Edit", "Entries" and a 36px icon, and there is nothing left
				     to give. Two words at ~96px each fit here with room over. */ }
				<div className="df7-flex df7-gap-2">
					<a href={ builderUrl( form.form_id ) } className={ primaryBtn }>
						<PencilRuler className="df7-h-3.5 df7-w-3.5 df7-shrink-0" />
						{ __( 'Builder', 'defer-forms-for-contact-form-7' ) }
					</a>
					<a href={ previewUrl( form.form_id ) } className={ actionBtn }>
						<Eye className="df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-stone-400" />
						{ __( 'Preview', 'defer-forms-for-contact-form-7' ) }
					</a>
				</div>

				<div className="df7-flex df7-gap-2">
					<a href={ editUrl( form.form_id ) } className={ actionBtn }>
						<Pencil className="df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-stone-400" />
						{ __( 'Edit', 'defer-forms-for-contact-form-7' ) }
					</a>
					<a href={ `admin.php?page=df7-submissions&form=${ form.form_id }` } className={ actionBtn }>
						<Inbox className="df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-stone-400" />
						{ __( 'Entries', 'defer-forms-for-contact-form-7' ) }
					</a>
					<a
						href={ `admin.php?page=df7-builder&form=${ form.form_id }&tab=settings` }
						aria-label={ __( 'Form settings', 'defer-forms-for-contact-form-7' ) }
						title={ __( 'Form settings', 'defer-forms-for-contact-form-7' ) }
						className="df7-inline-flex df7-h-9 df7-w-9 df7-shrink-0 df7-cursor-pointer df7-items-center df7-justify-center df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-text-stone-400 df7-no-underline df7-transition-colors hover:df7-bg-stone-50 hover:df7-text-ink"
					>
						<Settings className="df7-h-4 df7-w-4" />
					</a>
				</div>
			</div>
		</div>
	);
};

/**
 * The card, before it knows what it is holding.
 *
 * Line for line with FormCard above, including the margins between them —
 * mt-1 under the title and mt-1 under the count, not the mt-2 and mt-3 this
 * used to carry. Every text line is a Shimmer wearing the real line's own size
 * class, so it stands exactly as tall as what replaces it.
 *
 * Measured before and after: eight cards at 359px became eight at 372 the
 * moment the fetch returned, and the whole grid below them moved with it.
 */
const SkeletonCard = () => (
	<div className="df7-flex df7-h-full df7-flex-col df7-rounded-2xl df7-border df7-border-line df7-bg-white df7-p-5">
		<div className="df7-mb-3 df7-flex df7-items-start df7-justify-between">
			<div className="df7-h-11 df7-w-11 df7-animate-pulse df7-rounded-xl df7-bg-stone-100" />
			{ /* The id, beside a 28px delete button that sets this row's height. */ }
			<div className="df7-flex df7-h-7 df7-items-center">
				<Shimmer w="df7-w-8" text="df7-text-[14px]" />
			</div>
		</div>

		<Shimmer as="h3" w="df7-w-3/4" text="df7-text-base" />
		<Shimmer as="p" w="df7-w-1/2" text="df7-text-[14px]" className="df7-mt-1" />

		<div className="df7-mt-2 df7-flex df7-items-baseline df7-gap-2">
			<Shimmer w="df7-w-16" text="df7-text-2xl" />
			<Shimmer w="df7-w-12" text="df7-text-sm" />
		</div>

		<Shimmer as="p" w="df7-w-1/2" text="df7-text-[14px]" className="df7-mt-1" />

		<ShortcodeBox code="" loading />

		<div className="df7-mt-4 df7-flex df7-flex-col df7-gap-2 df7-border-t df7-border-line df7-pt-4">
			<div className="df7-flex df7-gap-2">
				<div className="df7-h-9 df7-flex-1 df7-animate-pulse df7-rounded-lg df7-bg-stone-100" />
				<div className="df7-h-9 df7-flex-1 df7-animate-pulse df7-rounded-lg df7-bg-stone-100" />
			</div>
			<div className="df7-flex df7-gap-2">
				<div className="df7-h-9 df7-flex-1 df7-animate-pulse df7-rounded-lg df7-bg-stone-100" />
				<div className="df7-h-9 df7-flex-1 df7-animate-pulse df7-rounded-lg df7-bg-stone-100" />
				<div className="df7-h-9 df7-w-9 df7-shrink-0 df7-animate-pulse df7-rounded-lg df7-bg-stone-100" />
			</div>
		</div>
	</div>
);

const App = () => {
	const [ forms, setForms ]     = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ]     = useState( null );
	const [ search, setSearch ]   = useState( '' );
	const [ creating, setCreating ] = useState( false );
	const [ deleting, setDeleting ] = useState( null );
	const [ transfer, setTransfer ] = useState( false );

	// Named, because an import adds forms this list has never seen and the only
	// honest way to show them is to ask again.
	const load = () =>
		apiFetch( { path: 'df7/v1/forms/overview' } )
			.then( ( res ) => {
				setForms( res );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message ) )
			.finally( () => setLoading( false ) );

	useEffect( () => {
		load();
	}, [] );

	const needle   = search.trim().toLowerCase();
	const filtered = forms.filter(
		( form ) =>
			'' === needle ||
			( form.title || '' ).toLowerCase().includes( needle ) ||
			String( form.form_id ).includes( needle )
	);

	const newFormButton = (
		<button
			type="button"
			onClick={ () => setCreating( true ) }
			className="df7-inline-flex df7-h-10 df7-cursor-pointer df7-items-center df7-gap-2 df7-rounded-lg df7-border-0 df7-bg-ink df7-px-4 df7-text-sm df7-font-semibold df7-text-white df7-transition-opacity hover:df7-opacity-90"
		>
			<Plus className="df7-h-4 df7-w-4" />
			{ __( 'New form', 'defer-forms-for-contact-form-7' ) }
		</button>
	);

	const transferButton = (
		<button
			type="button"
			onClick={ () => setTransfer( true ) }
			className="df7-inline-flex df7-h-10 df7-cursor-pointer df7-items-center df7-gap-2 df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-px-4 df7-text-sm df7-font-semibold df7-text-ink df7-transition-colors hover:df7-bg-stone-50"
		>
			<ArrowDownUp className="df7-h-4 df7-w-4 df7-text-stone-400" />
			{ __( 'Import / Export', 'defer-forms-for-contact-form-7' ) }
		</button>
	);

	// A page-level action rather than a per-card one: one look is shared by every
	// form, and a Styling button on each card would promise otherwise.
	const stylingLink = (
		<a
			href="admin.php?page=df7-styling"
			className="df7-inline-flex df7-h-10 df7-cursor-pointer df7-items-center df7-gap-2 df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-px-4 df7-text-sm df7-font-semibold df7-text-ink df7-no-underline df7-transition-colors hover:df7-bg-stone-50"
		>
			<Palette className="df7-h-4 df7-w-4 df7-text-stone-400" />
			{ __( 'Styling', 'defer-forms-for-contact-form-7' ) }
		</a>
	);

	const renderBody = () => {
		if ( loading ) {
			return (
				<div className="df7-grid df7-grid-cols-1 df7-gap-4 sm:df7-grid-cols-2 lg:df7-grid-cols-3 xl:df7-grid-cols-4">
					{ Array.from( { length: 8 } ).map( ( _, i ) => <SkeletonCard key={ i } /> ) }
				</div>
			);
		}

		if ( 0 === forms.length ) {
			return (
				<div className="df7-flex df7-flex-col df7-items-center df7-justify-center df7-py-24 df7-text-center">
					<div className="df7-mb-4 df7-flex df7-h-16 df7-w-16 df7-items-center df7-justify-center df7-rounded-2xl df7-bg-stone-50 df7-text-stone-400">
						<FileText className="df7-h-8 df7-w-8" />
					</div>
					<h3 className="df7-m-0 df7-text-lg df7-font-bold df7-text-ink">
						{ __( 'No forms yet', 'defer-forms-for-contact-form-7' ) }
					</h3>
					<p className="df7-mb-4 df7-mt-1 df7-text-sm df7-text-stone-500">
						{ __( 'Create your first Contact Form 7 form to get started.', 'defer-forms-for-contact-form-7' ) }
					</p>
					{ newFormButton }
				</div>
			);
		}

		if ( 0 === filtered.length ) {
			return (
				<div className="df7-py-20 df7-text-center df7-text-sm df7-text-stone-500">
					{ __( 'No forms match your search.', 'defer-forms-for-contact-form-7' ) }
				</div>
			);
		}

		return (
			<div className="df7-grid df7-grid-cols-1 df7-gap-4 sm:df7-grid-cols-2 lg:df7-grid-cols-3 xl:df7-grid-cols-4">
				{ filtered.map( ( form ) => <FormCard key={ form.form_id } form={ form } onDelete={ () => setDeleting( form ) } /> ) }
			</div>
		);
	};

	return (
		<Page>
			<PageHeader
				title={ __( 'Forms', 'defer-forms-for-contact-form-7' ) }
				subtitle={ __( 'Your Contact Form 7 forms at a glance.', 'defer-forms-for-contact-form-7' ) }
				actions={ <>{ transferButton }{ stylingLink }{ newFormButton }</> }
			/>

			{ error && (
				<div className="df7-mb-4 df7-rounded-lg df7-border df7-border-red-200 df7-bg-red-50 df7-px-4 df7-py-3 df7-text-sm df7-font-medium df7-text-red-700">
					{ error }
				</div>
			) }

			<div className="df7-mb-6 df7-relative df7-w-full sm:df7-w-80">
				<Search className="df7-pointer-events-none df7-absolute df7-left-3 df7-top-1/2 df7-h-4 df7-w-4 -df7-translate-y-1/2 df7-text-stone-400" />
				<input
					type="search"
					value={ search }
					onChange={ ( event ) => setSearch( event.target.value ) }
					placeholder={ __( 'Search forms…', 'defer-forms-for-contact-form-7' ) }
					className={ `df7-h-9 df7-w-full df7-rounded-lg df7-border df7-border-stroke df7-bg-white df7-pl-10 df7-pr-3 df7-text-sm df7-text-ink df7-transition-colors placeholder:df7-text-stone-400 ${ focusRing }` }
				/>
			</div>

			{ renderBody() }

			{ creating && <NewFormDialog onClose={ () => setCreating( false ) } /> }

			{ transfer && (
				<TransferDialog
					forms={ forms }
					onClose={ () => setTransfer( false ) }
					onImported={ load }
				/>
			) }

			{ deleting && (
				<DeleteFormDialog
					form={ deleting }
					onClose={ () => setDeleting( null ) }
					onDeleted={ ( id ) => {
						setForms( ( curr ) => curr.filter( ( form ) => form.form_id !== id ) );
						setDeleting( null );
					} }
				/>
			) }
		</Page>
	);
};

const mount = document.getElementById( 'df7-forms-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
