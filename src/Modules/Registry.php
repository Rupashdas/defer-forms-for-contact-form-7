<?php
/**
 * What this plugin does, and what the Pro version adds.
 *
 * A catalogue, nothing more. There was once an on/off switch beside each of
 * these; it is gone, and the reason is worth keeping written down.
 *
 * Two different kinds of thing had been mixed together. Most of them are what
 * saved forms are *made of* — grid rows, page breaks, conditions, the extra
 * field types. Switching one of those off did not disable a feature, it took
 * apart every form already built with it, and saved nothing doing it: assets
 * are enqueued by looking at the rendered form, never at a setting. Three more
 * (builder, templates, fields) were not read by any code at all — the switch
 * moved and absolutely nothing happened.
 *
 * The remainder were real choices, but each already has a better home. Spam has
 * three separate checks under Settings → Spam, which is where somebody whose
 * time-trap misfires actually needs to go. Privacy exports submissions with the
 * rest of a visitor's data, which is the compliant behaviour rather than an
 * option. Redirect does nothing until a form is given somewhere to go.
 *
 * So: every feature listed here is simply on. The page built from this list is
 * there to answer "what does this plugin do", and to show what Pro adds.
 *
 * The Lite vs Pro split mirrors the original plugin inventory
 * (see cf7-companion-guide/01-audit-and-inventory.md, L1–L19 / P1–P15).
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\Modules;

defined( 'ABSPATH' ) || exit;

final class Registry {

	/**
	 * Every feature the plugin advertises. `icon` is a name the React side maps
	 * to a Lucide component.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function definitions(): array {
		$lite = array(
			array( 'submissions', __( 'Submissions Database', 'cf7-nova-lite' ), __( 'Store every form entry with search, filtering and export.', 'cf7-nova-lite' ), __( 'Core', 'cf7-nova-lite' ), 'database' ),
			array( 'builder', __( 'Visual Builder', 'cf7-nova-lite' ), __( 'Drag-and-drop builder for Contact Form 7 fields.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'layout' ),
			array( 'grid', __( 'Grid Layout', 'cf7-nova-lite' ), __( 'Arrange fields in 1–4 responsive columns.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'grid' ),
			array( 'multistep', __( 'Multi-Step Forms', 'cf7-nova-lite' ), __( 'Split long forms into steps with a progress bar.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'list-ordered' ),
			array( 'conditional', __( 'Conditional Logic', 'cf7-nova-lite' ), __( 'Show or hide fields based on what the user selects.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'git-branch' ),
			array( 'redirect', __( 'Redirect', 'cf7-nova-lite' ), __( 'Send users to a thank-you or external page after submit.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'external-link' ),
			array( 'templates', __( 'Template Library', 'cf7-nova-lite' ), __( 'Start from 20+ ready-made form templates.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'layout-template' ),
			array( 'styling', __( 'Styling Controls', 'cf7-nova-lite' ), __( 'Customise colors, typography and spacing without CSS.', 'cf7-nova-lite' ), __( 'Design', 'cf7-nova-lite' ), 'palette' ),
			array( 'fields', __( 'Lite Fields', 'cf7-nova-lite' ), __( 'Star rating, country, password, dynamic text and more.', 'cf7-nova-lite' ), __( 'Fields', 'cf7-nova-lite' ), 'text-cursor-input' ),
			array( 'spam', __( 'Spam Protection', 'cf7-nova-lite' ), __( 'Block bots with a honeypot, time-trap and dedup checks.', 'cf7-nova-lite' ), __( 'Protection', 'cf7-nova-lite' ), 'shield' ),
			array( 'privacy', __( 'Privacy & GDPR', 'cf7-nova-lite' ), __( 'Data export and erase helpers for compliance.', 'cf7-nova-lite' ), __( 'Protection', 'cf7-nova-lite' ), 'lock' ),
			array( 'import_export', __( 'Import / Export', 'cf7-nova-lite' ), __( 'Move forms between sites as JSON.', 'cf7-nova-lite' ), __( 'Tools', 'cf7-nova-lite' ), 'arrow-down-up' ),
			array( 'revisions', __( 'Revisions', 'cf7-nova-lite' ), __( 'Keep the last ten versions of a form and roll one back.', 'cf7-nova-lite' ), __( 'Tools', 'cf7-nova-lite' ), 'history' ),
		);

		/**
		 * Not written yet. Listed so the page can say what is coming rather than
		 * pretending the plugin is finished; `planned` is what keeps them out of
		 * the "what you have today" count.
		 */
		$planned = array(
			array( 'telegram', __( 'Telegram', 'cf7-nova-lite' ), __( 'Forward submissions to a Telegram channel.', 'cf7-nova-lite' ), __( 'Notifications', 'cf7-nova-lite' ), 'send' ),
			// Forms, not Notifications. It sat under Notifications next to
			// Telegram, presumably because both were added in the same pass —
			// but that group is for getting a submission out to somebody, and
			// this one makes the form in the first place. It belongs beside the
			// builder and the template library, which is where anyone looking
			// for a faster way to start a form is already looking.
			array( 'ai', __( 'AI Generator', 'cf7-nova-lite' ), __( 'Generate forms and email copy with AI.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'bot' ),
		);

		$pro = array(
			array( 'analytics', __( 'Analytics', 'cf7-nova-lite' ), __( 'Track views, conversion, abandonment and field drop-off.', 'cf7-nova-lite' ), __( 'Insights', 'cf7-nova-lite' ), 'bar-chart' ),
			array( 'ab_testing', __( 'A/B Testing', 'cf7-nova-lite' ), __( 'Test form variants and pick the winner.', 'cf7-nova-lite' ), __( 'Insights', 'cf7-nova-lite' ), 'split' ),
			array( 'payments', __( 'Payments', 'cf7-nova-lite' ), __( 'Collect Stripe and PayPal payments from forms.', 'cf7-nova-lite' ), __( 'Integrations', 'cf7-nova-lite' ), 'credit-card' ),
			array( 'crm', __( 'CRM Integrations', 'cf7-nova-lite' ), __( 'Sync entries to Mailchimp, HubSpot, ActiveCampaign, ConvertKit.', 'cf7-nova-lite' ), __( 'Integrations', 'cf7-nova-lite' ), 'users' ),
			array( 'webhook', __( 'Webhook Builder', 'cf7-nova-lite' ), __( 'Send submission data to any endpoint with a JSON payload.', 'cf7-nova-lite' ), __( 'Integrations', 'cf7-nova-lite' ), 'webhook' ),
			array( 'pro_fields', __( 'Advanced Fields', 'cf7-nova-lite' ), __( 'Signature, repeater, calculation, range, image-choice and more.', 'cf7-nova-lite' ), __( 'Fields', 'cf7-nova-lite' ), 'pen-tool' ),
			array( 'pdf', __( 'PDF Export', 'cf7-nova-lite' ), __( 'Generate a PDF of each submission with Dompdf.', 'cf7-nova-lite' ), __( 'Tools', 'cf7-nova-lite' ), 'file-text' ),
			array( 'save_continue', __( 'Save & Continue', 'cf7-nova-lite' ), __( 'Let users save progress and resume from a link.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'save' ),
			array( 'autosave', __( 'Draft Autosave', 'cf7-nova-lite' ), __( 'Auto-save drafts to the database and localStorage.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'refresh-cw' ),
			array( 'step_branching', __( 'Step Branching', 'cf7-nova-lite' ), __( 'Jump to different steps based on field values.', 'cf7-nova-lite' ), __( 'Forms', 'cf7-nova-lite' ), 'git-fork' ),
			array( 'workflows', __( 'Email Workflows', 'cf7-nova-lite' ), __( 'Build trigger → condition → action email sequences.', 'cf7-nova-lite' ), __( 'Notifications', 'cf7-nova-lite' ), 'workflow' ),
			array( 'team', __( 'Team Collaboration', 'cf7-nova-lite' ), __( 'Notes, activity log and mentions on submissions.', 'cf7-nova-lite' ), __( 'Tools', 'cf7-nova-lite' ), 'message-square' ),
			array( 'white_label', __( 'White Label', 'cf7-nova-lite' ), __( 'Replace the plugin name, logo and hide Pro CTAs.', 'cf7-nova-lite' ), __( 'Tools', 'cf7-nova-lite' ), 'tag' ),
		);

		$out = array();

		foreach ( array(
			'lite'    => $lite,
			'planned' => $planned,
			'pro'     => $pro,
		) as $status => $group ) {
			foreach ( $group as $definition ) {
				$out[] = array(
					'slug'        => $definition[0],
					'name'        => $definition[1],
					'description' => $definition[2],
					'category'    => $definition[3],
					'icon'        => $definition[4],
					'status'      => $status,
					// Kept so the React side does not have to know that "pro" is
					// the only status that means locked.
					'is_pro'      => 'pro' === $status,
				);
			}
		}

		return $out;
	}
}
