// Node.js built-in modules

// Third-party libraries
import { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'

// Own modules
import UserModel, { IUser, IUserFrontend } from '../models/User.js'
import logger from '../utils/logger.js'

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
				confirmed: user.confirmed
			}
			: {
				...baseUser,
				email: null,
				expirationDate: null,
				confirmed: null
			}
	} catch (error) {
		logger.error(`Error transforming user ID ${user.id}`, { error })
		throw new Error(`Failed to transform user ID ${user.id}: ${error instanceof Error ? error.message : String(error)}`)
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
			newUser.confirmUser()
			await newUser.save()
			logger.debug(`User created successfully: ID ${newUser.id}`)
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

		const isCurrentUser = user !== undefined && user.id !== paramUser.id

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

		if (req.body.password !== undefined && req.body.password !== req.body.confirmPassword) {
			logger.warn(`Update user failed: Password mismatch for ID ${userId}`)
			res.status(400).json({ error: 'Passwords do not match' })
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
		if (req.body.email !== undefined && paramUser.email !== req.body.email) {
			logger.debug(`Updating email for user ID ${userId}`)
			paramUser.email = req.body.email
			updateApplied = true
		}
		if (req.body.password !== undefined) {
			logger.debug(`Updating password for user ID ${userId}`)
			paramUser.password = req.body.password
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

export async function deleteUser (req: Request, res: Response, next: NextFunction): Promise<void> {
	const userId = req.params.id
	logger.info(`Attempting to delete user: ID ${userId}`)

	const user = req.user as IUser | undefined

	if (user === undefined) {
		logger.warn(`Delete user failed: Unauthorized request for ID ${userId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	if (req.body?.confirm !== true) {
		logger.warn(`User deletion failed: Confirmation not provided or invalid for ID ${userId}`)
		res.status(400).json({ error: 'Confirmation required for deletion' })
		return
	}

	try {
		const paramUser = await UserModel.findById(userId)

		if (paramUser === null || paramUser === undefined) {
			logger.warn(`Delete user failed: User not found. ID: ${userId}`)
			res.status(404).json({ error: 'User not found' })
			return
		}

		if (user.id !== paramUser.id) {
			logger.warn(`Delete user failed: Forbidden access for user ${user.id} trying to delete ${userId}`)
			res.status(403).json({ error: 'Forbidden' })
			return
		}

		await paramUser.deleteOne()
		logger.info(`User deleted successfully: ID ${userId}`)
		res.status(204).send()
	} catch (error) {
		logger.error(`User deletion failed: Error during deletion process for ID ${userId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}