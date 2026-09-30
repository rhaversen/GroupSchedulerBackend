import { type NextFunction, type Request, type Response } from 'express'

import logger from '../utils/logger.js'

export default function globalErrorHandler (
	error: Error,
	req: Request,
	res: Response,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_next: NextFunction
): void {
	logger.error('Unhandled error', { error })
	res.status(500).json({ error: 'An unexpected error occurred' })
}
