import { type NextFunction, type Request, type Response } from 'express'

import logger from '../utils/logger.js'

const { MICROSERVICE_AUTHORIZATION } = process.env

export function authenticateMicroservice (req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization

	if (authHeader == null) {
		logger.error('Authorization header not found')
		return res.status(401).send({ message: 'Authorization header not found' })
	}

	const [scheme, token] = authHeader.split(' ')

	if (scheme !== 'Bearer' || !token) {
		logger.error('Invalid authorization format')
		return res.status(401).send({ message: 'Invalid authorization format' })
	}

	if (token !== MICROSERVICE_AUTHORIZATION) {
		logger.error('Invalid authorization token')
		return res.status(401).send({ message: 'Invalid authorization token' })
	}

	next()
}

export function ensureAuthenticated (req: Request, res: Response, next: NextFunction): void {
	logger.silly('Ensuring authentication')

	if (!req.isAuthenticated()) {
		res.status(401).json({ message: 'Unauthorized' })
		return
	}
	next()
}
