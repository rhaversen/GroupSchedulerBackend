import { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'

import EventModel, { IMember } from '../models/Event.js'
import { IUser } from '../models/User.js'
import logger from '../utils/logger.js'

export interface IUserEventSettingsFrontend {
	userId: string
	eventId: string
	customPaddingAfter?: number
	availabilityStatus: 'available' | 'unavailable' | 'invited'
}

export async function transformUserEventSettings (
	participant: IMember,
	eventId: string
): Promise<IUserEventSettingsFrontend> {
	try {
		return {
			userId: participant.userId.toString(),
			eventId,
			customPaddingAfter: participant.customPaddingAfter,
			availabilityStatus: participant.availabilityStatus
		}
	} catch (error) {
		logger.error(`Error transforming user event settings for participant ${participant.userId}`, { error })
		throw new Error(`Failed to transform user event settings: ${error instanceof Error ? error.message : String(error)}`)
	}
}

export async function updateUserEventSettings (req: Request, res: Response, next: NextFunction): Promise<void> {
	const eventId = req.params.eventId
	logger.info(`Attempting to update user event settings for event: ID ${eventId}`)

	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn(`Update user event settings failed: Unauthorized request for event ID ${eventId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	const { customPaddingAfter, availabilityStatus } = req.body

	const session = await mongoose.startSession()
	session.startTransaction()

	try {
		const event = await EventModel.findById(eventId, null, { session })
		if (event === null) {
			logger.warn(`Update user event settings failed: Event not found. ID: ${eventId}`)
			res.status(404).json({ error: 'Event not found' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const memberIndex = event.members.findIndex(p => p.userId.toString() === user._id.toString())
		if (memberIndex === -1) {
			logger.warn(`Update user event settings failed: User ${user.id} not participant in event ${eventId}`)
			res.status(403).json({ error: 'Not a participant in this event' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		let updateApplied = false

		if (customPaddingAfter !== undefined) {
			event.members[memberIndex].customPaddingAfter = customPaddingAfter
			updateApplied = true
			logger.debug(`Updating customPaddingAfter for user ${user.id} in event ${eventId}`)
		}

		if (availabilityStatus !== undefined) {
			event.members[memberIndex].availabilityStatus = availabilityStatus
			updateApplied = true
			logger.debug(`Updating availabilityStatus for user ${user.id} in event ${eventId}`)
		}

		if (!updateApplied) {
			logger.info(`Update user event settings: No changes detected for user ${user.id} in event ${eventId}`)
			const transformedSettings = await transformUserEventSettings(event.members[memberIndex], eventId)
			res.status(200).json(transformedSettings)
			await session.commitTransaction()
			await session.endSession()
			return
		}

		await event.validate()
		await event.save({ session })
		await session.commitTransaction()

		const transformedSettings = await transformUserEventSettings(event.members[memberIndex], eventId)
		logger.info(`User event settings updated successfully for user ${user.id} in event ${eventId}`)
		res.status(200).json(transformedSettings)
	} catch (error) {
		await session.abortTransaction()
		logger.error(`Update user event settings failed: Error updating settings for user in event ${eventId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	} finally {
		await session.endSession()
	}
}

export async function getUserEventSettings (req: Request, res: Response, next: NextFunction): Promise<void> {
	const eventId = req.params.eventId
	logger.debug(`Getting user event settings for event: ID ${eventId}`)

	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn(`Get user event settings failed: Unauthorized request for event ID ${eventId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	try {
		const event = await EventModel.findById(eventId)
		if (event === null) {
			logger.warn(`Get user event settings failed: Event not found. ID: ${eventId}`)
			res.status(404).json({ error: 'Event not found' })
			return
		}

		if (event.members.some(p => p.userId.toString() === user._id.toString()) !== true) {
			logger.warn(`Get user event settings failed: User ${user.id} not participant in event ${eventId}`)
			res.status(403).json({ error: 'Not a participant in this event' })
			return
		}

		const participant = event.members.find(p => p.userId.toString() === user._id.toString())
		if (participant === undefined) {
			logger.debug(`No participant found for user ${user.id} in event ${eventId}`)
			res.status(404).json({ error: 'User event settings not found' })
			return
		}

		const transformedSettings = await transformUserEventSettings(participant, eventId)
		logger.debug(`Retrieved user event settings successfully for event: ID ${eventId}`)
		res.status(200).json(transformedSettings)
	} catch (error) {
		logger.error(`Get user event settings failed: Error retrieving settings for event ID ${eventId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}
