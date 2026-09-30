/* eslint-disable @typescript-eslint/no-explicit-any */
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { Logtail } from '@logtail/node'
import { createLogger, format as _format, transports as _transports } from 'winston'

const { BETTERSTACK_LOG_TOKEN } = process.env as Record<string, string>

const _filename = fileURLToPath(import.meta.url)
const _dirname = dirname(_filename)
const logDirectory = join(_dirname, (['production', 'staging'].includes(process.env.NODE_ENV ?? '') ? './logs/' : '../../logs/'))
const logLevel = {
	development: 'silly',
	production: 'info',
	staging: 'info',
	test: 'debug'
}

const winstonLogger = createLogger({
	levels: {
		error: 0,
		warn: 1,
		info: 2,
		http: 3,
		verbose: 4,
		debug: 5,
		silly: 6
	},
	format: _format.combine(
		_format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:SSS' }),
		_format.json()
	),
	defaultMeta: { service: 'group-scheduler-backend' },
	transports: [
		new _transports.File({ filename: join(logDirectory, 'error.log'), level: 'error' }),
		new _transports.File({ filename: join(logDirectory, 'info.log'), level: 'info' }),
		new _transports.File({ filename: join(logDirectory, 'combined.log'), level: 'silly' }),
		new _transports.Console({
			format: _format.combine(
				_format.colorize(),
				_format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
				_format.printf((logObject) => `${logObject.timestamp} ${logObject.level}: ${logObject.message}`)
			),
			level: logLevel[process.env.NODE_ENV as keyof typeof logLevel] ?? 'info'
		})
	]
})

let betterStackLogger: Logtail | null = null

const logToBetterStackNonBlocking = (
	level: 'error' | 'warn' | 'info' | 'debug',
	message: string,
	context?: Record<string, any>
): void => {
	if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
		return
	}

	if (!betterStackLogger) {
		betterStackLogger = new Logtail(BETTERSTACK_LOG_TOKEN)
	}

	let sanitizedContext = context
	if (context?.error instanceof Error) {
		sanitizedContext = { ...context }
		const err = context.error
		sanitizedContext.error = {
			message: err.message,
			stack: err.stack,
			name: err.name
		}
	}

	betterStackLogger[level](message, sanitizedContext).catch((error) => {
		winstonLogger.error(`Error logging to BetterStack: ${error instanceof Error ? error.toString() : String(error)}`, { error })
	})
}

const logger = {
	error: (message: string, context?: Record<string, any>) => {
		winstonLogger.error(message, context)
		logToBetterStackNonBlocking('error', message, context)
	},
	warn: (message: string, context?: Record<string, any>) => {
		winstonLogger.warn(message, context)
		logToBetterStackNonBlocking('warn', message, context)
	},
	info: (message: string, context?: Record<string, any>) => {
		winstonLogger.info(message, context)
		logToBetterStackNonBlocking('info', message, context)
	},
	http: (message: string, context?: Record<string, any>) => {
		winstonLogger.http(message, context)
		logToBetterStackNonBlocking('debug', message, context)
	},
	verbose: (message: string, context?: Record<string, any>) => {
		winstonLogger.verbose(message, context)
		logToBetterStackNonBlocking('debug', message, context)
	},
	debug: (message: string, context?: Record<string, any>) => {
		winstonLogger.debug(message, context)
		logToBetterStackNonBlocking('debug', message, context)
	},
	silly: (message: string, context?: Record<string, any>) => {
		winstonLogger.silly(message, context)
		logToBetterStackNonBlocking('debug', message, context)
	}
}

export default logger
