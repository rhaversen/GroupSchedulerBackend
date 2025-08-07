import { Router } from 'express'

import {
	ensureAuthenticated,
	loginUserLocal,
	logoutLocal
} from '../controllers/authController.js'

const router = Router()

/**
 * @route POST /api/v1/auth/login-user-local
 * @description Login user and return session cookie.
 * @access Public
 * @param {string} req.body.email - The email of the user.
 * @param {string} req.body.password - The password of the user.
 * @param {string} [req.body.stayLoggedIn] - Whether to stay logged in or not (optional).
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The authentication result.
 * @returns {boolean} res.body.auth - Authentication status.
 * @returns {Object} res.body.user - The authenticated user object.
 * @returns {string} res.body.user._id - The user ID.
 * @returns {string} res.body.user.username - The username.
 * @returns {string} res.body.user.email - The email.
 * @returns {boolean} res.body.user.confirmed - The confirmation status.
 * @returns {Date|null} res.body.user.expirationDate - The expiration date.
 * @returns {Date} res.body.user.createdAt - The creation timestamp.
 * @returns {Date} res.body.user.updatedAt - The last update timestamp.
 * @returns {string} res.headers['set-cookie'] - The session cookie.
 */
router.post('/login-user-local',
	loginUserLocal
)

/**
 * @route POST /api/v1/auth/logout-local
 * @description Logout user and clear session cookie.
 * @access Private
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - Success message.
 * @returns {string} res.body.message - Logout success message.
 */
router.post('/logout-local',
	logoutLocal
)

/**
 * @route GET /api/v1/auth/is-authenticated
 * @description Check if user is authenticated.
 * @access Private
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {string} res.body - The session ID if authenticated.
 */
router.get('/is-authenticated',
	ensureAuthenticated,
	(req, res) => {
		// If user is authenticated, return 200 OK and session ID
		res.status(200).send(req.sessionID)
	}
)

export default router
