import { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'

import { ITimeRange } from '../models/Event.js'
import UserModel, { IUser, IUserFrontend } from '../models/User.js'
import logger from '../utils/logger.js'
import { sendEmailConfirmationEmail, sendEmailNotRegisteredEmail, sendPasswordResetEmail, sendUserDeletionConfirmationEmail } from '../utils/mailer.js'

import { loginUserLocal } from './authController.js'

export async function transformUser (
	user: IUser,
	isCurrentUser: boolean = false
): Promise<IUserFrontend> {
	try {
		const baseUser = {
			_id: user.id,
			username: user.username,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		}

		return isCurrentUser
			? {
				...baseUser,
				email: user.email,
				expirationDate: user.expirationDate ?? null,
				confirmed: user.confirmed,
				blackoutPeriods: user.blackoutPeriods
			}
			: {
				...baseUser,
				email: null,
				expirationDate: null,
				confirmed: null,
				blackoutPeriods: null
			}
	} catch (error) {
		logger.error(`Error transforming user ID ${user.id}`, { error })
		throw new Error(`Failed to transform user ID ${user.id}: ${error instanceof Error ? error.message : String(error)}`)
	}
}

export async function requestEmailConfirmationEmail (req: Request, res: Response, next: NextFunction): Promise<void> {
	const { email } = req.body as { email?: string }

	if (email === undefined || email === null || String(email).trim() === '') {
		logger.warn('Confirmation email request failed: Email missing')
		res.status(400).json({ error: 'Email is required' })
		return
	}

	try {
		const user = await UserModel.findOne({ email }).exec()

		if (user !== null) {
			if (user.confirmed === true) {
				logger.info(`Confirmation email request ignored: User already confirmed ${email}`)
			} else {
				const confirmationCode = await user.generateNewConfirmationCode()
				await user.save()
				await sendEmailConfirmationEmail(email, confirmationCode)
				logger.info(`Confirmation email re-sent to ${email}`)
			}
		} else {
			await sendEmailNotRegisteredEmail(email)
			logger.info(`Confirmation email requested for non-registered email ${email}`)
		}

		res.status(200).json({
			message: 'If the email address exists and is not confirmed, a confirmation email has been sent.'
		})
	} catch (error) {
		logger.error(`Confirmation email request failed for ${email}`, { error })
		next(error)
	}
}

export async function register (req: Request, res: Response, next: NextFunction): Promise<void> {
	logger.info(`Attempting to register user with email: ${req.body.email ?? 'N/A'}`)

	const body: Record<string, unknown> = {
		username: req.body.username,
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword
	}

	if (body.password !== body.confirmPassword) {
		logger.warn(`Registration failed: Password mismatch for email ${req.body.email ?? 'N/A'}`)
		res.status(400).json({
			auth: false,
			error: 'Passwords do not match'
		})
		return
	}

	try {
		const existingUser = await UserModel.findOne({ email: body.email }).exec()

		if (existingUser === null) {
			const newUser = await UserModel.create({
				username: body.username,
				email: body.email,
				password: body.password
			})
			await newUser.save()
			logger.debug(`User created successfully: ID ${newUser.id}`)

			try {
				if (newUser.confirmationCode === undefined) {
					await newUser.generateNewConfirmationCode()
				}
				const confirmationCode = newUser.confirmationCode as string
				await sendEmailConfirmationEmail(newUser.email, confirmationCode)
				logger.info(`Sent confirmation email to ${newUser.email}`)
			} catch (mailError) {
				logger.error(`Failed to send confirmation email to ${newUser.email}`, { error: mailError })
			}
		} else {
			logger.debug(`User already exists: ${req.body.email ?? 'N/A'}`)
		}

		loginUserLocal(req, res, next)
	} catch (error) {
		logger.error(`Registration failed for email: ${req.body.email ?? 'N/A'}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}

export async function getUser (req: Request, res: Response, next: NextFunction): Promise<void> {
	const userId = req.params.id
	logger.debug(`Getting user: ID ${userId}`)

	try {
		const user = req.user as IUser | undefined
		const paramUser = await UserModel.findById(userId).exec()

		if (paramUser === null || paramUser === undefined) {
			logger.warn(`Get user failed: User not found. ID: ${userId}`)
			res.status(404).json({
				error: 'User not found'
			})
			return
		}

		const isCurrentUser = user !== undefined && user.id === paramUser.id

		const transformedUser = await transformUser(paramUser, isCurrentUser)

		logger.debug(`Retrieved user successfully: ID ${userId}`)
		res.status(200).json(transformedUser)
	} catch (error) {
		logger.error(`Get user failed: Error retrieving user ID ${userId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}

export async function getUsers (req: Request, res: Response): Promise<void> {
	logger.info('Getting all users')
	try {
		const users = await UserModel.find({}, null, { sort: { createdAt: -1 } }).exec()
		const transformedUsers = await Promise.all(users.map(user => transformUser(user, false)))

		logger.info(`Retrieved ${transformedUsers.length} users successfully`)
		res.status(200).json(transformedUsers)
	} catch (error) {
		logger.error('Get users failed due to server error', { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			res.status(500).json({ error: 'Internal server error' })
		}
	}
}

export async function getMe (req: Request, res: Response, next: NextFunction): Promise<void> {
	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn('Get me failed: Unauthorized request')
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	try {
		const transformedUser = await transformUser(user, true)
		logger.debug(`Retrieved current user successfully: ID ${user.id}`)
		res.status(200).json(transformedUser)
	} catch (error) {
		logger.error(`Get me failed: Error transforming current user ID ${user.id}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}

export async function updateUser (req: Request, res: Response, next: NextFunction): Promise<void> {
	const userId = req.params.id
	logger.info(`Attempting to update user: ID ${userId}`)

	const user = req.user as IUser | undefined

	if (user === undefined) {
		logger.warn(`Update user failed: Unauthorized request for ID ${userId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	const session = await mongoose.startSession()
	session.startTransaction()

	try {
		const paramUser = await UserModel.findById(userId, null, { session })

		if (paramUser === null || paramUser === undefined) {
			logger.warn(`Update user failed: User not found. ID: ${userId}`)
			res.status(404).json({ error: 'User not found' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		if (user.id !== paramUser.id) {
			logger.warn(`Update user failed: Forbidden access for user ${user.id} trying to update ${userId}`)
			res.status(403).json({ error: 'Forbidden' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		let updateApplied = false

		if (req.body.username !== undefined && paramUser.username !== req.body.username) {
			logger.debug(`Updating username for user ID ${userId}`)
			paramUser.username = req.body.username
			updateApplied = true
		}

		if (!updateApplied) {
			logger.info(`Update user: No changes detected for user ID ${userId}`)

			// If no changes were made, we can return the current user without saving
			// We can safely assume the user is the current user since we checked above
			const transformedUser = await transformUser(paramUser, true)
			res.status(200).json(transformedUser)
			await session.commitTransaction()
			await session.endSession()
			return
		}

		await paramUser.validate()
		await paramUser.save({ session })
		await session.commitTransaction()

		// We can safely assume the user is the current user since we checked above
		const transformedUser = await transformUser(paramUser, true)

		logger.info(`User updated successfully: ID ${userId}`)
		res.status(200).json(transformedUser)
	} catch (error) {
		await session.abortTransaction()
		logger.error(`Update user failed: Error updating user ID ${userId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	} finally {
		await session.endSession()
	}
}

export async function requestUserDeletion (req: Request, res: Response, next: NextFunction): Promise<void> {
	const userId = req.params.id
	logger.info(`Attempting to request deletion for user: ID ${userId}`)

	const user = req.user as IUser | undefined

	if (user === undefined) {
		logger.warn(`Delete user request failed: Unauthorized request for ID ${userId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	try {
		const paramUser = await UserModel.findById(userId)

		if (paramUser === null || paramUser === undefined) {
			logger.warn(`Delete user request failed: User not found. ID: ${userId}`)
			res.status(404).json({ error: 'User not found' })
			return
		}

		if (user.id !== paramUser.id) {
			logger.warn(`Delete user request failed: Forbidden access for user ${user.id} trying to delete ${userId}`)
			res.status(403).json({ error: 'Forbidden' })
			return
		}

		const deletionCode = await paramUser.generateNewDeletionCode()
		await paramUser.save()

		await sendUserDeletionConfirmationEmail(paramUser.email, deletionCode)

		logger.info(`Deletion confirmation email sent for user: ID ${userId}`)
		res.status(200).json({
			message: 'A deletion confirmation email has been sent. Please check your email and follow the instructions to confirm account deletion.'
		})
	} catch (error) {
		logger.error(`Delete user request failed: Error during deletion process for ID ${userId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}

export async function confirmDeletion (req: Request, res: Response, next: NextFunction): Promise<void> {
	const { deletionCode } = req.query as { deletionCode?: string }

	if (deletionCode === undefined || deletionCode === null || String(deletionCode).trim() === '') {
		logger.warn('User deletion confirmation failed: Missing deletionCode')
		res.status(400).json({ error: 'Deletion code missing' })
		return
	}

	try {
		const user = await UserModel.findOne({ deletionCode }).exec()
		if (user === null || user === undefined) {
			logger.warn('User deletion confirmation failed: Invalid or expired deletion code')
			res.status(400).json({ error: 'Invalid or expired deletion code' })
			return
		}

		const deletionConfirmed = await user.confirmDeletion(deletionCode)
		if (deletionConfirmed) {
			logger.info(`User account deleted successfully: ID ${user.id}`)
			res.status(200).json({ message: 'Account deleted successfully' })
		} else {
			logger.warn('User deletion confirmation failed: Invalid or expired deletion code')
			res.status(400).json({ error: 'Invalid or expired deletion code' })
		}
	} catch (error) {
		logger.error('User deletion confirmation failed due to server error', { error })
		next(error)
	}
}

export async function requestPasswordResetEmail (req: Request, res: Response, next: NextFunction): Promise<void> {
	const { email } = req.body as { email?: string }

	if (email === undefined || email === null || String(email).trim() === '') {
		logger.warn('Password reset request failed: Email missing')
		res.status(400).json({ error: 'Email is required' })
		return
	}

	try {
		const user = await UserModel.findOne({ email }).exec()
		if (user !== null) {
			const passwordResetCode = await user.generateNewPasswordResetCode()
			await user.save()
			await sendPasswordResetEmail(email, passwordResetCode)
			logger.info(`Password reset email sent to ${email}`)
		} else {
			await sendEmailNotRegisteredEmail(email)
			logger.info(`Password reset requested for non-registered email ${email}`)
		}

		res.status(200).json({
			message: 'If the email address exists, a password reset email has been sent.'
		})
	} catch (error) {
		logger.error(`Password reset request failed for ${email}`, { error })
		next(error)
	}
}

export async function confirmUser (req: Request, res: Response, next: NextFunction): Promise<void> {
	const { confirmationCode } = req.query as { confirmationCode?: string }

	if (confirmationCode === undefined || confirmationCode === null || String(confirmationCode).trim() === '') {
		logger.warn('User confirmation failed: Missing confirmationCode')
		res.status(400).json({ error: 'Confirmation code missing' })
		return
	}

	try {
		const user = await UserModel.findOne({ confirmationCode }).exec()
		if (user === null || user === undefined) {
			logger.warn('User confirmation failed: Invalid or already used confirmation code')
			res.status(400).json({ error: 'The confirmation code is invalid or the user has already been confirmed' })
			return
		}

		user.confirmUser()
		await user.save()

		const transformedUser = await transformUser(user, true)
		res.status(200).json(transformedUser)
	} catch (error) {
		logger.error('User confirmation failed due to server error', { error })
		next(error)
	}
}

export async function resetPassword (req: Request, res: Response, next: NextFunction): Promise<void> {
	const { passwordResetCode, newPassword, confirmNewPassword } = req.body as {
		passwordResetCode?: string
		newPassword?: string
		confirmNewPassword?: string
	}

	if (passwordResetCode === undefined || passwordResetCode === null || String(passwordResetCode).trim() === '' ||
		newPassword === undefined || newPassword === null || String(newPassword).trim() === '' ||
		confirmNewPassword === undefined || confirmNewPassword === null || String(confirmNewPassword).trim() === '') {
		logger.warn('Reset password failed: Missing fields')
		res.status(400).json({ error: 'passwordResetCode, newPassword and confirmNewPassword are required' })
		return
	}

	if (newPassword !== confirmNewPassword) {
		logger.warn('Reset password failed: Passwords do not match')
		res.status(400).json({ error: 'newPassword and confirmNewPassword do not match' })
		return
	}

	try {
		const user = await UserModel.findOne({ passwordResetCode }).exec()
		if (user === null || user === undefined) {
			logger.warn('Reset password failed: Invalid password reset code')
			res.status(400).json({ error: 'Invalid password reset code' })
			return
		}

		await user.resetPassword(newPassword, passwordResetCode)
		await user.save()

		if (user.passwordResetCode !== undefined) {
			logger.warn('Reset password failed: Code expired or invalid during save')
			res.status(400).json({ error: 'Password reset link is invalid or has expired' })
			return
		}

		logger.info(`Password reset successfully for user ${user.id}`)
		res.status(200).json({ message: 'Password has been reset successfully' })
	} catch (error) {
		logger.error('Reset password failed due to server error', { error })
		next(error)
	}
}

export async function updatePassword (req: Request, res: Response, next: NextFunction): Promise<void> {
	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn('Update password failed: Unauthorized')
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	const { newPassword, confirmNewPassword, currentPassword } = req.body as {
		newPassword?: string
		confirmNewPassword?: string
		currentPassword?: string
	}

	if (newPassword === undefined || newPassword === null || String(newPassword).trim() === '' ||
		confirmNewPassword === undefined || confirmNewPassword === null || String(confirmNewPassword).trim() === '' ||
		currentPassword === undefined || currentPassword === null || String(currentPassword).trim() === '') {
		logger.warn('Update password failed: Missing fields')
		res.status(400).json({ error: 'newPassword, confirmNewPassword and currentPassword are required' })
		return
	}

	if (newPassword !== confirmNewPassword) {
		logger.warn('Update password failed: Passwords do not match')
		res.status(400).json({ error: 'newPassword and confirmNewPassword do not match' })
		return
	}

	try {
		const fullUser = await UserModel.findById(user.id).exec()
		if (fullUser === null || fullUser === undefined) {
			logger.warn(`Update password failed: User not found ${user.id}`)
			res.status(404).json({ error: 'User not found' })
			return
		}

		const passwordsMatch = await fullUser.comparePassword(currentPassword)
		if (!passwordsMatch) {
			logger.warn('Update password failed: currentPassword incorrect')
			res.status(400).json({ error: 'currentPassword does not match' })
			return
		}

		fullUser.password = newPassword
		await fullUser.save()

		logger.info(`Password updated for user ${fullUser.id}`)
		res.status(200).json({ message: 'Password updated successfully' })
	} catch (error) {
		logger.error('Update password failed due to server error', { error })
		next(error)
	}
}

// Helper Functions for Blackout Period Management

/**
 * Merge overlapping and adjacent blackout periods
 * @param periods Array of time ranges to merge
 * @returns Sorted array of merged, non-overlapping time ranges
 */
export function mergeBlackoutPeriods (periods: ITimeRange[]): ITimeRange[] {
	if (periods.length <= 1) {
		return periods
	}

	// Sort periods by start time
	const sorted = periods.slice().sort((a, b) => a.start - b.start)
	const merged: ITimeRange[] = []

	for (const current of sorted) {
		if (merged.length === 0) {
			merged.push(current)
		} else {
			const last = merged[merged.length - 1]

			// Check if current period overlaps or is adjacent to the last merged period
			if (current.start <= last.end) {
				// Merge by extending the end time if necessary
				last.end = Math.max(last.end, current.end)
			} else {
				// No overlap, add as new period
				merged.push(current)
			}
		}
	}

	return merged
}

/**
 * Add a new blackout period and merge with existing ones if necessary
 * @param existingPeriods Current blackout periods
 * @param newPeriod New period to add
 * @returns Merged array of blackout periods
 */
export function addAndMergeBlackoutPeriod (existingPeriods: ITimeRange[], newPeriod: ITimeRange): ITimeRange[] {
	const allPeriods = [...existingPeriods, newPeriod]
	return mergeBlackoutPeriods(allPeriods)
}

/**
 * Remove a time range from blackout periods, splitting periods if necessary
 * @param existingPeriods Current blackout periods
 * @param deleteRange Range to remove
 * @returns Updated array of blackout periods with range removed
 */
export function removeFromBlackoutPeriods (existingPeriods: ITimeRange[], deleteRange: ITimeRange): ITimeRange[] {
	const result: ITimeRange[] = []

	for (const period of existingPeriods) {
		// Check if there's any overlap
		if (deleteRange.end <= period.start || deleteRange.start >= period.end) {
			// No overlap, keep the period as is
			result.push(period)
		} else {
			// There is overlap, handle different cases

			if (deleteRange.start <= period.start && deleteRange.end >= period.end) {
				// Case 1: Deletion range completely contains the period
				// Period is completely removed, don't add anything
				continue
			}

			if (deleteRange.start > period.start && deleteRange.end < period.end) {
				// Case 2: Deletion range is completely within the period (split into two)
				// Split into two periods
				result.push({ start: period.start, end: deleteRange.start })
				result.push({ start: deleteRange.end, end: period.end })
			} else if (deleteRange.start <= period.start && deleteRange.end < period.end) {
				// Case 3: Deletion range overlaps the beginning of the period
				// Keep the part after the deletion
				result.push({ start: deleteRange.end, end: period.end })
			} else if (deleteRange.start > period.start && deleteRange.end >= period.end) {
				// Case 4: Deletion range overlaps the end of the period
				// Keep the part before the deletion
				result.push({ start: period.start, end: deleteRange.start })
			}
		}
	}

	return result
}

export async function addUserBlackoutPeriod (req: Request, res: Response, next: NextFunction): Promise<void> {
	const userId = req.params.id
	const user = req.user as IUser | undefined
	const { start, end } = req.body as { start?: number, end?: number }

	if (user === undefined) {
		logger.warn(`Add user blackout period failed: Unauthorized request for ID ${userId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	if (user.id !== userId) {
		logger.warn(`Add user blackout period failed: Forbidden access for user ${user.id} trying to access ${userId}`)
		res.status(403).json({ error: 'Forbidden' })
		return
	}

	if (start === undefined || end === undefined || typeof start !== 'number' || typeof end !== 'number') {
		logger.warn(`Add user blackout period failed: Invalid input types for user ${userId}`)
		res.status(400).json({ error: 'start and end times are required and must be numbers' })
		return
	}

	const session = await mongoose.startSession()
	session.startTransaction()

	try {
		const fullUser = await UserModel.findById(userId, null, { session })

		if (fullUser === null || fullUser === undefined) {
			logger.warn(`Add user blackout period failed: User not found. ID: ${userId}`)
			res.status(404).json({ error: 'User not found' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const newBlackoutPeriod: ITimeRange = { start, end }

		// Merge the new period with existing periods
		fullUser.blackoutPeriods = addAndMergeBlackoutPeriod(fullUser.blackoutPeriods, newBlackoutPeriod)

		await fullUser.validate()
		await fullUser.save({ session })
		await session.commitTransaction()

		logger.info(`Added and merged blackout period (${start}-${end}) for user: ID ${userId}. Total periods: ${fullUser.blackoutPeriods.length}`)
		res.status(201).json(fullUser.blackoutPeriods)
	} catch (error) {
		await session.abortTransaction()
		logger.error(`Add user blackout period failed: Error adding blackout period for user ID ${userId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	} finally {
		await session.endSession()
	}
}

export async function deleteUserBlackoutPeriod (req: Request, res: Response, next: NextFunction): Promise<void> {
	const userId = req.params.id
	const user = req.user as IUser | undefined
	const { start, end } = req.body as { start?: number, end?: number }

	if (user === undefined) {
		logger.warn(`Delete user blackout period failed: Unauthorized request for ID ${userId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	if (user.id !== userId) {
		logger.warn(`Delete user blackout period failed: Forbidden access for user ${user.id} trying to access ${userId}`)
		res.status(403).json({ error: 'Forbidden' })
		return
	}

	if (start === undefined || end === undefined || typeof start !== 'number' || typeof end !== 'number') {
		logger.warn(`Delete user blackout period failed: Invalid input types for user ${userId}`)
		res.status(400).json({ error: 'start and end times are required and must be numbers' })
		return
	}

	const session = await mongoose.startSession()
	session.startTransaction()

	try {
		const fullUser = await UserModel.findById(userId, null, { session })

		if (fullUser === null || fullUser === undefined) {
			logger.warn(`Delete user blackout period failed: User not found. ID: ${userId}`)
			res.status(404).json({ error: 'User not found' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const originalPeriods = fullUser.blackoutPeriods.slice()
		const deleteRange: ITimeRange = { start, end }

		// Remove the range from blackout periods, splitting if necessary
		fullUser.blackoutPeriods = removeFromBlackoutPeriods(fullUser.blackoutPeriods, deleteRange)

		const hasChanges = JSON.stringify(originalPeriods) !== JSON.stringify(fullUser.blackoutPeriods)

		if (hasChanges) {
			await fullUser.save({ session })
			await session.commitTransaction()

			logger.info(`Modified blackout periods by removing time range ${start}-${end} for user: ID ${userId}. Total periods: ${fullUser.blackoutPeriods.length}`)
			res.status(200).json(fullUser.blackoutPeriods)
		} else {
			await session.commitTransaction()
			res.status(200).json(fullUser.blackoutPeriods)
		}
	} catch (error) {
		await session.abortTransaction()
		logger.error(`Delete user blackout period failed: Error deleting blackout period for user ID ${userId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	} finally {
		await session.endSession()
	}
}

