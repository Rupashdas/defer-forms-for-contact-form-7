<?php
/**
 * Plugin orchestrator.
 *
 * @package DF7
 */

declare(strict_types=1);

namespace DF7\Core;

/*
 * Above the imports rather than below them.
 *
 * Plugin Check reads the first fifty lines of a file looking for this line and
 * gives up after them. Its other route — walking the parsed file — only reads
 * top-level statements, and in a namespaced file every statement sits inside
 * the namespace, so it matches nothing here. Those fifty lines are all there
 * is.
 *
 * This file imports forty classes. The guard was on line 52, and the file was
 * reported as having none at all.
 */
defined( 'ABSPATH' ) || exit;

use DF7\Admin\Assets;
use DF7\Admin\Attachment_Download;
use DF7\Admin\Cf7_Integration;
use DF7\Admin\Csv_Export;
use DF7\Admin\Menu;
use DF7\CF7\Attachments;
use DF7\CF7\Conditional;
use DF7\CF7\Country;
use DF7\CF7\Date_Picker;
use DF7\CF7\Design;
use DF7\CF7\Dynamic_Text;
use DF7\CF7\File_Field;
use DF7\CF7\Form_Class;
use DF7\CF7\Form_Styles;
use DF7\CF7\Grid;
use DF7\CF7\Honeypot;
use DF7\CF7\Marker_Cleanup;
use DF7\CF7\Password;
use DF7\CF7\Prefill;
use DF7\CF7\Product_Field;
use DF7\CF7\Rating;
use DF7\CF7\Spam_Guard;
use DF7\CF7\Redirect;
use DF7\CF7\Revisions;
use DF7\CF7\Steps;
use DF7\CF7\Submission_Id;
use DF7\CF7\Submission_Listener;
use DF7\CF7\Validation;
use DF7\DB\Settings_Repository;
use DF7\DB\Submissions_Repository;
use DF7\Privacy\Privacy;
use DF7\Modules\Registry;
use DF7\REST\Forms_Controller;
use DF7\REST\Modules_Controller;
use DF7\REST\Settings_Controller;
use DF7\REST\Submissions_Controller;
use DF7\REST\Templates_Controller;
use DF7\REST\Transfer_Controller;
use DF7\Templates\Registry as Template_Registry;

final class Plugin {

	private Container $container;

	/**
	 * @param Container|null $container Pre-built container; defaults to an empty
	 *                                  one that boot() then fills. Injectable so
	 *                                  a single behaviour can be exercised
	 *                                  without booting the whole plugin.
	 */
	public function __construct( ?Container $container = null ) {
		$this->container = $container ?? new Container();
	}

	public function boot(): void {
		$this->register_services();

		// Always on: submission capture, and everything a saved form is made of.
		// Layout, steps, conditions and the custom field tags are not optional —
		// switching one off would not disable a feature, it would take apart the
		// forms already built with it. See Modules\Registry for why.
		$this->container->make( 'cf7.listener' )->register_hooks();
		$this->container->make( 'cf7.grid' )->register_hooks();
		$this->container->make( 'cf7.steps' )->register_hooks();
		$this->container->make( 'cf7.conditional' )->register_hooks();
		$this->container->make( 'cf7.datepicker' )->register_hooks();
		$this->container->make( 'cf7.formstyles' )->register_hooks();
		$this->container->make( 'cf7.validation' )->register_hooks();
		$this->container->make( 'cf7.password' )->register_hooks();
		$this->container->make( 'cf7.filefield' )->register_hooks();
		$this->container->make( 'cf7.rating' )->register_hooks();
		$this->container->make( 'cf7.country' )->register_hooks();
		$this->container->make( 'cf7.dynamictext' )->register_hooks();
		$this->container->make( 'cf7.submissionid' )->register_hooks();
		$this->container->make( 'cf7.product' )->register_hooks();
		$this->container->make( 'cf7.prefill' )->register_hooks();
		$this->container->make( 'cf7.markercleanup' )->register_hooks();
		$this->container->make( 'cf7.attachments' )->register_hooks();

		// Everything else. Nothing here is conditional any more: the spam checks
		// each have their own switch under Settings → Spam, privacy exports are
		// the compliant behaviour rather than an option, and redirect does
		// nothing until a form is given somewhere to go.
		$this->container->make( 'cf7.honeypot' )->register_hooks();
		$this->container->make( 'cf7.spamguard' )->register_hooks();
		$this->container->make( 'privacy.gdpr' )->register_hooks();
		$this->container->make( 'cf7.redirect' )->register_hooks();
		$this->container->make( 'cf7.form_class' )->register_hooks();
		$this->container->make( 'cf7.revisions' )->register_hooks();

		/*
		 * The admin side, and only when there is one.
		 *
		 * Every hook below — `admin_menu`, `admin_post_*`, `script_loader_tag` —
		 * fires only on an admin request, so registering them on a front-end page
		 * load was never wrong, just unnecessary: five objects built and their
		 * callbacks filed away on every view of every page on the site, to be
		 * used on none of them. `admin_post_*` runs through admin-post.php, which
		 * `is_admin()` covers, so the two admin-post endpoints belong in here too.
		 *
		 * Each of these still checks its own capability. This gate is about not
		 * doing the work, not about who may.
		 */
		if ( is_admin() ) {
			$this->container->make( 'admin.csvexport' )->register_hooks();
			$this->container->make( 'admin.attachments' )->register_hooks();
			$this->container->make( 'admin.menu' )->register_hooks();
			$this->container->make( 'admin.assets' )->register_hooks();
			$this->container->make( 'admin.cf7' )->register_hooks();
		}

		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_action( 'df7_daily_cleanup', array( $this, 'run_retention_cleanup' ) );

		if ( ! wp_next_scheduled( 'df7_daily_cleanup' ) ) {
			wp_schedule_event( time(), 'daily', 'df7_daily_cleanup' );
		}
	}

	/**
	 * Hand each REST controller its turn. They are only built here, on
	 * `rest_api_init`, so a normal page load never constructs them.
	 */
	public function register_rest_routes(): void {
		$controllers = array(
			'rest.submissions',
			'rest.forms',
			'rest.settings',
			'rest.modules',
			'rest.templates',
			'rest.transfer',
		);

		foreach ( $controllers as $key ) {
			$this->container->make( $key )->register_routes();
		}
	}

	public function run_retention_cleanup(): void {
		$settings   = $this->container->make( 'settings.repository' )->all();
		$repository = $this->container->make( 'submissions.repository' );

		$days = (int) ( $settings['general']['retention_days'] ?? 0 );
		if ( $days > 0 ) {
			$repository->delete_older_than( $days );
		}

		// Spam expires on its own schedule: general retention defaults to off, so
		// without this a flood of stored spam would sit in the table for ever.
		$spam_days = (int) ( $settings['spam']['spam_retention_days'] ?? 0 );
		if ( $spam_days > 0 ) {
			$repository->delete_older_than( $spam_days, 'spam' );
		}

		// Last, so it counts what the two deletions above have left behind. The
		// running total the upload path reads is adjusted rather than measured,
		// and anything that moves a file without telling it — a hand-deleted
		// folder, a restore from backup — leaves it a little wrong. Once a day is
		// often enough for a number whose only job is to hold a ceiling up.
		Attachments::recount();
	}

	private function register_services(): void {
		$this->container->singleton(
			'submissions.repository',
			static fn() => new Submissions_Repository()
		);

		$this->container->singleton(
			'cf7.listener',
			static fn( Container $container ) => new Submission_Listener(
				$container->make( 'submissions.repository' ),
				$container->make( 'settings.repository' )
			)
		);

		$this->container->singleton(
			'cf7.honeypot',
			static fn( Container $container ) => new Honeypot(
				$container->make( 'settings.repository' )
			)
		);

		$this->container->singleton(
			'cf7.spamguard',
			static fn( Container $container ) => new Spam_Guard(
				$container->make( 'settings.repository' )
			)
		);

		$this->container->singleton(
			'privacy.gdpr',
			static fn( Container $container ) => new Privacy(
				$container->make( 'submissions.repository' )
			)
		);

		$this->container->singleton(
			'cf7.datepicker',
			static fn() => new Date_Picker()
		);

		$this->container->singleton(
			'cf7.formstyles',
			static fn( Container $container ) => new Form_Styles(
				$container->make( 'cf7.design' )
			)
		);

		$this->container->singleton(
			'cf7.validation',
			static fn() => new Validation()
		);

		$this->container->singleton(
			'cf7.design',
			static fn( Container $container ) => new Design(
				$container->make( 'settings.repository' )
			)
		);

		$this->container->singleton(
			'cf7.grid',
			static fn() => new Grid()
		);

		$this->container->singleton(
			'cf7.steps',
			static fn() => new Steps()
		);

		$this->container->singleton(
			'cf7.conditional',
			static fn() => new Conditional()
		);

		$this->container->singleton(
			'cf7.redirect',
			static fn() => new Redirect()
		);

		$this->container->singleton(
			'cf7.form_class',
			static fn() => new Form_Class()
		);

		$this->container->singleton(
			'cf7.revisions',
			static fn() => new Revisions()
		);

		$this->container->singleton(
			'cf7.filefield',
			static fn() => new File_Field()
		);

		$this->container->singleton(
			'cf7.password',
			static fn() => new Password()
		);

		$this->container->singleton(
			'cf7.rating',
			static fn() => new Rating()
		);

		$this->container->singleton(
			'cf7.country',
			static fn() => new Country()
		);

		$this->container->singleton(
			'cf7.dynamictext',
			static fn() => new Dynamic_Text()
		);

		$this->container->singleton(
			'cf7.submissionid',
			static fn() => new Submission_Id()
		);

		$this->container->singleton(
			'cf7.product',
			static fn() => new Product_Field()
		);

		$this->container->singleton(
			'cf7.prefill',
			static fn() => new Prefill()
		);

		$this->container->singleton(
			'cf7.markercleanup',
			static fn() => new Marker_Cleanup()
		);

		$this->container->singleton(
			'cf7.attachments',
			static fn() => new Attachments()
		);

		$this->container->singleton(
			'settings.repository',
			static fn() => new Settings_Repository()
		);

		$this->container->singleton(
			'templates.registry',
			static fn() => new Template_Registry()
		);

		$this->container->singleton(
			'admin.attachments',
			static fn() => new Attachment_Download()
		);

		$this->container->singleton(
			'admin.menu',
			static fn( Container $container ) => new Menu(
				$container->make( 'cf7.design' ),
				$container->make( 'submissions.repository' )
			)
		);

		$this->container->singleton(
			'admin.assets',
			static fn() => new Assets()
		);

		$this->container->singleton(
			'admin.cf7',
			static fn() => new Cf7_Integration()
		);

		$this->container->singleton(
			'admin.csvexport',
			static fn( Container $container ) => new Csv_Export(
				$container->make( 'submissions.repository' )
			)
		);

		// One controller per REST resource; see src/REST.
		$this->container->singleton(
			'rest.submissions',
			static fn( Container $container ) => new Submissions_Controller( $container )
		);

		$this->container->singleton(
			'rest.forms',
			static fn( Container $container ) => new Forms_Controller( $container )
		);

		$this->container->singleton(
			'rest.settings',
			static fn( Container $container ) => new Settings_Controller( $container )
		);

		$this->container->singleton(
			'rest.modules',
			static fn( Container $container ) => new Modules_Controller( $container )
		);

		$this->container->singleton(
			'rest.templates',
			static fn( Container $container ) => new Templates_Controller( $container )
		);

		$this->container->singleton(
			'rest.transfer',
			static fn( Container $container ) => new Transfer_Controller( $container )
		);
	}
}
