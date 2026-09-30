import { type NextFunction, type Request, type Response } from 'express'
import passport from 'passport'

import UserModel, { type IUser } from '../models/User.js'
import logger from '../utils/logger.js'
import { getIPAddress } from '../utils/sessionUtils.js'
import config from '../utils/setupConfig.js'

const { sessionExpiry } = config

function toPublicUser (user: IUser) {
	return { _id: user.id, username: user.username, email: user.email }
}

export async function register (req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { username, email, password } = req.body as { username: string; email: string; password: string }
		logger.info(`Attempting registration for user: ${email}`)
		const user = await UserModel.create({ username, email, password })
		req.login(user, err => {
			if (err != null) { next(err); return }
			req.session.ipAddress = getIPAddress(req)
			req.session.loginTime = new Date()
			req.session.lastActivity = new Date()
			req.session.userAgent = req.headers['user-agent']
			req.session.type = 'user'
			req.session.cookie.maxAge = sessionExpiry
			res.status(201).json({ user: toPublicUser(user) })
		})
	} catch (error) {
		next(error)
	}
}

export function login (req: Request, res: Response, next: NextFunction): void {
	const email = req.body.email ?? 'N/A'
	logger.info(`Attempting local login for user: ${email}`)
	passport.authenticate('local', (err: Error | null, user: IUser | false) => {
		if (err != null) { next(err); return }
		if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return }
		req.login(user, loginErr => {
			if (loginErr != null) { next(loginErr); return }
			req.session.ipAddress = getIPAddress(req)
			req.session.loginTime = new Date()
			req.session.lastActivity = new Date()
			req.session.userAgent = req.headers['user-agent']
			req.session.type = 'user'
			req.session.cookie.maxAge = sessionExpiry
			res.status(200).json({ user: toPublicUser(user) })
		})
	})(req, res, next)
}

export function logout (req: Request, res: Response, next: NextFunction): void {
	logger.info(`Attempting logout for session ID: ${req.sessionID}`)
	req.logout(err => {
		if (err != null) { next(err); return }
		req.session.destroy(sessionErr => {
			if (sessionErr != null) { next(sessionErr); return }
			res.clearCookie('connect.sid')
			res.status(200).json({ message: 'Logged out' })
		})
	})
}

export function status (req: Request, res: Response): void {
	const user = req.user as IUser | undefined
	res.status(200).json({ user: user != null ? toPublicUser(user) : null })
}

export function ensureAuthenticated (req: Request, res: Response, next: NextFunction): void {
	if (!req.isAuthenticated()) {
		res.status(401).json({ error: 'Unauthorized' })
		return
	}
	next()
}
