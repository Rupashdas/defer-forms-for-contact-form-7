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
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\Modules;

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
			array( 'submissions', __( 'Submissions Database', 'essentials-for-contact-form-7' ), __( 'Store every form entry with search, filtering and export.', 'essentials-for-contact-form-7' ), __( 'Core', 'essentials-for-contact-form-7' ), 'database' ),
			// Built since before this list was written and never on it: uploads
			// are kept with the entry, downloadable from it, and removed with it.
			array( 'attachments', __( 'File Uploads Kept', 'essentials-for-contact-form-7' ), __( 'Uploaded files are stored with the entry and downloadable from it.', 'essentials-for-contact-form-7' ), __( 'Core', 'essentials-for-contact-form-7' ), 'paperclip' ),
			// Added with 2.3.0. The list is what the page draws, so a feature
			// that ships without an entry here simply does not exist to anyone
			// reading that screen.
			array( 'entry_workflow', __( 'Entry Workflow', 'essentials-for-contact-form-7' ), __( 'Mark an entry replied or done, and answer it without leaving the screen.', 'essentials-for-contact-form-7' ), __( 'Core', 'essentials-for-contact-form-7' ), 'reply' ),
			array( 'builder', __( 'Visual Builder', 'essentials-for-contact-form-7' ), __( 'Drag-and-drop builder for Contact Form 7 fields.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'layout' ),
			array( 'grid', __( 'Grid Layout', 'essentials-for-contact-form-7' ), __( 'Arrange fields in 1–4 responsive columns.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'grid' ),
			array( 'multistep', __( 'Multi-Step Forms', 'essentials-for-contact-form-7' ), __( 'Split long forms into steps with a progress bar.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'list-ordered' ),
			array( 'conditional', __( 'Conditional Logic', 'essentials-for-contact-form-7' ), __( 'Show or hide fields based on what the user selects.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'git-branch' ),
			array( 'redirect', __( 'Redirect', 'essentials-for-contact-form-7' ), __( 'Send users to a thank-you or external page after submit.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'external-link' ),
			array( 'templates', __( 'Template Library', 'essentials-for-contact-form-7' ), __( 'Start from 20+ ready-made form templates.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'layout-template' ),
			array( 'styling', __( 'Styling Controls', 'essentials-for-contact-form-7' ), __( 'Customise colors, typography and spacing without CSS, or give one form a class of your own.', 'essentials-for-contact-form-7' ), __( 'Design', 'essentials-for-contact-form-7' ), 'palette' ),
			array( 'fields', __( 'Lite Fields', 'essentials-for-contact-form-7' ), __( 'Star rating, country, password, dynamic text and more.', 'essentials-for-contact-form-7' ), __( 'Fields', 'essentials-for-contact-form-7' ), 'text-cursor-input' ),
			array( 'spam', __( 'Spam Protection', 'essentials-for-contact-form-7' ), __( 'Block bots with a honeypot, time-trap and dedup checks.', 'essentials-for-contact-form-7' ), __( 'Protection', 'essentials-for-contact-form-7' ), 'shield' ),
			array( 'privacy', __( 'Privacy & GDPR', 'essentials-for-contact-form-7' ), __( 'Data export and erase helpers for compliance.', 'essentials-for-contact-form-7' ), __( 'Protection', 'essentials-for-contact-form-7' ), 'lock' ),
			array( 'import_export', __( 'Import / Export', 'essentials-for-contact-form-7' ), __( 'Move forms between sites as JSON.', 'essentials-for-contact-form-7' ), __( 'Tools', 'essentials-for-contact-form-7' ), 'arrow-down-up' ),
			array( 'revisions', __( 'Revisions', 'essentials-for-contact-form-7' ), __( 'Keep the last ten versions of a form and roll one back.', 'essentials-for-contact-form-7' ), __( 'Tools', 'essentials-for-contact-form-7' ), 'history' ),
			array( 'notifications', __( 'Chat Notifications', 'essentials-for-contact-form-7' ), __( 'Send every submission to Telegram, Slack or Discord as it arrives.', 'essentials-for-contact-form-7' ), __( 'Notifications', 'essentials-for-contact-form-7' ), 'send' ),
		);

		/**
		 * Not written yet. Listed so the page can say what is coming rather than
		 * pretending the plugin is finished; `planned` is what keeps them out of
		 * the "what you have today" count.
		 *
		 * Empty at the moment, and that is the honest state: Telegram was the
		 * last one here and now exists, and the AI generator was dropped rather
		 * than built. A promise nobody intends to keep is worse than a shorter
		 * list — the group simply does not draw when there is nothing in it.
		 */
		$planned = array();

		$pro = array(
			array( 'analytics', __( 'Analytics', 'essentials-for-contact-form-7' ), __( 'Track views, conversion, abandonment and field drop-off.', 'essentials-for-contact-form-7' ), __( 'Insights', 'essentials-for-contact-form-7' ), 'bar-chart' ),
			array( 'ab_testing', __( 'A/B Testing', 'essentials-for-contact-form-7' ), __( 'Test form variants and pick the winner.', 'essentials-for-contact-form-7' ), __( 'Insights', 'essentials-for-contact-form-7' ), 'split' ),
			array( 'payments', __( 'Payments', 'essentials-for-contact-form-7' ), __( 'Collect Stripe and PayPal payments from forms.', 'essentials-for-contact-form-7' ), __( 'Integrations', 'essentials-for-contact-form-7' ), 'credit-card' ),
			array( 'crm', __( 'CRM Integrations', 'essentials-for-contact-form-7' ), __( 'Sync entries to Mailchimp, HubSpot, ActiveCampaign, ConvertKit.', 'essentials-for-contact-form-7' ), __( 'Integrations', 'essentials-for-contact-form-7' ), 'users' ),
			array( 'webhook', __( 'Webhook Builder', 'essentials-for-contact-form-7' ), __( 'Send submission data to any endpoint with a JSON payload.', 'essentials-for-contact-form-7' ), __( 'Integrations', 'essentials-for-contact-form-7' ), 'webhook' ),
			array( 'pro_fields', __( 'Advanced Fields', 'essentials-for-contact-form-7' ), __( 'Signature, repeater, calculation, range, image-choice and more.', 'essentials-for-contact-form-7' ), __( 'Fields', 'essentials-for-contact-form-7' ), 'pen-tool' ),
			array( 'pdf', __( 'PDF Export', 'essentials-for-contact-form-7' ), __( 'Generate a PDF of each submission with Dompdf.', 'essentials-for-contact-form-7' ), __( 'Tools', 'essentials-for-contact-form-7' ), 'file-text' ),
			array( 'save_continue', __( 'Save & Continue', 'essentials-for-contact-form-7' ), __( 'Let users save progress and resume from a link.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'save' ),
			array( 'autosave', __( 'Draft Autosave', 'essentials-for-contact-form-7' ), __( 'Auto-save drafts to the database and localStorage.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'refresh-cw' ),
			array( 'step_branching', __( 'Step Branching', 'essentials-for-contact-form-7' ), __( 'Jump to different steps based on field values.', 'essentials-for-contact-form-7' ), __( 'Forms', 'essentials-for-contact-form-7' ), 'git-fork' ),
			array( 'workflows', __( 'Email Workflows', 'essentials-for-contact-form-7' ), __( 'Build trigger → condition → action email sequences.', 'essentials-for-contact-form-7' ), __( 'Notifications', 'essentials-for-contact-form-7' ), 'workflow' ),
			array( 'team', __( 'Team Collaboration', 'essentials-for-contact-form-7' ), __( 'Notes, activity log and mentions on submissions.', 'essentials-for-contact-form-7' ), __( 'Tools', 'essentials-for-contact-form-7' ), 'message-square' ),
			array( 'white_label', __( 'White Label', 'essentials-for-contact-form-7' ), __( 'Replace the plugin name, logo and hide Pro CTAs.', 'essentials-for-contact-form-7' ), __( 'Tools', 'essentials-for-contact-form-7' ), 'tag' ),
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
