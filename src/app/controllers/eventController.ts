import { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'

import EventModel, { IEvent, IEventFrontend } from '../models/Event.js'
import { IUser } from '../models/User.js'
import logger from '../utils/logger.js'

export async function transformEvent (
	event: IEvent
): Promise<IEventFrontend> {
	try {
		return {
			_id: event.id,
			name: event.name,
			description: event.description,
			participants: event.participants.map(p => ({
				userId: p.userId.toString(),
				role: p.role
			})),
			timeWindow: event.timeWindow,
			duration: event.duration,
			status: event.status,
			scheduledTime: event.scheduledTime,
			blackoutPeriods: event.blackoutPeriods,
			preferredTimes: event.preferredTimes,
			createdAt: event.createdAt,
			updatedAt: event.updatedAt
		}
	} catch (error) {
		logger.error(`Error transforming event ID ${event.id}`, { error })
		throw new Error(`Failed to transform event ID ${event.id}: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function isEventCreator (event: IEvent, userId: string): boolean {
	return event.participants.some(p => p.userId.toString() === userId && p.role === 'creator')
}

function isEventAdmin (event: IEvent, userId: string): boolean {
	return event.participants.some(p => p.userId.toString() === userId && p.role === 'admin')
}

function isEventParticipant (event: IEvent, userId: string): boolean {
	return event.participants.some(p => p.userId.toString() === userId)
}

export async function createEvent (req: Request, res: Response, next: NextFunction): Promise<void> {
	logger.info('Attempting to create new event')

	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn('Create event failed: Unauthorized request')
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	const {
		name,
		description,
		participants,
		timeWindow,
		duration,
		blackoutPeriods,
		preferredTimes
	} = req.body

	try {
		const eventData: Partial<IEvent> = {
			name,
			description,
			participants: participants ?? [{ userId: user._id, role: 'creator', availabilityStatus: 'available' }],
			timeWindow,
			duration,
			blackoutPeriods: blackoutPeriods ?? [],
			preferredTimes
		}

		const newEvent = await EventModel.create(eventData)
		const transformedEvent = await transformEvent(newEvent)

		logger.info(`Event created successfully: ID ${newEvent.id}`)
		res.status(201).json(transformedEvent)
	} catch (error) {
		logger.error('Create event failed', { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}

export async function getEvent (req: Request, res: Response, next: NextFunction): Promise<void> {
	const eventId = req.params.id
	logger.debug(`Getting event: ID ${eventId}`)

	try {
		const event = await EventModel.findById(eventId).exec()
		if (event === null) {
			logger.warn(`Get event failed: Event not found. ID: ${eventId}`)
			res.status(404).json({ error: 'Event not found' })
			return
		}

		const user = req.user as IUser | undefined
		const userId = user?.id

		if (!isEventParticipant(event, userId ?? '') && userId !== undefined) {
			logger.warn(`Get event failed: User ${userId} not authorized to view event ${eventId}`)
			res.status(403).json({ error: 'Not authorized to view this event' })
			return
		}

		const transformedEvent = await transformEvent(event)
		logger.debug(`Retrieved event successfully: ID ${eventId}`)
		res.status(200).json(transformedEvent)
	} catch (error) {
		logger.error(`Get event failed: Error retrieving event ID ${eventId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}

export async function updateEvent (req: Request, res: Response, next: NextFunction): Promise<void> {
	const eventId = req.params.id
	logger.info(`Attempting to update event: ID ${eventId}`)

	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn(`Update event failed: Unauthorized request for ID ${eventId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	const session = await mongoose.startSession()
	session.startTransaction()

	try {
		const event = await EventModel.findById(eventId, null, { session })
		if (event === null) {
			logger.warn(`Update event failed: Event not found. ID: ${eventId}`)
			res.status(404).json({ error: 'Event not found' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		if (!isEventAdmin(event, user.id) && !isEventCreator(event, user.id)) {
			logger.warn(`Update event failed: User ${user.id} not authorized to edit event ${eventId}`)
			res.status(403).json({ error: 'Not authorized to edit this event' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		if (event.status === 'confirmed') {
			logger.warn(`Update event failed: Event ${eventId} is confirmed and cannot be modified`)
			res.status(400).json({ error: 'Cannot modify confirmed events' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		let updateApplied = false
		const updatableFields: (keyof IEvent)[] = ['name', 'description', 'participants', 'timeWindow', 'duration', 'status', 'scheduledTime', 'blackoutPeriods', 'preferredTimes']

		for (const field of updatableFields) {
			if (req.body[field] !== undefined) {
				event.set(field, req.body[field])
				updateApplied = true
				logger.debug(`Updating ${field} for event ID ${eventId}`)
			}
		}

		if (!updateApplied) {
			logger.info(`Update event: No changes detected for event ID ${eventId}`)
			const transformedEvent = await transformEvent(event)
			res.status(200).json(transformedEvent)
			await session.commitTransaction()
			await session.endSession()
			return
		}

		await event.validate()
		await event.save({ session })
		await session.commitTransaction()

		const transformedEvent = await transformEvent(event)
		logger.info(`Event updated successfully: ID ${eventId}`)
		res.status(200).json(transformedEvent)
	} catch (error) {
		await session.abortTransaction()
		logger.error(`Update event failed: Error updating event ID ${eventId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	} finally {
		await session.endSession()
	}
}

export async function deleteEvent (req: Request, res: Response, next: NextFunction): Promise<void> {
	const eventId = req.params.id
	logger.info(`Attempting to delete event: ID ${eventId}`)

	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn(`Delete event failed: Unauthorized request for ID ${eventId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	try {
		const event = await EventModel.findById(eventId)
		if (event === null) {
			logger.warn(`Delete event failed: Event not found. ID: ${eventId}`)
			res.status(404).json({ error: 'Event not found' })
			return
		}

		if (!isEventAdmin(event, user.id) && !isEventCreator(event, user.id)) {
			logger.warn(`Delete event failed: User ${user.id} not authorized to delete event ${eventId}`)
			res.status(403).json({ error: 'Not authorized to delete this event' })
			return
		}

		if (event.status === 'confirmed') {
			logger.warn(`Delete event failed: Event ${eventId} is confirmed and cannot be deleted`)
			res.status(400).json({ error: 'Cannot delete confirmed events' })
			return
		}

		await event.deleteOne()

		logger.info(`Event deleted successfully: ID ${eventId}`)
		res.status(204).send()
	} catch (error) {
		logger.error(`Event deletion failed: Error during deletion process for ID ${eventId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}

export async function getUserEvents (req: Request, res: Response, next: NextFunction): Promise<void> {
	logger.debug('Getting user events')

	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn('Get user events failed: Unauthorized request')
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	try {
		const events = await EventModel.find({
			'participants.userId': user._id
		}).sort({ 'timeWindow.start': 1 }).exec()

		const transformedEvents = await Promise.all(
			events.map(event => transformEvent(event))
		)

		logger.debug(`Retrieved ${events.length} events for user ${user.id}`)
		res.status(200).json(transformedEvents)
	} catch (error) {
		logger.error('Get user events failed', { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	}
}

export async function updateParticipantRole (req: Request, res: Response, next: NextFunction): Promise<void> {
	const eventId = req.params.id
	const { userId, role: newRole } = req.body
	logger.info(`Attempting to update participant role in event: ID ${eventId}`)

	const user = req.user as IUser | undefined
	if (user === undefined) {
		logger.warn(`Update participant role failed: Unauthorized request for ID ${eventId}`)
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	const session = await mongoose.startSession()
	session.startTransaction()

	try {
		const event = await EventModel.findById(eventId, null, { session })
		if (event === null) {
			logger.warn(`Update participant role failed: Event not found. ID: ${eventId}`)
			res.status(404).json({ error: 'Event not found' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const userIsCreator = isEventCreator(event, user.id)
		const userIsAdmin = isEventAdmin(event, user.id)

		if (!userIsAdmin && !userIsCreator) {
			logger.warn(`Update participant role failed: User ${user.id} not authorized to modify roles in event ${eventId}`)
			res.status(403).json({ error: 'Only admins and creators can modify participant roles' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const participantIndex = event.participants.findIndex(p => p.userId.toString() === userId)
		if (participantIndex === -1) {
			logger.warn(`Update participant role failed: User ${userId} not found in event ${eventId}`)
			res.status(404).json({ error: 'Participant not found in event' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const targetParticipant = event.participants[participantIndex]

		// Only creators can modify creator roles
		if ((newRole === 'creator' || targetParticipant.role === 'creator') && !userIsCreator) {
			logger.warn(`Update participant role failed: User ${user.id} cannot modify creator role in event ${eventId}`)
			res.status(403).json({ error: 'Only creators can modify creator roles' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		event.participants[participantIndex].role = newRole
		await event.validate()
		await event.save({ session })
		await session.commitTransaction()

		const transformedEvent = await transformEvent(event)
		logger.info(`Participant role updated successfully in event: ID ${eventId}`)
		res.status(200).json(transformedEvent)
	} catch (error) {
		await session.abortTransaction()
		logger.error(`Update participant role failed: Error updating role in event ID ${eventId}`, { error })
		if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: error.message })
		} else {
			next(error)
		}
	} finally {
		await session.endSession()
	}
}

