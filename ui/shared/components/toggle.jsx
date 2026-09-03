/**
 * Accent switch toggle, shared across settings and modules.
 */
export const Toggle = ( { checked, onChange, disabled } ) => (
	<button
		type="button"
		role="switch"
		aria-checked={ checked }
		disabled={ disabled }
		onClick={ () => onChange( ! checked ) }
		className={ `df7-relative df7-inline-flex df7-h-6 df7-w-11 df7-shrink-0 df7-cursor-pointer df7-rounded-full df7-border-0 df7-p-0 df7-transition-colors df7-duration-200 disabled:df7-cursor-not-allowed disabled:df7-opacity-50 ${
			checked ? 'df7-bg-accent' : 'df7-bg-stone-300'
		}` }
	>
		<span
			className={ `df7-pointer-events-none df7-absolute df7-left-0.5 df7-top-0.5 df7-h-5 df7-w-5 df7-rounded-full df7-bg-white df7-shadow-md df7-transition-transform df7-duration-200 df7-ease-in-out ${
				checked ? 'df7-translate-x-5' : 'df7-translate-x-0'
			}` }
		/>
	</button>
);
