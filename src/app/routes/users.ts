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
 * @returns {Object} res.body - The user object. For other users: {_id, username, createdAt, updatedAt, email:null, expirationDate:null, confirmed:null}. For self: adds {email, expirationDate, confirmed}.
 */
router.get('/:id',
	getUser
)

/**
 * @route PATCH /api/v1/users/:id
 * @description Partially update user by ID.
 * @access Private
 * @param {string} req.params.id - The ID of the user.
 * @param {string} [req.body.username] - The new username (optional).
 * @param {string} [req.body.email] - The new email (optional).
 * @param {string} [req.body.password] - The new password (optional).
 * @param {string} [req.body.confirmPassword] - The password confirmation (required if password provided).
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The updated user object.
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
 * @returns {number} res.status - The status code of the HTTP response.
 */
router.delete('/:id',
	ensureAuthenticated,
	deleteUser
)

export default router
