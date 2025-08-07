import { Router } from 'express'

import {
	deleteSession,
	getCurrentSession,
	getSessions
} from '../controllers/sessionController.js'

const router = Router()

/**
 * @route GET /api/v1/sessions
 * @description Get all sessions of authenticated user.
 * @access Private
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Array<Object>} res.body - An array of session objects.
 * @returns {string} res.body[]._id - Session ID.
 * @returns {Date} res.body[].docExpires - Document expiry date.
 * @returns {Date|null} res.body[].sessionExpires - Session expiry date (null for non-persistent sessions).
 * @returns {boolean} res.body[].stayLoggedIn - Whether session is persistent.
 * @returns {string|null} res.body[].userId - User ID of session owner.
 * @returns {string} res.body[].ipAddress - IP address of the session.
 * @returns {Date} res.body[].loginTime - Login timestamp.
 * @returns {Date} res.body[].lastActivity - Last activity timestamp.
 * @returns {string} res.body[].userAgent - User agent string.
 */
router.get('/',
	getSessions
)

/**
 * @route GET /api/v1/sessions/current
 * @description Get the current session.
 * @access Private
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The current session object.
 * @returns {string} res.body._id - Session ID.
 * @returns {Date} res.body.docExpires - Document expiry date.
 * @returns {Date|null} res.body.sessionExpires - Session expiry date (null for non-persistent sessions).
 * @returns {boolean} res.body.stayLoggedIn - Whether session is persistent.
 * @returns {string|null} res.body.userId - User ID of session owner.
 * @returns {string} res.body.ipAddress - IP address of the session.
 * @returns {Date} res.body.loginTime - Login timestamp.
 * @returns {Date} res.body.lastActivity - Last activity timestamp.
 * @returns {string} res.body.userAgent - User agent string.
 */
router.get('/current',
	getCurrentSession
)

/**
 * @route DELETE /api/v1/sessions/:id
 * @description Delete a session by ID.
 * @access Private
 * @param {string} req.params.id - The ID of the session to be deleted.
 * @returns {number} res.status - The status code of the HTTP response (204 No Content).
 */
router.delete('/:id',
	deleteSession
)

export default router
