<?php
/**
 * Plugin orchestrator.
 *
 * @package CF7_Nova_Lite
 */

declare(strict_types=1);

namespace CF7NL\Core;

use CF7NL\Admin\Assets;
use CF7NL\Admin\Attachment_Download;
use CF7NL\Admin\Cf7_Integration;
use CF7NL\Admin\Csv_Export;
use CF7NL\Admin\Menu;
use CF7NL\CF7\Attachments;
use CF7NL\CF7\Conditional;
use CF7NL\CF7\Country;
use CF7NL\CF7\Date_Picker;
use CF7NL\CF7\Design;
use CF7NL\CF7\Dynamic_Text;
use CF7NL\CF7\File_Field;
use CF7NL\CF7\Form_Styles;
use CF7NL\CF7\Grid;
use CF7NL\CF7\Honeypot;
use CF7NL\CF7\Marker_Cleanup;
use CF7NL\CF7\Password;
use CF7NL\CF7\Prefill;
use CF7NL\CF7\Product_Field;
use CF7NL\CF7\Rating;
use CF7NL\CF7\Spam_Guard;
use CF7NL\CF7\Redirect;
use CF7NL\CF7\Revisions;
use CF7NL\CF7\Steps;
use CF7NL\CF7\Submission_Id;
use CF7NL\CF7\Submission_Listener;
use CF7NL\CF7\Validation;
use CF7NL\DB\Settings_Repository;
use CF7NL\DB\Submissions_Repository;
use CF7NL\Privacy\Privacy;
use CF7NL\Modules\Registry;
use CF7NL\REST\Forms_Controller;
use CF7NL\REST\Modules_Controller;
use CF7NL\REST\Settings_Controller;
use CF7NL\REST\Submissions_Controller;
use CF7NL\REST\Templates_Controller;
use CF7NL\REST\Transfer_Controller;
use CF7NL\Templates\Registry as Template_Registry;

defined( 'ABSPATH' ) || exit;

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
		add_action( 'cf7nl_daily_cleanup', array( $this, 'run_retention_cleanup' ) );

		if ( ! wp_next_scheduled( 'cf7nl_daily_cleanup' ) ) {
			wp_schedule_event( time(), 'daily', 'cf7nl_daily_cleanup' );
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
