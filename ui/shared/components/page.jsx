/**
 * Shared admin page shell: a left-aligned content column (not centered, so it
 * lines up with the WP admin chrome) and a strong, consistent page header.
 */

export const Page = ( { children } ) => (
	<div className="deferforms-mt-4 deferforms-w-full deferforms-pb-14 deferforms-pr-5">{ children }</div>
);

export const PageHeader = ( { title, subtitle, actions } ) => (
	<div className="deferforms-mb-6 deferforms-flex deferforms-flex-wrap deferforms-items-end deferforms-justify-between deferforms-gap-4 deferforms-border-b deferforms-border-line deferforms-pb-5">
		<div className="deferforms-min-w-0">
			<h1 className="deferforms-m-0 deferforms-p-0 deferforms-text-[30px] deferforms-font-extrabold deferforms-leading-tight deferforms-tracking-tight deferforms-text-ink">
				{ title }
			</h1>
			{ subtitle && (
				<p className="deferforms-mb-0 deferforms-mt-2 deferforms-text-[15px] deferforms-text-stone-500">{ subtitle }</p>
			) }
		</div>
		{ actions ? <div className="deferforms-flex deferforms-shrink-0 deferforms-items-center deferforms-gap-2">{ actions }</div> : null }
	</div>
);
