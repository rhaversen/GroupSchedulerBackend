import 'process'

import logger from './logger.js'

const envSecrets = [
	// Database
	'DB_NAME',
	'DB_USER',
	'DB_PASSWORD',
	'DB_HOST',
	// Misc
	'BETTERSTACK_LOG_TOKEN',
	'NODE_ENV',
	'SESSION_SECRET',
	'SENTRY_DSN',
	// Redis
	'REDIS_HOST',
	'REDIS_PORT',
	'REDIS_PASSWORD',
	// Email
	'SMTP_SERVER',
	'SMTP_LOGIN',
	'SMTP_KEY'
]

const envSecretsDev = [
	'NODE_ENV',
	'SESSION_SECRET',
	// Email
	'SMTP_SERVER',
	'SMTP_LOGIN',
	'SMTP_KEY'
]

const envSecretsTest = [
	'NODE_ENV',
	'SESSION_SECRET'
]

// Verify that all environment secrets are set
const missingSecrets = [] as string[]
if (process.env.NODE_ENV === 'development') {
	envSecretsDev.forEach((secret) => {
		if (process.env[secret] === undefined) {
			missingSecrets.push(secret)
		}
	})
} else if (process.env.NODE_ENV === 'test') {
	envSecretsTest.forEach((secret) => {
		if (process.env[secret] === undefined) {
			missingSecrets.push(secret)
		}
	})
} else if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
	envSecrets.forEach((secret) => {
		if (process.env[secret] === undefined) {
			missingSecrets.push(secret)
		}
	})
}

if (missingSecrets.length > 0) {
	const errorMessage = `Missing environment secrets: ${missingSecrets.join(', ')}`
	logger.error('Exiting due to missing environment secrets', { missingSecrets })
	throw new Error(errorMessage)
}

logger.info('All environment secrets are set')

export { }
