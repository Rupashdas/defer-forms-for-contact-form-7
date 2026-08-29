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
		className={ `cf7e-relative cf7e-inline-flex cf7e-h-6 cf7e-w-11 cf7e-shrink-0 cf7e-cursor-pointer cf7e-rounded-full cf7e-border-0 cf7e-p-0 cf7e-transition-colors cf7e-duration-200 disabled:cf7e-cursor-not-allowed disabled:cf7e-opacity-50 ${
			checked ? 'cf7e-bg-accent' : 'cf7e-bg-stone-300'
		}` }
	>
		<span
			className={ `cf7e-pointer-events-none cf7e-absolute cf7e-left-0.5 cf7e-top-0.5 cf7e-h-5 cf7e-w-5 cf7e-rounded-full cf7e-bg-white cf7e-shadow-md cf7e-transition-transform cf7e-duration-200 cf7e-ease-in-out ${
				checked ? 'cf7e-translate-x-5' : 'cf7e-translate-x-0'
			}` }
		/>
	</button>
);
