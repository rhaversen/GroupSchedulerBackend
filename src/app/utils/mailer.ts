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
	const subject = 'Welcome! Please confirm your email (24h)'
	const text = `Welcome to RainDate! Let's get you set up.\n\nPlease confirm your email by visiting: ${confirmationLink}\nYour confirmation code: ${confirmationCode}\n\nIf you didn't request this, you can safely ignore this message.`
	const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color:#f5f8ff; padding:24px; border-radius:12px; color:#0f172a;">
	<h2 style="margin:0 0 8px; color:#0f172a;">Welcome to RainDate 👋</h2>
	<p style="margin:0 0 16px;">We’re excited to have you! Please confirm your email to finish setting up your account.</p>
	<a href="${confirmationLink}" style="display:inline-block; padding:12px 20px; background-color:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">Confirm my email</a>
	<p style="margin:16px 0 8px;">Prefer a code? Use: <strong>${confirmationCode}</strong></p>
	<p style="margin:0 0 8px;">If the button doesn’t work, copy and paste this link:</p>
	<p style="word-break: break-all; margin:0 0 16px; color:#1e40af;">${confirmationLink}</p>
	<p style="margin:0; color:#475569;">The link is valid for 24 hours. Didn’t try to sign up? No worries, you can ignore this email.</p>
</div>
`
	await sendEmail(email, subject, text, html)
}

// Function to send password reset email
export const sendPasswordResetEmail = async (email: string, passwordResetLink: string, passwordResetCode: string): Promise<void> => {
	const subject = 'Need a fresh start? Reset your password'
	const text = `We've got your request to reset your password.\n\nReset it here: ${passwordResetLink}\nYour reset code: ${passwordResetCode}\n\nIf you didn't request this, feel free to ignore this email.`
	const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color:#f5f8ff; padding:24px; border-radius:12px; color:#0f172a;">
	<h2 style="margin:0 0 8px; color:#0f172a;">Let’s get you back in</h2>
	<p style="margin:0 0 16px;">Forgot your password? It happens. Reset it safely using the button below.</p>
	<a href="${passwordResetLink}" style="display:inline-block; padding:12px 20px; background-color:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">Reset my password</a>
	<p style="margin:16px 0 8px;">Prefer a code? Use: <strong>${passwordResetCode}</strong></p>
	<p style="margin:0 0 8px;">If the button doesn’t work, copy and paste this link:</p>
	<p style="word-break: break-all; margin:0 0 16px; color:#1e40af;">${passwordResetLink}</p>
	<p style="margin:0; color:#475569;">Didn’t ask for a reset? You can safely ignore this email.</p>
</div>
`

	await sendEmail(email, subject, text, html)
}

// Function to send email not registered email
export const sendEmailNotRegisteredEmail = async (email: string): Promise<void> => {
	const subject = 'We couldn\'t find an account for this email — but why not sign up?'
	const text = 'Looks like someone tried to reset a password for this email, but there\'s no RainDate account yet. No worries! You can create one here: https://raindate.net/signup\n\nIf this wasn\'t you, you can ignore this message.'
	const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color:#f5f8ff; padding:24px; border-radius:12px; color:#0f172a;">
	<h2 style="margin:0 0 8px; color:#0f172a;">We couldn't find your account</h2>
	<p style="margin:0 0 16px;">A password reset was requested for this email, but there isn't an account yet — but why not sign up?</p>
	<a href="https://raindate.net/signup" style="display:inline-block; padding:12px 20px; background-color:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">Create my account</a>
	<p style="margin:16px 0 0; color:#475569;">If this wasn’t you, feel free to ignore this email.</p>
</div>
`

	await sendEmail(email, subject, text, html)
}
