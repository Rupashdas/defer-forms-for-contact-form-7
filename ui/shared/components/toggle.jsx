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
		className={ `deferforms-relative deferforms-inline-flex deferforms-h-6 deferforms-w-11 deferforms-shrink-0 deferforms-cursor-pointer deferforms-rounded-full deferforms-border-0 deferforms-p-0 deferforms-transition-colors deferforms-duration-200 disabled:deferforms-cursor-not-allowed disabled:deferforms-opacity-50 ${
			checked ? 'deferforms-bg-accent' : 'deferforms-bg-stone-300'
		}` }
	>
		<span
			className={ `deferforms-pointer-events-none deferforms-absolute deferforms-left-0.5 deferforms-top-0.5 deferforms-h-5 deferforms-w-5 deferforms-rounded-full deferforms-bg-white deferforms-shadow-md deferforms-transition-transform deferforms-duration-200 deferforms-ease-in-out ${
				checked ? 'deferforms-translate-x-5' : 'deferforms-translate-x-0'
			}` }
		/>
	</button>
);
