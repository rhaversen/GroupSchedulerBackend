import config from 'config'
import { type CorsOptions } from 'cors'
import { type CookieOptions } from 'express'
import { type ConnectOptions } from 'mongoose'

import logger from './logger.js'

const configString = JSON.stringify(config.util.toObject(config), null, 4)

logger.debug(`Using configs:\n${configString}`)

const AppConfig = {
	expressPort: config.get('expressPort') as number,
	mongooseOpts: { ...config.get('mongoose.options') } as ConnectOptions,
	maxRetryAttempts: config.get('mongoose.retrySettings.maxAttempts') as number,
	retryInterval: config.get('mongoose.retrySettings.interval') as number,
	retryWrites: config.get('mongoose.options.retryWrites') as string,
	w: config.get('mongoose.options.w') as string,
	appName: config.get('mongoose.options.appName') as string,
	corsConfig: config.get('cors') as CorsOptions,
	cookieOptions: config.get('cookieOptions') as CookieOptions,
	sessionExpiry: config.get('session.expiry') as number,
	redisPrefix: config.get('redis.prefix') as string
}

export default AppConfig
