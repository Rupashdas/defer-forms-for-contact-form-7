<?php
/**
 * Catalog of ready-made Contact Form 7 form templates.
 *
 * Each template is defined as a list of structured fields. The same field list
 * drives both the React preview and the generated CF7 form markup, so there is
 * a single source of truth.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\Templates;

defined( 'ABSPATH' ) || exit;

final class Registry {

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function definitions(): array {
		return array(
			array(
				'slug'        => 'simple_contact',
				'name'        => __( 'Simple Contact', 'cf7-nova-lite' ),
				'description' => __( 'A clean contact form with name, email, subject and message.', 'cf7-nova-lite' ),
				'category'    => __( 'General', 'cf7-nova-lite' ),
				'icon'        => 'mail',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'your-subject',
						'label'    => __( 'Subject', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'Your message', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'feedback',
				'name'        => __( 'Feedback', 'cf7-nova-lite' ),
				'description' => __( 'Collect a rating and comments from your visitors.', 'cf7-nova-lite' ),
				'category'    => __( 'General', 'cf7-nova-lite' ),
				'icon'        => 'star',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'rating',
						'label'   => __( 'How would you rate us?', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Excellent', 'cf7-nova-lite' ),
							__( 'Good', 'cf7-nova-lite' ),
							__( 'Average', 'cf7-nova-lite' ),
							__( 'Poor', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Your feedback', 'cf7-nova-lite' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'newsletter',
				'name'        => __( 'Newsletter Signup', 'cf7-nova-lite' ),
				'description' => __( 'A compact opt-in form for your mailing list.', 'cf7-nova-lite' ),
				'category'    => __( 'Marketing', 'cf7-nova-lite' ),
				'icon'        => 'send',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'acceptance',
						'name'  => 'accept-this',
						'label' => __( 'I agree to receive the newsletter.', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'support',
				'name'        => __( 'Support Request', 'cf7-nova-lite' ),
				'description' => __( 'A help-desk style ticket with priority and subject.', 'cf7-nova-lite' ),
				'category'    => __( 'Support', 'cf7-nova-lite' ),
				'icon'        => 'life-buoy',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'priority',
						'label'   => __( 'Priority', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Low', 'cf7-nova-lite' ),
							__( 'Normal', 'cf7-nova-lite' ),
							__( 'High', 'cf7-nova-lite' ),
							__( 'Urgent', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'     => 'text',
						'name'     => 'your-subject',
						'label'    => __( 'Subject', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Describe your issue', 'cf7-nova-lite' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'quote',
				'name'        => __( 'Quote Request', 'cf7-nova-lite' ),
				'description' => __( 'Let prospects request a quote with service details.', 'cf7-nova-lite' ),
				'category'    => __( 'Business', 'cf7-nova-lite' ),
				'icon'        => 'file-text',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'cf7-nova-lite' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'service',
						'label'   => __( 'Service needed', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Web Design', 'cf7-nova-lite' ),
							__( 'Development', 'cf7-nova-lite' ),
							__( 'SEO', 'cf7-nova-lite' ),
							__( 'Consulting', 'cf7-nova-lite' ),
							__( 'Other', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Project details', 'cf7-nova-lite' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'rsvp',
				'name'        => __( 'Event RSVP', 'cf7-nova-lite' ),
				'description' => __( 'Confirm attendance and guest count for an event.', 'cf7-nova-lite' ),
				'category'    => __( 'Events', 'cf7-nova-lite' ),
				'icon'        => 'calendar',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'attending',
						'label'   => __( 'Will you attend?', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Yes, I will be there', 'cf7-nova-lite' ),
							__( 'Sorry, cannot make it', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'number',
						'name'  => 'guests',
						'label' => __( 'Number of guests', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'job_application',
				'name'        => __( 'Job Application', 'cf7-nova-lite' ),
				'description' => __( 'Applicant details, experience and a resume upload.', 'cf7-nova-lite' ),
				'category'    => __( 'Business', 'cf7-nova-lite' ),
				'icon'        => 'briefcase',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'cf7-nova-lite' ),
					),
					array(
						'type'     => 'text',
						'name'     => 'position',
						'label'    => __( 'Position applying for', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'experience',
						'label'   => __( 'Years of experience', 'cf7-nova-lite' ),
						'options' => array(
							__( '0-1 years', 'cf7-nova-lite' ),
							__( '2-5 years', 'cf7-nova-lite' ),
							__( '5+ years', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'file',
						'name'  => 'resume',
						'label' => __( 'Resume (PDF)', 'cf7-nova-lite' ),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'cover-letter',
						'label'    => __( 'Cover letter', 'cf7-nova-lite' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'booking',
				'name'        => __( 'Booking / Appointment', 'cf7-nova-lite' ),
				'description' => __( 'Date, time and service picker for appointments.', 'cf7-nova-lite' ),
				'category'    => __( 'Business', 'cf7-nova-lite' ),
				'icon'        => 'calendar-clock',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'cf7-nova-lite' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'service',
						'label'   => __( 'Service', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Consultation', 'cf7-nova-lite' ),
							__( 'Follow-up', 'cf7-nova-lite' ),
							__( 'Other', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'     => 'date',
						'name'     => 'preferred-date',
						'label'    => __( 'Preferred date', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'text',
						'name'  => 'preferred-time',
						'label' => __( 'Preferred time', 'cf7-nova-lite' ),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'notes',
						'label' => __( 'Notes', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'survey',
				'name'        => __( 'Survey', 'cf7-nova-lite' ),
				'description' => __( 'A short multiple-choice survey with a comment box.', 'cf7-nova-lite' ),
				'category'    => __( 'General', 'cf7-nova-lite' ),
				'icon'        => 'clipboard-list',
				'fields'      => array(
					array(
						'type'  => 'text',
						'name'  => 'your-name',
						'label' => __( 'Your name (optional)', 'cf7-nova-lite' ),
					),
					array(
						'type'    => 'radio',
						'name'    => 'satisfaction',
						'label'   => __( 'How satisfied are you?', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Very satisfied', 'cf7-nova-lite' ),
							__( 'Satisfied', 'cf7-nova-lite' ),
							__( 'Neutral', 'cf7-nova-lite' ),
							__( 'Unsatisfied', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'    => 'radio',
						'name'    => 'recommend',
						'label'   => __( 'Would you recommend us?', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Yes', 'cf7-nova-lite' ),
							__( 'No', 'cf7-nova-lite' ),
							__( 'Maybe', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'comments',
						'label' => __( 'Any comments?', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'lead_capture',
				'name'        => __( 'Lead Capture', 'cf7-nova-lite' ),
				'description' => __( 'Short and high-converting: just enough to follow up.', 'cf7-nova-lite' ),
				'category'    => __( 'Marketing', 'cf7-nova-lite' ),
				'icon'        => 'target',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Work email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'cf7-nova-lite' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'budget',
						'label'   => __( 'Budget', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Under 1k', 'cf7-nova-lite' ),
							__( '1k to 5k', 'cf7-nova-lite' ),
							__( '5k to 20k', 'cf7-nova-lite' ),
							__( 'Over 20k', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'acceptance',
						'name'  => 'accept-this',
						'label' => __( 'I agree to be contacted about my enquiry.', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'callback_request',
				'name'        => __( 'Request a Callback', 'cf7-nova-lite' ),
				'description' => __( 'Let visitors pick a day and time that suits them.', 'cf7-nova-lite' ),
				'category'    => __( 'General', 'cf7-nova-lite' ),
				'icon'        => 'phone',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'tel',
						'name'     => 'phone',
						'label'    => __( 'Phone number', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'date',
						'name'  => 'call-date',
						'label' => __( 'Preferred day', 'cf7-nova-lite' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'call-time',
						'label'   => __( 'Preferred time', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Morning', 'cf7-nova-lite' ),
							__( 'Afternoon', 'cf7-nova-lite' ),
							__( 'Evening', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'What is it about?', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'bug_report',
				'name'        => __( 'Bug Report', 'cf7-nova-lite' ),
				'description' => __( 'Everything needed to reproduce a problem, including a screenshot.', 'cf7-nova-lite' ),
				'category'    => __( 'Support', 'cf7-nova-lite' ),
				'icon'        => 'bug',
				'fields'      => array(
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'summary',
						'label'    => __( 'Summary', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'severity',
						'label'   => __( 'Severity', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Blocking', 'cf7-nova-lite' ),
							__( 'Major', 'cf7-nova-lite' ),
							__( 'Minor', 'cf7-nova-lite' ),
							__( 'Cosmetic', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'steps',
						'label'    => __( 'Steps to reproduce', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'textarea',
						'name'  => 'expected',
						'label' => __( 'What did you expect to happen?', 'cf7-nova-lite' ),
					),
					array(
						'type'  => 'file',
						'name'  => 'screenshot',
						'label' => __( 'Screenshot', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'volunteer',
				'name'        => __( 'Volunteer Signup', 'cf7-nova-lite' ),
				'description' => __( 'Collect availability and interests from would-be volunteers.', 'cf7-nova-lite' ),
				'category'    => __( 'Community', 'cf7-nova-lite' ),
				'icon'        => 'hand-heart',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'checkbox',
						'name'    => 'interests',
						'label'   => __( 'I can help with', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Events', 'cf7-nova-lite' ),
							__( 'Fundraising', 'cf7-nova-lite' ),
							__( 'Admin', 'cf7-nova-lite' ),
							__( 'Outreach', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'    => 'checkbox',
						'name'    => 'availability',
						'label'   => __( 'When are you free?', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Weekday mornings', 'cf7-nova-lite' ),
							__( 'Weekday evenings', 'cf7-nova-lite' ),
							__( 'Weekends', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'about-you',
						'label' => __( 'Tell us about yourself', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'donation',
				'name'        => __( 'Donation Pledge', 'cf7-nova-lite' ),
				'description' => __( 'Record a pledge and how the donor would like to give.', 'cf7-nova-lite' ),
				'category'    => __( 'Community', 'cf7-nova-lite' ),
				'icon'        => 'heart',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'number',
						'name'     => 'amount',
						'label'    => __( 'Pledge amount', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'frequency',
						'label'   => __( 'How often?', 'cf7-nova-lite' ),
						'options' => array(
							__( 'One-off', 'cf7-nova-lite' ),
							__( 'Monthly', 'cf7-nova-lite' ),
							__( 'Yearly', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'acceptance',
						'name'  => 'accept-this',
						'label' => __( 'Please keep me updated on how my donation is used.', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'course_enrolment',
				'name'        => __( 'Course Enrolment', 'cf7-nova-lite' ),
				'description' => __( 'Sign students up for a course or workshop.', 'cf7-nova-lite' ),
				'category'    => __( 'Education', 'cf7-nova-lite' ),
				'icon'        => 'graduation-cap',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Student name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'cf7-nova-lite' ),
					),
					array(
						'type'     => 'select',
						'name'     => 'course',
						'label'    => __( 'Course', 'cf7-nova-lite' ),
						'required' => true,
						'options'  => array(
							__( 'Beginner', 'cf7-nova-lite' ),
							__( 'Intermediate', 'cf7-nova-lite' ),
							__( 'Advanced', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'date',
						'name'  => 'start-date',
						'label' => __( 'Preferred start date', 'cf7-nova-lite' ),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'experience',
						'label' => __( 'Any previous experience?', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'property_enquiry',
				'name'        => __( 'Property Enquiry', 'cf7-nova-lite' ),
				'description' => __( 'For estate agents: what the buyer wants and what they can spend.', 'cf7-nova-lite' ),
				'category'    => __( 'Business', 'cf7-nova-lite' ),
				'icon'        => 'home',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'cf7-nova-lite' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'looking-for',
						'label'   => __( 'Looking to', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Buy', 'cf7-nova-lite' ),
							__( 'Rent', 'cf7-nova-lite' ),
							__( 'Sell', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'    => 'select',
						'name'    => 'bedrooms',
						'label'   => __( 'Bedrooms', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Studio', 'cf7-nova-lite' ),
							'1',
							'2',
							'3',
							__( '4 or more', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'Anything else?', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'table_reservation',
				'name'        => __( 'Table Reservation', 'cf7-nova-lite' ),
				'description' => __( 'Party size, date and time, plus dietary notes.', 'cf7-nova-lite' ),
				'category'    => __( 'Business', 'cf7-nova-lite' ),
				'icon'        => 'utensils',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Name for the booking', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'tel',
						'name'     => 'phone',
						'label'    => __( 'Phone', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'date',
						'name'     => 'booking-date',
						'label'    => __( 'Date', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'guests',
						'label'   => __( 'Number of guests', 'cf7-nova-lite' ),
						'options' => array(
							'1',
							'2',
							'3',
							'4',
							'5',
							__( '6 or more', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'dietary',
						'label' => __( 'Allergies or dietary needs', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'testimonial',
				'name'        => __( 'Testimonial', 'cf7-nova-lite' ),
				'description' => __( 'Gather a quote and permission to publish it.', 'cf7-nova-lite' ),
				'category'    => __( 'Marketing', 'cf7-nova-lite' ),
				'icon'        => 'quote',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'text',
						'name'  => 'company',
						'label' => __( 'Company or role', 'cf7-nova-lite' ),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'testimonial',
						'label'    => __( 'Your testimonial', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'file',
						'name'  => 'photo',
						'label' => __( 'Your photo', 'cf7-nova-lite' ),
					),
					array(
						'type'  => 'acceptance',
						'name'  => 'accept-this',
						'label' => __( 'You may publish this on your website.', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'partnership',
				'name'        => __( 'Partnership Proposal', 'cf7-nova-lite' ),
				'description' => __( 'For inbound business proposals and collaborations.', 'cf7-nova-lite' ),
				'category'    => __( 'Business', 'cf7-nova-lite' ),
				'icon'        => 'handshake',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'company',
						'label'    => __( 'Company', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Work email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'url',
						'name'  => 'website',
						'label' => __( 'Website', 'cf7-nova-lite' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'proposal-type',
						'label'   => __( 'Type of partnership', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Reseller', 'cf7-nova-lite' ),
							__( 'Affiliate', 'cf7-nova-lite' ),
							__( 'Integration', 'cf7-nova-lite' ),
							__( 'Other', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Tell us about the opportunity', 'cf7-nova-lite' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'returns',
				'name'        => __( 'Returns and Refunds', 'cf7-nova-lite' ),
				'description' => __( 'Order details and the reason for sending something back.', 'cf7-nova-lite' ),
				'category'    => __( 'Support', 'cf7-nova-lite' ),
				'icon'        => 'package',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email used for the order', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'order-id',
						'label'    => __( 'Order number', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'outcome',
						'label'   => __( 'What would you like?', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Refund', 'cf7-nova-lite' ),
							__( 'Replacement', 'cf7-nova-lite' ),
							__( 'Store credit', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'reason',
						'label'    => __( 'Reason for return', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'  => 'file',
						'name'  => 'photo',
						'label' => __( 'Photo of the item', 'cf7-nova-lite' ),
					),
				),
			),
			array(
				'slug'        => 'consultation',
				'name'        => __( 'Free Consultation', 'cf7-nova-lite' ),
				'description' => __( 'Qualify an enquiry before booking time with it.', 'cf7-nova-lite' ),
				'category'    => __( 'Business', 'cf7-nova-lite' ),
				'icon'        => 'message-circle',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'cf7-nova-lite' ),
						'required' => true,
					),
					array(
						'type'     => 'select',
						'name'     => 'topic',
						'label'    => __( 'What do you need help with?', 'cf7-nova-lite' ),
						'required' => true,
						'options'  => array(
							__( 'Strategy', 'cf7-nova-lite' ),
							__( 'Design', 'cf7-nova-lite' ),
							__( 'Development', 'cf7-nova-lite' ),
							__( 'Something else', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'    => 'select',
						'name'    => 'timeline',
						'label'   => __( 'Timeline', 'cf7-nova-lite' ),
						'options' => array(
							__( 'Immediately', 'cf7-nova-lite' ),
							__( 'This month', 'cf7-nova-lite' ),
							__( 'This quarter', 'cf7-nova-lite' ),
							__( 'Just exploring', 'cf7-nova-lite' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'A little background', 'cf7-nova-lite' ),
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
