// Verify that all environment secrets are set
import './utils/verifyEnvironmentSecrets.js'

// Use Sentry
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
import serviceRoutes from './routes/service.js'
import sessionRoutes from './routes/sessions.js'
import userRoutes from './routes/users.js'
import databaseConnector from './utils/databaseConnector.js'
import logger from './utils/logger.js'
import configurePassport from './utils/passportConfig.js'
import { initializeSessionChangeStream, closeSessionChangeStream } from './utils/sessionChangeStream.js'
import { getIPAddress } from './utils/sessionUtils.js'
import config from './utils/setupConfig.js'
import { initSocket } from './utils/socket.js'

const { NODE_ENV, SESSION_SECRET } = process.env as Record<string, string>

const {
	expressPort,
	corsConfig,
	cookieOptions
} = config

const app = express() // Create an Express application
const server = createServer(app) // Create an HTTP server

// Logging environment
logger.info(`Node environment: ${NODE_ENV}`)

// Setup
await initSocket(server) // Initialize socket.io
app.set('trust proxy', 1) // Trust the first proxy (NGINX)

// Connect to MongoDB in production and staging environment
if (NODE_ENV === 'production' || NODE_ENV === 'staging') {
	await databaseConnector.connectToMongoDB()
}

// Setup Change Stream for Sessions after DB connection and model initialization
initializeSessionChangeStream()

// Middleware
app.use(helmet()) // Security headers
app.use(express.json()) // for parsing application/json
app.use(cookieParser()) // For parsing cookies

// Apply cors config to all other routes
app.use(cors(corsConfig))

// Create a session store
const sessionStore = MongoStore.create({
	client: mongoose.connection.getClient(), // Use the existing connection
	autoRemove: 'interval', // Remove expired sessions
	autoRemoveInterval: 1 // 1 minute
})

// Apply session management middleware
app.use(session({ // Session management
	resave: true, // Save the updated session back to the store
	rolling: true, // Reset the cookie max-age on every request
	secret: SESSION_SECRET, // Secret for signing session ID cookie
	saveUninitialized: false, // Do not save session if not authenticated
	store: sessionStore, // Store session in MongoDB
	cookie: cookieOptions
}))

// Apply and configure Passport middleware
app.use(passport.initialize()) // Initialize Passport
app.use(passport.session()) // Passport session handling
configurePassport(passport) // Use passportConfig

// Rate limiters

// Middleware to update session on each request
app.use((req, _res, next) => {
	if (req.isAuthenticated() && req.session !== undefined) {
		req.session.ipAddress = getIPAddress(req)
		req.session.lastActivity = new Date()
		req.session.userAgent = req.headers['user-agent']
	}
	next()
})

// Use all routes
app.use('/api/service', serviceRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/sessions', sessionRoutes)
app.use('/api/v1/users', userRoutes)

// Sentry error handler
Sentry.setupExpressErrorHandler(app)

// Global error handler middleware
app.use(globalErrorHandler)

// Listen
server.listen(expressPort, () => {
	logger.info(`Express is listening at http://localhost:${expressPort}`)
})

// Handle unhandled rejections outside middleware
process.on('unhandledRejection', async (reason, promise): Promise<void> => {
	const errorMessage = reason instanceof Error ? reason.message : String(reason)
	logger.error(`Unhandled Rejection: ${errorMessage}`, { reason, promise })
	// eslint-disable-next-line n/no-process-exit
	process.exit(1) // Exit the process with failure code
})

// Handle uncaught exceptions outside middleware
process.on('uncaughtException', async (err): Promise<void> => {
	logger.error('Uncaught exception', { error: err })
	// eslint-disable-next-line n/no-process-exit
	process.exit(1) // Exit the process with failure code
})

// Shutdown function
export async function shutDown (): Promise<void> {
	logger.info('Closing server...')
	server.close()
	logger.info('Server closed')

	logger.info('Closing session change stream...')
	await closeSessionChangeStream()
	logger.info('Session change stream closed.')

	logger.info('Closing session store...')
	await sessionStore.close()
	logger.info('Session store closed')

	logger.info('Closing database connection...')
	await mongoose.connection.close()
	logger.info('Database connection closed')

	logger.info('Shutdown completed')
}

export { server, sessionStore }
export default app
