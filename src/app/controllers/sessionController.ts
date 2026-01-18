import { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'

import Session, { type ISession, type ISessionFrontend } from '../models/Session.js'
import { IUser } from '../models/User.js'
import logger from '../utils/logger.js'

export interface ParsedSessionData {
	cookie: {
		originalMaxAge: number | null
		expires: string | null // Can be null
		secure: boolean
		httpOnly: boolean
		path: string
	}
	passport?: {
		user: string // User ID (User ObjectId)
	}
	ipAddress: string
	loginTime: Date
	lastActivity: Date
	userAgent: string
}

export function transformSession (
	sessionDoc: ISession
): ISessionFrontend {
	try {
		const sessionData = JSON.parse(sessionDoc.session) as ParsedSessionData
		const userId = sessionData?.passport?.user?.toString() ?? null
		const sessionExpires = sessionData.cookie.expires
		const originalMaxAge = sessionData.cookie.originalMaxAge

		return {
			_id: sessionDoc._id,
			docExpires: sessionDoc.expires, // Use expires from the session document, which reflects the actual DB expiry
			sessionExpires: sessionExpires != null ? new Date(sessionExpires) : null,
			stayLoggedIn: originalMaxAge != null && originalMaxAge > 0, // Determine stayLoggedIn based on originalMaxAge (null means session is not persistent)
			userId,
			ipAddress: sessionData.ipAddress,
			loginTime: sessionData.loginTime,
			lastActivity: sessionData.lastActivity,
			userAgent: sessionData.userAgent
		}
	} catch (error) {
		logger.error(`Error transforming session document ID ${sessionDoc._id}:`, { error })
		// Return a default/error structure
		// Returning a minimal structure to avoid crashing consumers
		return {
			_id: sessionDoc._id,
			docExpires: sessionDoc.expires,
			sessionExpires: null,
			stayLoggedIn: false,
			userId: null,
			ipAddress: 'Error',
			loginTime: new Date(0),
			lastActivity: new Date(0),
			userAgent: 'Error parsing session'
		}
	}
}

export async function getSessions (req: Request, res: Response, next: NextFunction): Promise<void> {
	logger.debug('Getting all sessions for authenticated user')

	const user = req.user as IUser | undefined

	if (user === undefined) {
		logger.warn('Get sessions failed: No authenticated user found in request.')
		res.status(401).json({ error: 'No authenticated user found' })
		return
	}

	try {
		const sessions = await Session.find({})
		logger.debug(`Found ${sessions.length} session documents in DB`)

		const transformedSessions = sessions.map((sessionDoc) =>
			transformSession(sessionDoc as ISession) // Cast needed with lean
		)

		const userSessions = transformedSessions.filter((session) => session.userId === user._id.toString())

		logger.debug(`Retrieved and transformed ${userSessions.length} sessions`)
		res.status(200).json(userSessions)
	} catch (error) {
		logger.error('Failed to get sessions', { error })
		next(error)
	}
}

export async function getCurrentSession (req: Request, res: Response, next: NextFunction): Promise<void> {
	const sessionId = req.sessionID
	logger.debug(`Getting current session: ID ${sessionId}`)

	if (!sessionId) {
		// This case might occur if session middleware failed or cookie is missing
		logger.warn('Get current session failed: No session ID found in request.')
		res.status(401).json({ error: 'No session ID found in request' })
		return
	}

	try {
		// Fetch directly using the current session ID
		const currentSession = await Session.findById(sessionId).lean().exec()

		if (currentSession === null) {
			// Session ID exists but not found in DB (e.g., expired and removed, or invalid ID)
			logger.warn(`Get current session failed: Session not found in DB. ID: ${sessionId}`)
			res.status(404).json({ error: 'Session not found' })
			return
		}

		const transformedSession = transformSession(currentSession as ISession) // Cast needed with lean
		logger.debug(`Retrieved current session successfully: ID ${sessionId}`)
		res.status(200).json(transformedSession)
	} catch (error) {
		logger.error(`Get current session failed: Error retrieving session ID ${sessionId}`, { error })
		next(error)
	}
}

export async function deleteSession (req: Request, res: Response, next: NextFunction): Promise<void> {
	const sessionId = req.params.id
	const user = req.user as IUser | undefined

	if (user === undefined) {
		logger.warn('Delete session failed: No authenticated user found in request.')
		res.status(401).json({ error: 'No authenticated user found' })
		return
	}

	logger.info(`User ${user?.email} ID ${user.id} attempting to delete session: ID ${sessionId}`)

	const sessionIdStr = Array.isArray(sessionId) ? sessionId[0] : sessionId

	if (!mongoose.Types.ObjectId.isValid(sessionIdStr) && typeof sessionIdStr !== 'string') {
		logger.warn(`Delete session failed: Invalid Session ID format: ${sessionIdStr}`)
		res.status(400).json({ error: 'Invalid Session ID format' })
		return
	}

	try {
		// Find the session first to confirm existence
		const session = await Session.findById(sessionIdStr).exec()

		if (session === null) {
			logger.warn(`Delete session failed: Session not found. ID: ${sessionId}`)
			res.status(404).json({ error: 'Session not found' })
			return
		}

		const transformedSession = transformSession(session)

		if (transformedSession.userId !== user.id) {
			logger.warn(`Delete session failed: User ID mismatch. Session ID: ${sessionId}, User ID: ${user._id}`)
			res.status(403).json({ error: 'Unauthorized' })
			return
		}

		// Delete the session from the database
		await session.deleteOne()
		logger.info(`Session deleted successfully from DB: ID ${sessionId}`)

		// Respond 204 No Content
		res.status(204).send()
	} catch (error) {
		logger.error(`Delete session failed: Error during deletion process for ID ${sessionId}`, { error })
		next(error)
	}
}
