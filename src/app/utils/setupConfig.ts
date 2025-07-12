import config from 'config'
import { type CorsOptions } from 'cors'
import { type CookieOptions } from 'express'
import { type ConnectOptions } from 'mongoose'

import logger from './logger.js'

const configString = JSON.stringify(config.util.toObject(config), null, 4)

// Log the configs used
logger.debug(`Using configs:\n${configString}`)

const AppConfig = {
	expressPort: config.get('expressPort') as number,
	mongooseOpts: config.get('mongoose.options') as ConnectOptions,
	maxRetryAttempts: config.get('mongoose.retrySettings.maxAttempts') as number,
	retryInterval: config.get('mongoose.retrySettings.interval') as number, // in milliseconds
	bcryptSaltRounds: config.get('bcrypt.saltRounds') as number,
	corsConfig: config.get('cors') as CorsOptions,
	cookieOptions: config.get('cookieOptions') as CookieOptions,
	sessionExpiry: config.get('session.expiry') as number,
	redisPrefix: config.get('redis.prefix') as string,
	verificationExpiry: config.get('user.verificationExpiry') as number,
	passwordResetExpiry: config.get('user.passwordResetExpiry') as number
}

export default AppConfig
