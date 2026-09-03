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
			className={ `df7-flex df7-items-center df7-gap-2 df7-rounded-lg df7-border df7-border-line df7-bg-stone-50/60 df7-px-2.5 df7-text-left df7-transition-colors ${
				// In a toolbar it stands beside buttons and has to be their
				// height; in a card it is a line of its own under the text.
				compact ? 'df7-h-9 df7-max-w-[15rem]' : 'df7-mt-4 df7-w-full df7-py-1.5'
			} ${
				loading ? '' : 'df7-cursor-pointer hover:df7-border-stroke hover:df7-bg-stone-50'
			}` }
		>
			<code className="df7-min-w-0 df7-flex-1 df7-truncate df7-bg-transparent df7-p-0 df7-text-[14px] df7-text-stone-500">
				{ loading ? <Shimmer w="df7-w-2/3" /> : code }
			</code>
			{ loading || ! copied
				? <Copy className={ `df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-stone-400 ${ loading ? 'df7-animate-pulse df7-opacity-40' : '' }` } />
				: <Check className="df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-emerald-600" /> }
		</button>
	);
};
