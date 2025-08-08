// Node.js built-in modules

// Third-party libraries
import nodemailer from 'nodemailer'

// Own modules
import logger from './logger.js'
import config from './setupConfig.js'

// Config
const {
	emailPort,
	emailFrom,
	verificationExpiry,
	passwordResetExpiry
} = config

// Format milliseconds into a friendly duration string (e.g., 24 hours, 90 minutes)
const formatDuration = (ms: number): string => {
	const seconds = Math.floor(ms / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	if (days >= 1) { return `${days} day${days === 1 ? '' : 's'}` }
	if (hours >= 1) { return `${hours} hour${hours === 1 ? '' : 's'}` }
	if (minutes >= 1) { return `${minutes} minute${minutes === 1 ? '' : 's'}` }
	return `${seconds} second${seconds === 1 ? '' : 's'}`
}

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
	const expiresIn = formatDuration(verificationExpiry)
	const subject = `Welcome! Please confirm your email (${expiresIn})`
	const text = `
Welcome to RainDate! Let's get you set up.

Please confirm your email by visiting: ${confirmationLink}
Your confirmation code: ${confirmationCode}
Prefer a code? Go to https://raindate.net/confirm and enter your code.

IMPORTANT: This link/code expires in ${expiresIn}. If you don't confirm in time, the unverified account will be deleted.

If you didn't request this, you can safely ignore this message.
`.trim()
	const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color:#f5f8ff; padding:24px; border-radius:12px; color:#0f172a;">
	<h2 style="margin:0 0 8px; color:#0f172a;">Welcome to RainDate 👋</h2>
	<p style="margin:0 0 16px;">We’re excited to have you! Please confirm your email to finish setting up your account.</p>
	<a href="${confirmationLink}" style="display:inline-block; padding:12px 20px; background-color:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">Confirm my email</a>
	<p style="margin:16px 0 8px;">Prefer a code? Go to <a href="https://raindate.net/confirm" style="color:#2563eb; text-decoration:underline;">https://raindate.net/confirm</a> and enter: <strong>${confirmationCode}</strong></p>
	<p style="margin:0 0 8px;">If the button doesn’t work, copy and paste this link:</p>
	<p style="word-break: break-all; margin:0 0 16px; color:#1e40af;">${confirmationLink}</p>
	<div style="margin:8px 0 0; padding:12px; background-color:#fef2f2; border:1px solid #fecaca; border-radius:8px; color:#991b1b;">
		<strong>Important:</strong> This link/code expires in ${expiresIn}. If you don’t confirm in time, the unverified account will be deleted.
	</div>
	<p style="margin:8px 0 0; color:#64748b;">Didn’t try to sign up? No worries, you can ignore this email.</p>
</div>
`.trim()
	await sendEmail(email, subject, text, html)
}

// Function to send password reset email
export const sendPasswordResetEmail = async (email: string, passwordResetLink: string, passwordResetCode: string): Promise<void> => {
	const expiresIn = formatDuration(passwordResetExpiry)
	const subject = 'Need a fresh start? Reset your password'
	const text = `
We've got your request to reset your password.

Reset it here: ${passwordResetLink}
Your reset code: ${passwordResetCode}
Prefer a code? Go to https://raindate.net/reset-password and enter your code.

This link/code expires in ${expiresIn}. After that, you'll need to request a new reset.

If you didn't request this, feel free to ignore this email.
`.trim()
	const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color:#f5f8ff; padding:24px; border-radius:12px; color:#0f172a;">
	<h2 style="margin:0 0 8px; color:#0f172a;">Let’s get you back in</h2>
	<p style="margin:0 0 16px;">Forgot your password? It happens. Reset it safely using the button below.</p>
	<a href="${passwordResetLink}" style="display:inline-block; padding:12px 20px; background-color:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">Reset my password</a>
	<p style="margin:16px 0 8px;">Prefer a code? Go to <a href="https://raindate.net/reset-password" style="color:#2563eb; text-decoration:underline;">https://raindate.net/reset-password</a> and enter: <strong>${passwordResetCode}</strong></p>
	<p style="margin:0 0 8px;">If the button doesn’t work, copy and paste this link:</p>
	<p style="word-break: break-all; margin:0 0 16px; color:#1e40af;">${passwordResetLink}</p>
	<p style="margin:0; color:#475569;">This link/code expires in ${expiresIn}. After that, you'll need to request a new reset.</p>
	<p style="margin:8px 0 0; color:#64748b;">Didn’t ask for a reset? You can safely ignore this email.</p>
</div>
`.trim()

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
