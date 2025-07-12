import { Router } from 'express'
import mongoose from 'mongoose'

import logger from '../utils/logger.js'
import { getSocketStatus } from '../utils/socket.js'

const router = Router()

/**
 * @route GET /api/service/livez
 * @description Check if the server is live.
 * @access Public
 * @returns {number} res.status - The status code of the HTTP response.
 */
router.get('/livez', (_req, res) => {
	res.status(200).send('OK')
})

/**
 * @route GET /api/service/readyz
 * @description Check if the database and Socket.io are ready.
 * @access Public
 * @returns {number} res.status - The status code of the HTTP response.
 */
router.get('/readyz', (_req, res) => {
	const mongooseReady = mongoose.connection.readyState === 1
	const socketReady = getSocketStatus()
	if (!mongooseReady) { logger.error('MongoDB not ready') }
	if (!socketReady) { logger.error('Socket.io not ready') }
	if (mongooseReady && socketReady) {
		res.status(200).send('OK')
	} else {
		res.status(503).send('Database or Socket.io unavailable')
	}
})

/**
 * @route GET /api/service/debug-sentry
 * @description Throw an error to test Sentry.
 * @access Public
 * @returns {number} res.status - The status code of the HTTP response.
 */
router.get('/debug-sentry', () => {
	throw new Error('Sentry error')
})

export default router
