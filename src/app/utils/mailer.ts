// Node.js built-in modules

// Third-party libraries
import nodemailer from 'nodemailer'

// Own modules
import logger from './logger.js'
import config from './setupConfig.js'

// Config
const {
	emailPort,
	emailFrom
} = config

// Generic function to send email
export const sendEmail = async (to: string, subject: string, text: string, html = ''): Promise<void> => {
	if (process.env.NODE_ENV === 'test') { return }

	// Configure transporter
	logger.silly('Creating email transporter')
	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_SERVER,
		port: emailPort,
		secure: false, // true for 465, false for other ports
		auth: {
			user: process.env.SMTP_LOGIN,
			pass: process.env.SMTP_KEY
		}
	})

	logger.silly('Created transporter')

	const mailOptions = {
		from: emailFrom,
		to,
		subject,
		text,
		html
	}

	logger.debug('Sending email')
	await transporter.sendMail(mailOptions)

	logger.silly('Closing email transporter')
	transporter.close()
	logger.silly('Email transporter closed')
}

// Function to send confirmation email
export const sendConfirmationEmail = async (email: string, confirmationLink: string, confirmationCode: string): Promise<void> => {
	const subject = 'Please confirm your email address within 24 hours'
	const text = `Please confirm your email by pasting this link into your browser: ${confirmationLink}\nYour confirmation code is: ${confirmationCode}\n(Your email inbox does not support HTML)`
	const html = `
<div style="font-family:Arial, sans-serif; background-color:#f7f7f7; padding:20px; border-radius:5px;">
	<h2>Confirm Your Email Address</h2>
	<p>Please confirm your email by clicking the button below:</p>
	<a href="${confirmationLink}" style="display:inline-block; padding:10px 20px; background-color:#007bff; color:#fff; text-decoration:none; border-radius:5px;">Confirm Email</a>
	<p>Your confirmation code is: <strong>${confirmationCode}</strong></p>
	<p>If the button does not work, copy and paste the following URL:</p>
	<p style="word-break: break-all;">${confirmationLink}</p>
	<p>This link is valid for 24 hours.</p>
</div>
`
	await sendEmail(email, subject, text, html)
}

// Function to send password reset email
export const sendPasswordResetEmail = async (email: string, passwordResetLink: string, passwordResetCode: string): Promise<void> => {
	const subject = 'Password reset requested'
	const text = `Please reset your password by pasting this link into your browser: ${passwordResetLink}\nYour password reset code is: ${passwordResetCode}\nIf you didn't request a password reset, it's safe to ignore this mail.\n(Your email inbox does not support HTML)`
	const html = `
<div style="font-family:Arial, sans-serif; background-color:#f7f7f7; padding:20px; border-radius:5px;">
	<h2>Password Reset Request</h2>
	<p>To reset your password, click the button below:</p>
	<a href="${passwordResetLink}" style="display:inline-block; padding:10px 20px; background-color:#28a745; color:#fff; text-decoration:none; border-radius:5px;">Reset Password</a>
	<p>Your password reset code is: <strong>${passwordResetCode}</strong></p>
	<p>If the button does not work, copy and paste this URL:</p>
	<p style="word-break: break-all;">${passwordResetLink}</p>
	<p>If you didn't request a password reset, please ignore this email.</p>
</div>
`

	await sendEmail(email, subject, text, html)
}

// Function to send email not registered email
export const sendEmailNotRegisteredEmail = async (email: string): Promise<void> => {
	const subject = 'Email not signed up'
	const text = 'A password reset has been requested for this email, but it has not been used to sign up for a user on raindate.net. Please sign up instead. \n If you didn\'t request a password reset, it\'s safe to ignore this mail. Someone probably entered your email by mistake.'
	const html = `
<div style="font-family:Arial, sans-serif; background-color:#f7f7f7; padding:20px; border-radius:5px;">
	<h2>Email Not Registered</h2>
	<p>A password reset was requested for this email, but it is not registered. Please sign up to enjoy our services.</p>
	<a href="https://raindate.net/signup" style="display:inline-block; padding:10px 20px; background-color:#dc3545; color:#fff; text-decoration:none; border-radius:5px;">Sign Up</a>
	<p>If you didn't request this, please ignore this email.</p>
</div>
`

	await sendEmail(email, subject, text, html)
}
