// Node.js built-in modules
import http from 'http'

// Third-party libraries
import express from 'express'
import mongoSanitize from 'express-mongo-sanitize'
import RateLimit from 'express-rate-limit'
import passport from 'passport'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import lusca from 'lusca'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'

// Own modules
import logger from './utils/logger.js'
import globalErrorHandler from './middleware/globalErrorHandler.js'
import configurePassport from './utils/passportConfig.js'
import { initializeDatabaseConnection } from './database/databaseHandler.js'
// import csrfProtection from './utils/csrfProtection.js'
import config from './utils/setupConfig.js'
import loadVaultSecrets from './utils/vault.js'

// Import routes
import userRoutes from './routes/users.js'
import eventRoutes from './routes/events.js'
import blockedDatesRoutes from './routes/blockedDates.js'

// Load environment
await loadVaultSecrets()

// Global variables and setup
const app = express()
const index = http.createServer(app)

// Configs
const {
    helmetCSP,
    helmetHSTS,
    corsOpts,
    relaxedApiLimiterConfig,
    sensitiveApiLimiterConfig,
    expressPort,
    cookieOptions
} = config

// Helmet security
/* if (typeof helmetCSP === 'object' && helmetCSP !== null) {
    app.use(helmet.contentSecurityPolicy(helmetCSP))
} else {
    logger.warn('Helmet ContentSecurityPolicyOptions is not set! App not using CSP!')
}
// Only use HTTPS
if (typeof helmetHSTS === 'object' && helmetHSTS !== null) {
    app.use(helmet.strictTransportSecurity(helmetHSTS))
} else {
    logger.warn('Helmet StrictTransportSecurityOptions is not set! App not using HSTS!')
} */

// Connect to MongoDB (Automatically connect to in-memory replica set if not production environment)
await initializeDatabaseConnection()

// Global middleware
app.use(helmet()) // Security headers
app.use(express.json()) // for parsing application/json
app.use(cookieParser()) // For parsing cookies
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(session({ // Session management
    resave: true, // Save the updated session back to the store
    rolling: true, // Reset the cookie max-age on every request
    secret: process.env.SESSION_SECRET!,
    saveUninitialized: true,
    store: MongoStore.create({ client: mongoose.connection.getClient() as any }), // Property 'serverMonitoringMode' is missing in options for mongoose version of mongodb but is required in mongodb used by connect-mongo. it is not needed, therefore type assertion "any"
    cookie: cookieOptions
}))
app.use(passport.initialize()) // Initialize Passport
app.use(passport.session()) // Passport session handling
configurePassport(passport) // Use passportConfig
app.use(mongoSanitize()) // Sanitize MongoDB queries
app.use(cors({
    ...corsOpts,
    credentials: true
}))

/* app.use(lusca.csrf({
    secret: process.env.CSRF_TOKEN
})) */

// Create rate limiters
const relaxedApiLimiter = RateLimit(relaxedApiLimiterConfig)
const sensitiveApiLimiter = RateLimit(sensitiveApiLimiterConfig)

// Endpoint to fetch the csrf token
/* app.get('/csrf-token', sensitiveApiLimiter, (req, res) => {
    res.json({ csrfToken: req.session.csrfToken });
}); */

// App will be behind reverse proxy forwarding calls to domain.com/api/ to backend

// Use all routes and with relaxed limiter
app.use('/v1/users', relaxedApiLimiter, userRoutes)
app.use('/v1/users/blockedDates', relaxedApiLimiter, blockedDatesRoutes)
app.use('/v1/events', relaxedApiLimiter, eventRoutes)

// Apply stricter rate limiters to routes
app.use('/v1/users/update-password', sensitiveApiLimiter)
app.use('/v1/users/login', sensitiveApiLimiter)
app.use('/v1/users/signup', sensitiveApiLimiter)
app.use('/v1/users/', sensitiveApiLimiter)

app.get('/', (req, res) => {
    logger.debug('pong')
    res.send('pong')
})

// Global error handler middleware
app.use(globalErrorHandler)

// Start index
index.listen(expressPort, () => {
    logger.info(`App listening at http://localhost:${expressPort}`)
})

process.on('unhandledRejection', (reason, promise) => {
    // Attempt to get a string representation of the promise
    const promiseString = JSON.stringify(promise) || 'a promise'

    // Get a detailed string representation of the reason
    const reasonDetail = reason instanceof Error ? reason.stack ?? reason.message : JSON.stringify(reason)

    // Log the detailed error message
    logger.error(`Unhandled Rejection at: ${promiseString}, reason: ${reasonDetail}`)

    shutDown().catch(error => {
        // If 'error' is an Error object, log its stack trace; otherwise, convert to string
        const errorDetail = error instanceof Error ? error.stack ?? error.message : String(error)
        logger.error(`An error occurred during shutdown: ${errorDetail}`)
        process.exit(1)
    })
})

// Handle uncaught exceptions outside middleware
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err)
    shutDown().catch(error => {
        logger.error('An error occurred during shutdown:', error)
        process.exit(1)
    })
})

// Assigning shutdown function to SIGINT signal
process.on('SIGINT', () => {
    logger.info('Received SIGINT')
    shutDown().catch(error => {
        logger.error('An error occurred during shutdown:', error)
        process.exit(1)
    })
})

// Shutdown function
async function shutDown () {
    try {
        logger.info('Starting database disconnection...')
        await mongoose.disconnect()
        logger.info('Shutdown completed')
        process.exit(0) // Exit with code 0 indicating successful termination
    } catch (error) {
        logger.error('An error occurred during shutdown:', error)
        process.exit(1) // Exit with code 1 indicating termination with error
    }
}

export type AppType = typeof app
export type ShutDownType = typeof shutDown
export { app, shutDown }
