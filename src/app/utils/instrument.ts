import * as Sentry from '@sentry/node'

const dsn = process.env.SENTRY_DSN

if (dsn != null && dsn !== '') {
	Sentry.init({
		dsn,
		enabled: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
	})
}

export {}
