import { Router } from 'express'
import mongoose from 'mongoose'

import logger from '../utils/logger.js'
import { getSocketStatus } from '../utils/socket.js'

const router = Router()

router.get('/livez', (_req, res) => {
	res.status(200).send('OK')
})

router.get('/readyz', (_req, res) => {
	const mongooseReady = mongoose.connection.readyState === 1 || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
	const socketReady = getSocketStatus()
	if (!mongooseReady) { logger.error('MongoDB not ready') }
	if (!socketReady) { logger.error('Socket.io not ready') }
	if (mongooseReady && socketReady) {
		res.status(200).send('OK')
	} else {
		res.status(503).send('Database or Socket.io unavailable')
	}
})

router.get('/debug-sentry', () => {
	throw new Error('Sentry error')
})

export default router
