import { Router } from 'express'

import { ensureAuthenticated } from '../controllers/authController.js'
import {
	deleteUser,
	getUser,
	register,
	updateUser,
	getMe,
	confirmUser,
	requestConfirmationEmail,
	requestPasswordResetEmail,
	resetPassword,
	updatePassword
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
 * @route POST /api/v1/users/confirm
 * @description Confirm a user's email using a confirmation code.
 * @access Public
 * @param {string} req.query.confirmationCode - The confirmation code.
 */
router.post('/confirm',
	confirmUser
)

/**
 * @route POST /api/v1/users/request-confirmation
 * @description Request a new confirmation email to be sent if the account is not yet confirmed.
 * @access Public
 * @param {string} req.body.email - The email of the user requesting a new confirmation email.
 */
router.post('/request-confirmation',
	requestConfirmationEmail
)

/**
 * @route POST /api/v1/users/request-password-reset-email
 * @description Request a password reset email.
 * @access Public
 * @param {string} req.body.email - The email of the user requesting password reset.
 */
router.post('/request-password-reset-email',
	requestPasswordResetEmail
)

/**
 * @route POST /api/v1/users/reset-password
 * @description Reset password using a passwordResetCode.
 * @access Public
 * @param {string} req.body.passwordResetCode - The password reset code.
 * @param {string} req.body.newPassword - The new password.
 * @param {string} req.body.confirmNewPassword - Confirmation of the new password.
 */
router.post('/reset-password',
	resetPassword
)

/**
 * @route PATCH /api/v1/users/me/password
 * @description Update password for the authenticated user.
 * @access Private
 * @param {string} req.body.currentPassword - Current password.
 * @param {string} req.body.newPassword - New password.
 * @param {string} req.body.confirmNewPassword - Confirm new password.
 */
router.patch('/me/password',
	ensureAuthenticated,
	updatePassword
)

/**
 * @route GET /api/v1/users/me
 * @description Get the authenticated user's information.
 * @access Private
 * @param {Object} req.user - The authenticated user object.
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The authenticated user object with full details.
 */
router.get('/me',
	ensureAuthenticated,
	getMe
)

/**
 * @route PATCH /api/v1/users/:id
 * @description Partially update user by ID.
 * @access Private
 * @param {string} req.params.id - The ID of the user.
 * @param {string} [req.body.username] - The new username (optional).
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
