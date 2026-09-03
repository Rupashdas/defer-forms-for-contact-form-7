<?php
/**
 * Catalog of ready-made Contact Form 7 form templates.
 *
 * Each template is defined as a list of structured fields. The same field list
 * drives both the React preview and the generated CF7 form markup, so there is
 * a single source of truth.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\Templates;

use DF7\CF7\Form_Serializer;

defined( 'ABSPATH' ) || exit;

final class Registry {

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function definitions(): array {
		return array(
			array(
				'slug'        => 'simple_contact',
				'name'        => __( 'Simple Contact', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'A clean contact form with name, email, subject and message.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'General', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'mail',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'your-subject',
						'label'    => __( 'Subject', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'Your message', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'feedback',
				'name'        => __( 'Feedback', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Collect a rating and comments from your visitors.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'General', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'star',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'rating',
						'label'   => __( 'How would you rate us?', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Excellent', 'defer-forms-for-contact-form-7' ),
							__( 'Good', 'defer-forms-for-contact-form-7' ),
							__( 'Average', 'defer-forms-for-contact-form-7' ),
							__( 'Poor', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Your feedback', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'newsletter',
				'name'        => __( 'Newsletter Signup', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'A compact opt-in form for your mailing list.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Marketing', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'send',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'acceptance',
						'name'     => 'accept-this',
						'required' => true,
						'label'    => __( 'I agree to receive the newsletter.', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'support',
				'name'        => __( 'Support Request', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'A help-desk style ticket with priority and subject.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Support', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'life-buoy',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'priority',
						'label'   => __( 'Priority', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Low', 'defer-forms-for-contact-form-7' ),
							__( 'Normal', 'defer-forms-for-contact-form-7' ),
							__( 'High', 'defer-forms-for-contact-form-7' ),
							__( 'Urgent', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'text',
						'name'     => 'your-subject',
						'label'    => __( 'Subject', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Describe your issue', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'quote',
				'name'        => __( 'Quote Request', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Let prospects request a quote with service details.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Business', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'file-text',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'service',
						'label'   => __( 'Service needed', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Web Design', 'defer-forms-for-contact-form-7' ),
							__( 'Development', 'defer-forms-for-contact-form-7' ),
							__( 'SEO', 'defer-forms-for-contact-form-7' ),
							__( 'Consulting', 'defer-forms-for-contact-form-7' ),
							__( 'Other', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Project details', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'rsvp',
				'name'        => __( 'Event RSVP', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Confirm attendance and guest count for an event.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Events', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'calendar',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'attending',
						'label'   => __( 'Will you attend?', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Yes, I will be there', 'defer-forms-for-contact-form-7' ),
							__( 'Sorry, cannot make it', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'number',
						'name'  => 'guests',
						'label' => __( 'Number of guests', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'job_application',
				'name'        => __( 'Job Application', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Applicant details, experience and a resume upload.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Business', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'briefcase',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'     => 'text',
						'name'     => 'position',
						'label'    => __( 'Position applying for', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'experience',
						'label'   => __( 'Years of experience', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( '0-1 years', 'defer-forms-for-contact-form-7' ),
							__( '2-5 years', 'defer-forms-for-contact-form-7' ),
							__( '5+ years', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'file',
						'name'  => 'resume',
						'label' => __( 'Resume (PDF)', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'cover-letter',
						'label'    => __( 'Cover letter', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'booking',
				'name'        => __( 'Booking / Appointment', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Date, time and service picker for appointments.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Business', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'calendar-clock',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'your-phone',
						'label' => __( 'Phone', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'service',
						'label'   => __( 'Service', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Consultation', 'defer-forms-for-contact-form-7' ),
							__( 'Follow-up', 'defer-forms-for-contact-form-7' ),
							__( 'Other', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'date',
						'name'     => 'preferred-date',
						'label'    => __( 'Preferred date', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'text',
						'name'  => 'preferred-time',
						'label' => __( 'Preferred time', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'notes',
						'label' => __( 'Notes', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'survey',
				'name'        => __( 'Survey', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'A short multiple-choice survey with a comment box.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'General', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'clipboard-list',
				'fields'      => array(
					array(
						'type'  => 'text',
						'name'  => 'your-name',
						'label' => __( 'Your name (optional)', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'    => 'radio',
						'name'    => 'satisfaction',
						'label'   => __( 'How satisfied are you?', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Very satisfied', 'defer-forms-for-contact-form-7' ),
							__( 'Satisfied', 'defer-forms-for-contact-form-7' ),
							__( 'Neutral', 'defer-forms-for-contact-form-7' ),
							__( 'Unsatisfied', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'    => 'radio',
						'name'    => 'recommend',
						'label'   => __( 'Would you recommend us?', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Yes', 'defer-forms-for-contact-form-7' ),
							__( 'No', 'defer-forms-for-contact-form-7' ),
							__( 'Maybe', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'comments',
						'label' => __( 'Any comments?', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'lead_capture',
				'name'        => __( 'Lead Capture', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Short and high-converting: just enough to follow up.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Marketing', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'target',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Work email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'budget',
						'label'   => __( 'Budget', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Under 1k', 'defer-forms-for-contact-form-7' ),
							__( '1k to 5k', 'defer-forms-for-contact-form-7' ),
							__( '5k to 20k', 'defer-forms-for-contact-form-7' ),
							__( 'Over 20k', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'acceptance',
						'name'     => 'accept-this',
						'required' => true,
						'label'    => __( 'I agree to be contacted about my enquiry.', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'callback_request',
				'name'        => __( 'Request a Callback', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Let visitors pick a day and time that suits them.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'General', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'phone',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'tel',
						'name'     => 'phone',
						'label'    => __( 'Phone number', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'date',
						'name'  => 'call-date',
						'label' => __( 'Preferred day', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'call-time',
						'label'   => __( 'Preferred time', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Morning', 'defer-forms-for-contact-form-7' ),
							__( 'Afternoon', 'defer-forms-for-contact-form-7' ),
							__( 'Evening', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'What is it about?', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'bug_report',
				'name'        => __( 'Bug Report', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Everything needed to reproduce a problem, including a screenshot.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Support', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'bug',
				'fields'      => array(
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Your email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'summary',
						'label'    => __( 'Summary', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'severity',
						'label'   => __( 'Severity', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Blocking', 'defer-forms-for-contact-form-7' ),
							__( 'Major', 'defer-forms-for-contact-form-7' ),
							__( 'Minor', 'defer-forms-for-contact-form-7' ),
							__( 'Cosmetic', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'steps',
						'label'    => __( 'Steps to reproduce', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'textarea',
						'name'  => 'expected',
						'label' => __( 'What did you expect to happen?', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'  => 'file',
						'name'  => 'screenshot',
						'label' => __( 'Screenshot', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'volunteer',
				'name'        => __( 'Volunteer Signup', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Collect availability and interests from would-be volunteers.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Community', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'hand-heart',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Full name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'checkbox',
						'name'    => 'interests',
						'label'   => __( 'I can help with', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Events', 'defer-forms-for-contact-form-7' ),
							__( 'Fundraising', 'defer-forms-for-contact-form-7' ),
							__( 'Admin', 'defer-forms-for-contact-form-7' ),
							__( 'Outreach', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'    => 'checkbox',
						'name'    => 'availability',
						'label'   => __( 'When are you free?', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Weekday mornings', 'defer-forms-for-contact-form-7' ),
							__( 'Weekday evenings', 'defer-forms-for-contact-form-7' ),
							__( 'Weekends', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'about-you',
						'label' => __( 'Tell us about yourself', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'donation',
				'name'        => __( 'Donation Pledge', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Record a pledge and how the donor would like to give.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Community', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'heart',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'number',
						'name'     => 'amount',
						'label'    => __( 'Pledge amount', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'frequency',
						'label'   => __( 'How often?', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'One-off', 'defer-forms-for-contact-form-7' ),
							__( 'Monthly', 'defer-forms-for-contact-form-7' ),
							__( 'Yearly', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'acceptance',
						'name'     => 'accept-this',
						'required' => true,
						'label'    => __( 'Please keep me updated on how my donation is used.', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'course_enrolment',
				'name'        => __( 'Course Enrolment', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Sign students up for a course or workshop.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Education', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'graduation-cap',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Student name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'     => 'select',
						'name'     => 'course',
						'label'    => __( 'Course', 'defer-forms-for-contact-form-7' ),
						'required' => true,
						'options'  => array(
							__( 'Beginner', 'defer-forms-for-contact-form-7' ),
							__( 'Intermediate', 'defer-forms-for-contact-form-7' ),
							__( 'Advanced', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'date',
						'name'  => 'start-date',
						'label' => __( 'Preferred start date', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'experience',
						'label' => __( 'Any previous experience?', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'property_enquiry',
				'name'        => __( 'Property Enquiry', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'For estate agents: what the buyer wants and what they can spend.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Business', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'home',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'tel',
						'name'  => 'phone',
						'label' => __( 'Phone', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'looking-for',
						'label'   => __( 'Looking to', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Buy', 'defer-forms-for-contact-form-7' ),
							__( 'Rent', 'defer-forms-for-contact-form-7' ),
							__( 'Sell', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'    => 'select',
						'name'    => 'bedrooms',
						'label'   => __( 'Bedrooms', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Studio', 'defer-forms-for-contact-form-7' ),
							'1',
							'2',
							'3',
							__( '4 or more', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'Anything else?', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'table_reservation',
				'name'        => __( 'Table Reservation', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Party size, date and time, plus dietary notes.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Business', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'utensils',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Name for the booking', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'tel',
						'name'     => 'phone',
						'label'    => __( 'Phone', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'date',
						'name'     => 'booking-date',
						'label'    => __( 'Date', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'select',
						'name'    => 'guests',
						'label'   => __( 'Number of guests', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							'1',
							'2',
							'3',
							'4',
							'5',
							__( '6 or more', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'dietary',
						'label' => __( 'Allergies or dietary needs', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'testimonial',
				'name'        => __( 'Testimonial', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Gather a quote and permission to publish it.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Marketing', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'quote',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'text',
						'name'  => 'company',
						'label' => __( 'Company or role', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'testimonial',
						'label'    => __( 'Your testimonial', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'file',
						'name'  => 'photo',
						'label' => __( 'Your photo', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'     => 'acceptance',
						'name'     => 'accept-this',
						'required' => true,
						'label'    => __( 'You may publish this on your website.', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'partnership',
				'name'        => __( 'Partnership Proposal', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'For inbound business proposals and collaborations.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Business', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'handshake',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'company',
						'label'    => __( 'Company', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Work email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'url',
						'name'  => 'website',
						'label' => __( 'Website', 'defer-forms-for-contact-form-7' ),
					),
					array(
						'type'    => 'select',
						'name'    => 'proposal-type',
						'label'   => __( 'Type of partnership', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Reseller', 'defer-forms-for-contact-form-7' ),
							__( 'Affiliate', 'defer-forms-for-contact-form-7' ),
							__( 'Integration', 'defer-forms-for-contact-form-7' ),
							__( 'Other', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'your-message',
						'label'    => __( 'Tell us about the opportunity', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
				),
			),
			array(
				'slug'        => 'returns',
				'name'        => __( 'Returns and Refunds', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Order details and the reason for sending something back.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Support', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'package',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email used for the order', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'text',
						'name'     => 'order-id',
						'label'    => __( 'Order number', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'    => 'radio',
						'name'    => 'outcome',
						'label'   => __( 'What would you like?', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Refund', 'defer-forms-for-contact-form-7' ),
							__( 'Replacement', 'defer-forms-for-contact-form-7' ),
							__( 'Store credit', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'     => 'textarea',
						'name'     => 'reason',
						'label'    => __( 'Reason for return', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'  => 'file',
						'name'  => 'photo',
						'label' => __( 'Photo of the item', 'defer-forms-for-contact-form-7' ),
					),
				),
			),
			array(
				'slug'        => 'consultation',
				'name'        => __( 'Free Consultation', 'defer-forms-for-contact-form-7' ),
				'description' => __( 'Qualify an enquiry before booking time with it.', 'defer-forms-for-contact-form-7' ),
				'category'    => __( 'Business', 'defer-forms-for-contact-form-7' ),
				'icon'        => 'message-circle',
				'fields'      => array(
					array(
						'type'     => 'text',
						'name'     => 'your-name',
						'label'    => __( 'Your name', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'email',
						'name'     => 'your-email',
						'label'    => __( 'Email', 'defer-forms-for-contact-form-7' ),
						'required' => true,
					),
					array(
						'type'     => 'select',
						'name'     => 'topic',
						'label'    => __( 'What do you need help with?', 'defer-forms-for-contact-form-7' ),
						'required' => true,
						'options'  => array(
							__( 'Strategy', 'defer-forms-for-contact-form-7' ),
							__( 'Design', 'defer-forms-for-contact-form-7' ),
							__( 'Development', 'defer-forms-for-contact-form-7' ),
							__( 'Something else', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'    => 'select',
						'name'    => 'timeline',
						'label'   => __( 'Timeline', 'defer-forms-for-contact-form-7' ),
						'options' => array(
							__( 'Immediately', 'defer-forms-for-contact-form-7' ),
							__( 'This month', 'defer-forms-for-contact-form-7' ),
							__( 'This quarter', 'defer-forms-for-contact-form-7' ),
							__( 'Just exploring', 'defer-forms-for-contact-form-7' ),
						),
					),
					array(
						'type'  => 'textarea',
						'name'  => 'your-message',
						'label' => __( 'A little background', 'defer-forms-for-contact-form-7' ),
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
	 * Template fields → the markup a form starts life with.
	 *
	 * Through Form_Serializer, which is the same code the builder saves with.
	 * This used to write its own tags, and a second implementation of one job is
	 * a second set of rules to keep in step — which they were not.
	 *
	 * The one that showed: a radio or checkbox group was captioned with a
	 * `<label>`, and a `<label>` forwards a click to the first control inside
	 * it. Clicking "How satisfied are you?" answered it for the visitor. Nine of
	 * the twenty-one templates shipped that way, and opening one in the builder
	 * and saving silently corrected it — so the bug lived exactly as long as
	 * nobody touched the form.
	 *
	 * @param array<int, array<string, mixed>> $fields
	 */
	private static function build_form_markup( array $fields ): string {
		return Form_Serializer::serialize( self::items( $fields ) );
	}

	/**
	 * A template's compact field list in the shape the builder speaks.
	 *
	 * The two differ in one word — a template calls a choice list `options`,
	 * where the builder means form-tag options by that and keeps choices under
	 * `choices`. Handing the templates straight over would have produced radio
	 * groups with nothing to choose from.
	 *
	 * @param array<int, array<string, mixed>> $fields
	 * @return array<int, array<string, mixed>>
	 */
	private static function items( array $fields ): array {
		$items = array();

		foreach ( $fields as $field ) {
			$items[] = array(
				'kind'     => 'field',
				'type'     => (string) $field['type'],
				'name'     => (string) $field['name'],
				'label'    => (string) $field['label'],
				'required' => ! empty( $field['required'] ),
				'choices'  => array_map( 'strval', (array) ( $field['options'] ?? array() ) ),
				'options'  => array(),
			);
		}

		$items[] = array(
			'kind'    => 'field',
			'type'    => 'submit',
			'label'   => 'Submit',
			'options' => array(),
		);

		return $items;
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
