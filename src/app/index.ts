import './utils/verifyEnvironmentSecrets.js'
import './utils/instrument.js'

import { createServer } from 'node:http'

import * as Sentry from '@sentry/node'
import MongoStore from 'connect-mongo'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import helmet from 'helmet'
import mongoose from 'mongoose'
import passport from 'passport'

import globalErrorHandler from './middleware/globalErrorHandler.js'
import authRoutes from './routes/auth.js'
import eventRoutes from './routes/events.js'
import serviceRoutes from './routes/service.js'
import userRoutes from './routes/users.js'
import databaseConnector from './utils/databaseConnector.js'
import logger from './utils/logger.js'
import configurePassport from './utils/passportConfig.js'
import { getIPAddress } from './utils/sessionUtils.js'
import { initSocket } from './utils/socket.js'
import config from './utils/setupConfig.js'

const { NODE_ENV, SESSION_SECRET } = process.env as Record<string, string>
const { expressPort, corsConfig, cookieOptions } = config

const app = express()
const server = createServer(app)

logger.info(`Node environment: ${NODE_ENV}`)

app.set('trust proxy', 1)

if (NODE_ENV === 'production' || NODE_ENV === 'staging') {
	await databaseConnector.connectToMongoDB()
}

configurePassport(passport)

const sessionStore = MongoStore.create({
	client: mongoose.connection.getClient(),
	autoRemove: 'interval',
	autoRemoveInterval: 1
})

const sessionMiddleware = session({
	secret: SESSION_SECRET,
	resave: true,
	rolling: true,
	saveUninitialized: false,
	store: sessionStore,
	cookie: cookieOptions
})

app.use(helmet())
app.use(express.json())
app.use(cookieParser())
app.use(cors(corsConfig))
app.use(sessionMiddleware)

await initSocket(server, sessionMiddleware)

app.use(passport.initialize())
app.use(passport.session())

app.use((req, _res, next) => {
	if (req.isAuthenticated() && req.session !== undefined) {
		req.session.ipAddress = getIPAddress(req)
		req.session.lastActivity = new Date()
		req.session.userAgent = req.headers['user-agent']
	}
	next()
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/events', eventRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/service', serviceRoutes)

Sentry.setupExpressErrorHandler(app)

app.use(globalErrorHandler)

export async function shutDown (): Promise<void> {
	logger.info('Closing server...')
	server.close()
	logger.info('Server closed')

	logger.info('Closing session store...')
	await sessionStore.close()
	logger.info('Session store closed')

	logger.info('Closing database connection...')
	await mongoose.connection.close()
	logger.info('Database connection closed')
}

server.listen(expressPort, () => {
	logger.info(`Express is listening at http://localhost:${expressPort}`)
})

process.on('unhandledRejection', async (reason, promise): Promise<void> => {
	const errorMessage = reason instanceof Error ? reason.message : String(reason)
	logger.error(`Unhandled Rejection: ${errorMessage}`, { reason, promise })
	if (NODE_ENV !== 'test') {
		process.exit(1)
	}
})

process.on('uncaughtException', async (err): Promise<void> => {
	logger.error('Uncaught exception', { error: err })
	if (NODE_ENV !== 'test') {
		process.exit(1)
	}
})

export { app, server, sessionStore }
export default app
