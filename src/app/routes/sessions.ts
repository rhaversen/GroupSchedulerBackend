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
 */
router.get('/current',
	getCurrentSession
)

/**
 * @route DELETE /api/v1/sessions/:id
 * @description Delete a session by ID.
 * @access Private
 * @param {string} req.params.id - The ID of the session to be deleted.
 * @returns {number} res.status - The status code of the HTTP response.
 */
router.delete('/:id',
	deleteSession
)

export default router
