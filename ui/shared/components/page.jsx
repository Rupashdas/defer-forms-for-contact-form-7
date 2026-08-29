/**
 * Shared admin page shell: a left-aligned content column (not centered, so it
 * lines up with the WP admin chrome) and a strong, consistent page header.
 */

export const Page = ( { children } ) => (
	<div className="cf7e-mt-4 cf7e-w-full cf7e-pb-14 cf7e-pr-5">{ children }</div>
);

export const PageHeader = ( { title, subtitle, actions } ) => (
	<div className="cf7e-mb-6 cf7e-flex cf7e-flex-wrap cf7e-items-end cf7e-justify-between cf7e-gap-4 cf7e-border-b cf7e-border-line cf7e-pb-5">
		<div className="cf7e-min-w-0">
			<h1 className="cf7e-m-0 cf7e-p-0 cf7e-text-[30px] cf7e-font-extrabold cf7e-leading-tight cf7e-tracking-tight cf7e-text-ink">
				{ title }
			</h1>
			{ subtitle && (
				<p className="cf7e-mb-0 cf7e-mt-2 cf7e-text-[15px] cf7e-text-stone-500">{ subtitle }</p>
			) }
		</div>
		{ actions ? <div className="cf7e-flex cf7e-shrink-0 cf7e-items-center cf7e-gap-2">{ actions }</div> : null }
	</div>
);
