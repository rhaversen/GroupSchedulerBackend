import { Router } from 'express'

import { ensureAuthenticated } from '../controllers/authController.js'
import {
	deleteUser,
	getUser,
	register,
	updateUser
} from '../controllers/userController.js'

const router = Router()

/**
 * @route POST /api/v1/users/register
 * @description Register a new user.
 * @access Public
 * @param {string} req.body.username - The username of the user.
 * @param {string} req.body.email - The email of the user.
 * @param {string} req.body.password - The password of the user.
 * @param {string} req.body.confirmPassword - The password confirmation.
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The authentication result and user object.
 * @returns {boolean} res.body.auth - Authentication status.
 * @returns {Object} res.body.user - The created user object.
 * @returns {string} res.body.user._id - The user ID.
 * @returns {string} res.body.user.username - The username.
 * @returns {string} res.body.user.email - The email.
 * @returns {boolean} res.body.user.confirmed - The confirmation status.
 * @returns {Date|null} res.body.user.expirationDate - The expiration date.
 * @returns {Date} res.body.user.createdAt - The creation timestamp.
 * @returns {Date} res.body.user.updatedAt - The last update timestamp.
 */
router.post('/register',
	register
)

/**
 * @route GET /api/v1/users/:id
 * @description Get user by ID.
 * @access Public (limited info) / Private (full info for own user)
 * @param {string} req.params.id - The ID of the user.
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The user object.
 * @returns {string} res.body._id - The user ID.
 * @returns {string} res.body.username - The username.
 * @returns {string|null} res.body.email - The email (only for current user, null otherwise).
 * @returns {Date|null} res.body.expirationDate - The expiration date (only for current user, null otherwise).
 * @returns {boolean|null} res.body.confirmed - The confirmation status (only for current user, null otherwise).
 * @returns {Date} res.body.createdAt - The creation timestamp.
 * @returns {Date} res.body.updatedAt - The last update timestamp.
 */
router.get('/:id',
	getUser
)

/**
 * @route PATCH /api/v1/users/:id
 * @description Update user by ID (partial update).
 * @access Private
 * @param {string} req.params.id - The ID of the user.
 * @param {string} [req.body.username] - The new username (optional).
 * @param {string} [req.body.email] - The new email (optional).
 * @param {string} [req.body.password] - The new password (optional).
 * @param {string} [req.body.confirmPassword] - The password confirmation (required if password provided).
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The updated user object with all fields for current user.
 * @returns {string} res.body._id - The user ID.
 * @returns {string} res.body.username - The username.
 * @returns {string|null} res.body.email - The email (only for current user).
 * @returns {Date|null} res.body.expirationDate - The expiration date (only for current user).
 * @returns {boolean|null} res.body.confirmed - The confirmation status (only for current user).
 * @returns {Date} res.body.createdAt - The creation timestamp.
 * @returns {Date} res.body.updatedAt - The last update timestamp.
 */
router.patch('/:id',
	ensureAuthenticated,
	updateUser
)

/**
 * @route DELETE /api/v1/users/:id
 * @description Delete user by ID.
 * @access Private
 * @param {string} req.params.id - The ID of the user.
 * @param {boolean} req.body.confirm - Confirmation flag (must be true).
 * @returns {number} res.status - The status code of the HTTP response (204 No Content).
 */
router.delete('/:id',
	ensureAuthenticated,
	deleteUser
)

export default router
