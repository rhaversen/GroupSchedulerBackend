import { type NextFunction, type Request, type Response } from 'express'
import passport from 'passport'

import { type IUser } from '../models/User.js'
import logger from '../utils/logger.js'
import { getIPAddress } from '../utils/sessionUtils.js'
import config from '../utils/setupConfig.js'

import { transformUser } from './userController.js'

// Config variables
const { sessionExpiry } = config

export async function loginUserLocal (req: Request, res: Response, next: NextFunction): Promise<void> {
	const email = req.body.email ?? 'N/A'
	const password = req.body.password ?? 'N/A'
	logger.info(`Attempting local login for user: ${email}`)

	// Check if name and password are provided
	if (email === undefined || password === undefined) {
		logger.warn(`User login failed: Missing name or password for user: ${email}`)
		res.status(400).json({
			auth: false,
			error: 'Name and password are required'
		})
		return
	}

	passport.authenticate('user-local', (err: Error | null, user: Express.User | false | null, info?: { message: string }) => { // Adjusted types
		if (err !== null && err !== undefined) {
			logger.error(`User login error during authentication for ${email}:`, { error: err })
			return res.status(500).json({
				auth: false,
				error: err.message
			})
		}

		if (user === null || user === undefined || user === false) {
			const message = info?.message ?? 'Authentication failed'
			logger.warn(`User login failed for ${email}: ${message}`)
			return res.status(401).json({
				auth: false,
				error: message
			})
		}

		req.logIn(user, async (loginErr) => {
			if (loginErr !== null && loginErr !== undefined) {
				logger.error(`User login error during req.logIn for ${email}:`, { error: loginErr })
				return res.status(500).json({
					auth: false,
					error: loginErr.message
				})
			}

			// Store session data
			try {
				req.session.ipAddress = getIPAddress(req)
				req.session.loginTime = new Date()
				req.session.userAgent = req.headers['user-agent']

				// Set maxAge for persistent sessions if requested
				if (req.body.stayLoggedIn === true || req.body.stayLoggedIn === 'true') {
					logger.debug(`Setting persistent session for user ${email}`)
					req.session.cookie.maxAge = sessionExpiry
				}

				// We can assume user is the current user here, since they just logged in
				const transformedUser = await transformUser(user as IUser, true)

				logger.info(`User ${email} (ID: ${transformedUser._id}) logged in successfully. Session ID: ${req.sessionID}`)
				res.status(200).json({
					auth: true,
					user: transformedUser
				})
			} catch (sessionError) {
				logger.error(`User login failed: Error during session handling for ${email}:`, { error: sessionError })
				next(sessionError)
			}
		})
	})(req, res, next)
}

export async function logoutLocal (req: Request, res: Response, next: NextFunction): Promise<void> {
	const sessionId = req.sessionID
	const user = req.user as IUser | null
	logger.info(`Attempting logout for user: ${user?.email}, Session ID: ${sessionId}`)

	req.logout(function (err) {
		if (err !== null && err !== undefined) {
			logger.error(`Logout error during req.logout for Session ID ${sessionId}:`, { error: err })
		}

		req.session.destroy(function (sessionErr) {
			if (sessionErr !== null && sessionErr !== undefined) {
				logger.error(`Logout error during session.destroy for Session ID ${sessionId}:`, { error: sessionErr })
				next(sessionErr)
				return
			}
			res.clearCookie('connect.sid')
			logger.info(`Logout successful for Session ID: ${sessionId}`)
			res.status(200).json({ message: 'Logout successful' })
		})
	})
}

export function ensureAuthenticated (req: Request, res: Response, next: NextFunction): void {
	logger.debug(`Ensuring authentication for request to ${req.originalUrl}, Session ID: ${req.sessionID}`)

	if (!req.isAuthenticated()) {
		logger.warn(`Authentication check failed for Session ID: ${req.sessionID}, Path: ${req.originalUrl}`)
		res.status(401).json({ message: 'Unauthorized' })
		return
	}
	logger.silly(`Authentication check passed for Session ID: ${req.sessionID}`)
	next()
}
