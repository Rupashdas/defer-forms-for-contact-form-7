/**
 * A form's shortcode, and one click to copy it.
 *
 * Shared because it is wanted in two places for the same reason: on the Forms
 * card, and in the builder while the form is open — which is exactly when
 * somebody wants to paste it into a page and does not want to leave to fetch
 * it.
 *
 * The clipboard API needs a secure context and a permission that a browser can
 * refuse, so there is a fallback: a scratch textarea and execCommand, which is
 * deprecated and works everywhere.
 *
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Check, Copy } from 'lucide-react';

import { Shimmer } from './ui';

export const ShortcodeBox = ( { code, loading = false, compact = false } ) => {
	const [ copied, setCopied ] = useState( false );

	if ( ! code && ! loading ) {
		return null;
	}

	const copy = async () => {
		try {
			await navigator.clipboard.writeText( code );
		} catch {
			const scratch = document.createElement( 'textarea' );
			scratch.value = code;
			scratch.style.position = 'fixed';
			scratch.style.opacity = '0';
			document.body.appendChild( scratch );
			scratch.select();
			document.execCommand( 'copy' );
			document.body.removeChild( scratch );
		}
		setCopied( true );
		setTimeout( () => setCopied( false ), 1600 );
	};

	return (
		<button
			type="button"
			onClick={ loading ? undefined : copy }
			disabled={ loading }
			title={ loading ? undefined : code }
			aria-label={ __( 'Copy shortcode', 'defer-forms-for-contact-form-7' ) }
			className={ `deferforms-flex deferforms-items-center deferforms-gap-2 deferforms-rounded-lg deferforms-border deferforms-border-line deferforms-bg-stone-50/60 deferforms-px-2.5 deferforms-text-left deferforms-transition-colors ${
				// In a toolbar it stands beside buttons and has to be their
				// height; in a card it is a line of its own under the text.
				compact ? 'deferforms-h-9 deferforms-max-w-[15rem]' : 'deferforms-mt-4 deferforms-w-full deferforms-py-1.5'
			} ${
				loading ? '' : 'deferforms-cursor-pointer hover:deferforms-border-stroke hover:deferforms-bg-stone-50'
			}` }
		>
			<code className="deferforms-min-w-0 deferforms-flex-1 deferforms-truncate deferforms-bg-transparent deferforms-p-0 deferforms-text-[14px] deferforms-text-stone-500">
				{ loading ? <Shimmer w="deferforms-w-2/3" /> : code }
			</code>
			{ loading || ! copied
				? <Copy className={ `deferforms-h-3.5 deferforms-w-3.5 deferforms-shrink-0 deferforms-text-stone-400 ${ loading ? 'deferforms-animate-pulse deferforms-opacity-40' : '' }` } />
				: <Check className="deferforms-h-3.5 deferforms-w-3.5 deferforms-shrink-0 deferforms-text-emerald-600" /> }
		</button>
	);
};
