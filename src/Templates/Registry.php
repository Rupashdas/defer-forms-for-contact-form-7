<?php
/**
 * Catalog of ready-made Contact Form 7 form templates.
 *
 * Each template is defined as a list of structured fields. The same field list
 * drives both the React preview and the generated CF7 form markup, so there is
 * a single source of truth.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\Templates;

defined( 'ABSPATH' ) || exit;

final class Registry {

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function definitions(): array {
		return array(
			array(
				'slug'        => 'simple_contact',
				'name'        => __( 'Simple Contact', 'essentials-for-contact-form-7' ),
				'description' => __( 'A clean contact form with name, email, subject and message.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'General', 'essentials-for-contact-form-7' ),
				'icon'        => 'mail',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'your-subject',
						'label'    => __( 'Subject', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'Your message', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'feedback',
				'name'        => __( 'Feedback', 'essentials-for-contact-form-7' ),
				'description' => __( 'Collect a rating and comments from your visitors.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'General', 'essentials-for-contact-form-7' ),
				'icon'        => 'star',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'rating',
						'label'   => __( 'How would you rate us?', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Excellent', 'essentials-for-contact-form-7' ),
							__( 'Good', 'essentials-for-contact-form-7' ),
							__( 'Average', 'essentials-for-contact-form-7' ),
							__( 'Poor', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Your feedback', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'newsletter',
				'name'        => __( 'Newsletter Signup', 'essentials-for-contact-form-7' ),
				'description' => __( 'A compact opt-in form for your mailing list.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Marketing', 'essentials-for-contact-form-7' ),
				'icon'        => 'send',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'acceptance',
						'name'  => 'accept-this',
						'label' => __( 'I agree to receive the newsletter.', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'support',
				'name'        => __( 'Support Request', 'essentials-for-contact-form-7' ),
				'description' => __( 'A help-desk style ticket with priority and subject.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Support', 'essentials-for-contact-form-7' ),
				'icon'        => 'life-buoy',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'priority',
						'label'   => __( 'Priority', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Low', 'essentials-for-contact-form-7' ),
							__( 'Normal', 'essentials-for-contact-form-7' ),
							__( 'High', 'essentials-for-contact-form-7' ),
							__( 'Urgent', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'text',
						'name'     => 'your-subject',
						'label'    => __( 'Subject', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Describe your issue', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'quote',
				'name'        => __( 'Quote Request', 'essentials-for-contact-form-7' ),
				'description' => __( 'Let prospects request a quote with service details.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Business', 'essentials-for-contact-form-7' ),
				'icon'        => 'file-text',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'service',
						'label'   => __( 'Service needed', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Web Design', 'essentials-for-contact-form-7' ),
							__( 'Development', 'essentials-for-contact-form-7' ),
							__( 'SEO', 'essentials-for-contact-form-7' ),
							__( 'Consulting', 'essentials-for-contact-form-7' ),
							__( 'Other', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Project details', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'rsvp',
				'name'        => __( 'Event RSVP', 'essentials-for-contact-form-7' ),
				'description' => __( 'Confirm attendance and guest count for an event.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Events', 'essentials-for-contact-form-7' ),
				'icon'        => 'calendar',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'attending',
						'label'   => __( 'Will you attend?', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Yes, I will be there', 'essentials-for-contact-form-7' ),
							__( 'Sorry, cannot make it', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'number',
						'name'  => 'guests',
						'label' => __( 'Number of guests', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'job_application',
				'name'        => __( 'Job Application', 'essentials-for-contact-form-7' ),
				'description' => __( 'Applicant details, experience and a resume upload.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Business', 'essentials-for-contact-form-7' ),
				'icon'        => 'briefcase',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'     => 'text',
						'name'     => 'position',
						'label'    => __( 'Position applying for', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'experience',
						'label'   => __( 'Years of experience', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( '0-1 years', 'essentials-for-contact-form-7' ),
							__( '2-5 years', 'essentials-for-contact-form-7' ),
							__( '5+ years', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'file',
						'name'  => 'resume',
						'label' => __( 'Resume (PDF)', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'cover-letter',
						'label'    => __( 'Cover letter', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'booking',
				'name'        => __( 'Booking / Appointment', 'essentials-for-contact-form-7' ),
				'description' => __( 'Date, time and service picker for appointments.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Business', 'essentials-for-contact-form-7' ),
				'icon'        => 'calendar-clock',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'service',
						'label'   => __( 'Service', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Consultation', 'essentials-for-contact-form-7' ),
							__( 'Follow-up', 'essentials-for-contact-form-7' ),
							__( 'Other', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'date',
						'name'     => 'preferred-date',
						'label'    => __( 'Preferred date', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'text',
						'name'  => 'preferred-time',
						'label' => __( 'Preferred time', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'notes',
						'label' => __( 'Notes', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'survey',
				'name'        => __( 'Survey', 'essentials-for-contact-form-7' ),
				'description' => __( 'A short multiple-choice survey with a comment box.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'General', 'essentials-for-contact-form-7' ),
				'icon'        => 'clipboard-list',
				'fields'      => array(
					array(
						'type'  => 'text',
						'name'  => 'your-name',
						'label' => __( 'Your name (optional)', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'    => 'radio',
						'name'    => 'satisfaction',
						'label'   => __( 'How satisfied are you?', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Very satisfied', 'essentials-for-contact-form-7' ),
							__( 'Satisfied', 'essentials-for-contact-form-7' ),
							__( 'Neutral', 'essentials-for-contact-form-7' ),
							__( 'Unsatisfied', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'    => 'radio',
						'name'    => 'recommend',
						'label'   => __( 'Would you recommend us?', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Yes', 'essentials-for-contact-form-7' ),
							__( 'No', 'essentials-for-contact-form-7' ),
							__( 'Maybe', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'comments',
						'label' => __( 'Any comments?', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'lead_capture',
				'name'        => __( 'Lead Capture', 'essentials-for-contact-form-7' ),
				'description' => __( 'Short and high-converting: just enough to follow up.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Marketing', 'essentials-for-contact-form-7' ),
				'icon'        => 'target',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Work email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'budget',
						'label'   => __( 'Budget', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Under 1k', 'essentials-for-contact-form-7' ),
							__( '1k to 5k', 'essentials-for-contact-form-7' ),
							__( '5k to 20k', 'essentials-for-contact-form-7' ),
							__( 'Over 20k', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'acceptance',
						'name'  => 'accept-this',
						'label' => __( 'I agree to be contacted about my enquiry.', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'callback_request',
				'name'        => __( 'Request a Callback', 'essentials-for-contact-form-7' ),
				'description' => __( 'Let visitors pick a day and time that suits them.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'General', 'essentials-for-contact-form-7' ),
				'icon'        => 'phone',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'tel',
						'name'     => 'phone',
						'label'    => __( 'Phone number', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'date',
						'name'  => 'call-date',
						'label' => __( 'Preferred day', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'call-time',
						'label'   => __( 'Preferred time', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Morning', 'essentials-for-contact-form-7' ),
							__( 'Afternoon', 'essentials-for-contact-form-7' ),
							__( 'Evening', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'What is it about?', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'bug_report',
				'name'        => __( 'Bug Report', 'essentials-for-contact-form-7' ),
				'description' => __( 'Everything needed to reproduce a problem, including a screenshot.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Support', 'essentials-for-contact-form-7' ),
				'icon'        => 'bug',
				'fields'      => array(
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'summary',
						'label'    => __( 'Summary', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'severity',
						'label'   => __( 'Severity', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Blocking', 'essentials-for-contact-form-7' ),
							__( 'Major', 'essentials-for-contact-form-7' ),
							__( 'Minor', 'essentials-for-contact-form-7' ),
							__( 'Cosmetic', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'steps',
						'label'    => __( 'Steps to reproduce', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'textarea',
						'name'  => 'expected',
						'label' => __( 'What did you expect to happen?', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'  => 'file',
						'name'  => 'screenshot',
						'label' => __( 'Screenshot', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'volunteer',
				'name'        => __( 'Volunteer Signup', 'essentials-for-contact-form-7' ),
				'description' => __( 'Collect availability and interests from would-be volunteers.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Community', 'essentials-for-contact-form-7' ),
				'icon'        => 'hand-heart',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'checkbox',
						'name'    => 'interests',
						'label'   => __( 'I can help with', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Events', 'essentials-for-contact-form-7' ),
							__( 'Fundraising', 'essentials-for-contact-form-7' ),
							__( 'Admin', 'essentials-for-contact-form-7' ),
							__( 'Outreach', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'    => 'checkbox',
						'name'    => 'availability',
						'label'   => __( 'When are you free?', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Weekday mornings', 'essentials-for-contact-form-7' ),
							__( 'Weekday evenings', 'essentials-for-contact-form-7' ),
							__( 'Weekends', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'about-you',
						'label' => __( 'Tell us about yourself', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'donation',
				'name'        => __( 'Donation Pledge', 'essentials-for-contact-form-7' ),
				'description' => __( 'Record a pledge and how the donor would like to give.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Community', 'essentials-for-contact-form-7' ),
				'icon'        => 'heart',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'number',
						'name'     => 'amount',
						'label'    => __( 'Pledge amount', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'frequency',
						'label'   => __( 'How often?', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'One-off', 'essentials-for-contact-form-7' ),
							__( 'Monthly', 'essentials-for-contact-form-7' ),
							__( 'Yearly', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'acceptance',
						'name'  => 'accept-this',
						'label' => __( 'Please keep me updated on how my donation is used.', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'course_enrolment',
				'name'        => __( 'Course Enrolment', 'essentials-for-contact-form-7' ),
				'description' => __( 'Sign students up for a course or workshop.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Education', 'essentials-for-contact-form-7' ),
				'icon'        => 'graduation-cap',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Student name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'     => 'select',
						'name'     => 'course',
						'label'    => __( 'Course', 'essentials-for-contact-form-7' ),
						'required' => true,
						'options'  => array(
							__( 'Beginner', 'essentials-for-contact-form-7' ),
							__( 'Intermediate', 'essentials-for-contact-form-7' ),
							__( 'Advanced', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'date',
						'name'  => 'start-date',
						'label' => __( 'Preferred start date', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'experience',
						'label' => __( 'Any previous experience?', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'property_enquiry',
				'name'        => __( 'Property Enquiry', 'essentials-for-contact-form-7' ),
				'description' => __( 'For estate agents: what the buyer wants and what they can spend.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Business', 'essentials-for-contact-form-7' ),
				'icon'        => 'home',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'looking-for',
						'label'   => __( 'Looking to', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Buy', 'essentials-for-contact-form-7' ),
							__( 'Rent', 'essentials-for-contact-form-7' ),
							__( 'Sell', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'    => 'select',
						'name'    => 'bedrooms',
						'label'   => __( 'Bedrooms', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Studio', 'essentials-for-contact-form-7' ),
							'1',
							'2',
							'3',
							__( '4 or more', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'Anything else?', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'table_reservation',
				'name'        => __( 'Table Reservation', 'essentials-for-contact-form-7' ),
				'description' => __( 'Party size, date and time, plus dietary notes.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Business', 'essentials-for-contact-form-7' ),
				'icon'        => 'utensils',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Name for the booking', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'tel',
						'name'     => 'phone',
						'label'    => __( 'Phone', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'date',
						'name'     => 'booking-date',
						'label'    => __( 'Date', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'guests',
						'label'   => __( 'Number of guests', 'essentials-for-contact-form-7' ),
						'options' => array(
							'1',
							'2',
							'3',
							'4',
							'5',
							__( '6 or more', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'dietary',
						'label' => __( 'Allergies or dietary needs', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'testimonial',
				'name'        => __( 'Testimonial', 'essentials-for-contact-form-7' ),
				'description' => __( 'Gather a quote and permission to publish it.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Marketing', 'essentials-for-contact-form-7' ),
				'icon'        => 'quote',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'text',
						'name'  => 'company',
						'label' => __( 'Company or role', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'testimonial',
						'label'    => __( 'Your testimonial', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'file',
						'name'  => 'photo',
						'label' => __( 'Your photo', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'  => 'acceptance',
						'name'  => 'accept-this',
						'label' => __( 'You may publish this on your website.', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'partnership',
				'name'        => __( 'Partnership Proposal', 'essentials-for-contact-form-7' ),
				'description' => __( 'For inbound business proposals and collaborations.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Business', 'essentials-for-contact-form-7' ),
				'icon'        => 'handshake',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'company',
						'label'    => __( 'Company', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Work email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'url',
						'name'  => 'website',
						'label' => __( 'Website', 'essentials-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'proposal-type',
						'label'   => __( 'Type of partnership', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Reseller', 'essentials-for-contact-form-7' ),
							__( 'Affiliate', 'essentials-for-contact-form-7' ),
							__( 'Integration', 'essentials-for-contact-form-7' ),
							__( 'Other', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Tell us about the opportunity', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'returns',
				'name'        => __( 'Returns and Refunds', 'essentials-for-contact-form-7' ),
				'description' => __( 'Order details and the reason for sending something back.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Support', 'essentials-for-contact-form-7' ),
				'icon'        => 'package',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email used for the order', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'order-id',
						'label'    => __( 'Order number', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'outcome',
						'label'   => __( 'What would you like?', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Refund', 'essentials-for-contact-form-7' ),
							__( 'Replacement', 'essentials-for-contact-form-7' ),
							__( 'Store credit', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'reason',
						'label'    => __( 'Reason for return', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'file',
						'name'  => 'photo',
						'label' => __( 'Photo of the item', 'essentials-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'consultation',
				'name'        => __( 'Free Consultation', 'essentials-for-contact-form-7' ),
				'description' => __( 'Qualify an enquiry before booking time with it.', 'essentials-for-contact-form-7' ),
				'category'    => __( 'Business', 'essentials-for-contact-form-7' ),
				'icon'        => 'message-circle',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'essentials-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'select',
						'name'     => 'topic',
						'label'    => __( 'What do you need help with?', 'essentials-for-contact-form-7' ),
						'required' => true,
						'options'  => array(
							__( 'Strategy', 'essentials-for-contact-form-7' ),
							__( 'Design', 'essentials-for-contact-form-7' ),
							__( 'Development', 'essentials-for-contact-form-7' ),
							__( 'Something else', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'    => 'select',
						'name'    => 'timeline',
						'label'   => __( 'Timeline', 'essentials-for-contact-form-7' ),
						'options' => array(
							__( 'Immediately', 'essentials-for-contact-form-7' ),
							__( 'This month', 'essentials-for-contact-form-7' ),
							__( 'This quarter', 'essentials-for-contact-form-7' ),
							__( 'Just exploring', 'essentials-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'A little background', 'essentials-for-contact-form-7' ),
					),
				),
			),
		);
	}

	/**
	 * Metadata + fields — enough for the gallery cards and the preview.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public function catalog(): array {
		return self::definitions();
	}

	/**
	 * A single template with its generated CF7 form markup and mail body.
	 *
	 * @return array<string, mixed>|null
	 */
	public function get( string $slug ): ?array {
		foreach ( self::definitions() as $template ) {
			if ( $template['slug'] === $slug ) {
				$template['form'] = self::build_form_markup( $template['fields'] );
				$template['mail'] = self::build_mail_body( $template['fields'] );
				return $template;
			}
		}
		return null;
	}

	/**
	 * @param array<int, array<string, mixed>> $fields
	 */
	private static function build_form_markup( array $fields ): string {
		$blocks = array();
		foreach ( $fields as $field ) {
			$blocks[] = self::field_markup( $field );
		}
		$blocks[] = '[submit "Submit"]';
		return implode( "\n\n", $blocks );
	}

	/**
	 * @param array<string, mixed> $field
	 */
	private static function field_markup( array $field ): string {
		$type          = (string) $field['type'];
		$name          = (string) $field['name'];
		$label         = (string) $field['label'];
		$required_star = empty( $field['required'] ) ? '' : '*';

		if ( 'acceptance' === $type ) {
			return "[acceptance {$name}] {$label} [/acceptance]";
		}

		switch ( $type ) {
			case 'textarea':
				$control = "[textarea{$required_star} {$name}]";
				break;
			case 'select':
				$control = "[select{$required_star} {$name} " . self::quote_options( $field['options'] ?? array() ) . ']';
				break;
			case 'radio':
				$control = "[radio {$name} use_label_element " . self::quote_options( $field['options'] ?? array() ) . ']';
				break;
			case 'checkbox':
				$control = "[checkbox {$name} use_label_element " . self::quote_options( $field['options'] ?? array() ) . ']';
				break;
			default:
				// text, email, tel, number, date, file.
				$control = "[{$type}{$required_star} {$name}]";
				break;
		}

		return "<label> {$label}\n    {$control} </label>";
	}

	/**
	 * @param array<int, string> $options
	 */
	private static function quote_options( array $options ): string {
		return implode( ' ', array_map( static fn( string $option ): string => '"' . $option . '"', $options ) );
	}

	/**
	 * @param array<int, array<string, mixed>> $fields
	 */
	private static function build_mail_body( array $fields ): string {
		$lines = array();
		foreach ( $fields as $field ) {
			if ( 'acceptance' === $field['type'] ) {
				continue;
			}
			$lines[] = $field['label'] . ': [' . $field['name'] . ']';
		}
		$lines[] = '';
		$lines[] = '-- ';
		$lines[] = 'Sent from [_site_title] ([_site_url])';
		return implode( "\n", $lines );
	}
}
