import { type NextFunction, type Request, type Response } from 'express'
import mongoose, { FilterQuery } from 'mongoose'

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
			members: event.members.map(p => ({
				userId: p.userId.toString(),
				role: p.role
			})),
			timeWindow: event.timeWindow,
			duration: event.duration,
			status: event.status,
			scheduledTime: event.scheduledTime,
			public: event.public,
			blackoutPeriods: event.blackoutPeriods,
			preferredTimes: event.preferredTimes,
			dailyStartConstraints: event.dailyStartConstraints,
			createdAt: event.createdAt,
			updatedAt: event.updatedAt
		}
	} catch (error) {
		logger.error(`Error transforming event ID ${event.id}`, { error })
		throw new Error(`Failed to transform event ID ${event.id}: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function isEventCreator (event: IEvent, userId: string): boolean {
	return event.members.some(p => p.userId.toString() === userId && p.role === 'creator')
}

function isEventAdmin (event: IEvent, userId: string): boolean {
	return event.members.some(p => p.userId.toString() === userId && p.role === 'admin')
}

function isEventParticipant (event: IEvent, userId: string): boolean {
	return event.members.some(p => p.userId.toString() === userId)
}

function canAccessEvent (event: IEvent, userId?: string): boolean {
	// If event is public and not a draft, anyone can access it
	if (event.public && event.status !== 'draft') {
		return true
	}

	// If no user ID provided, can't access private events
	if (userId === undefined) {
		return false
	}

	// For private events, user must be a participant
	if (!isEventParticipant(event, userId)) {
		return false
	}

	// For draft events, only admins and creators can access
	if (event.status === 'draft') {
		return isEventAdmin(event, userId) || isEventCreator(event, userId)
	}

	// For non-draft private events, any participant can access
	return true
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
		members,
		timeWindow,
		duration,
		blackoutPeriods,
		preferredTimes,
		dailyStartConstraints
	} = req.body

	try {
		const eventData: Partial<IEvent> = {
			name,
			description,
			members: members ?? [{ userId: user._id, role: 'creator', availabilityStatus: 'available' }],
			timeWindow,
			duration,
			blackoutPeriods: blackoutPeriods ?? [],
			preferredTimes,
			dailyStartConstraints
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

		if (!canAccessEvent(event, userId)) {
			logger.warn(`Get event failed: User ${userId ?? 'anonymous'} not authorized to view event ${eventId}`)
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
		const updatableFields: (keyof IEvent)[] = ['name', 'description', 'members', 'timeWindow', 'duration', 'status', 'scheduledTime', 'public', 'blackoutPeriods', 'preferredTimes', 'dailyStartConstraints']

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

interface IGetEventsQuery { createdBy?: string; adminOf?: string; participantOf?: string; memberOf?: string; public?: boolean; status?: string[]; limit: number; offset: number }
interface IGetEventsResponse { events: IEventFrontend[]; total: number }
const VALID_STATUSES = ['draft', 'scheduling', 'scheduled', 'confirmed', 'cancelled']

export async function getEvents (req: Request, res: Response, next: NextFunction): Promise<void> {
	logger.debug('Getting events with query', { query: req.query })
	try {
		const {
			createdBy,
			adminOf,
			participantOf,
			memberOf,
			public: publicFlag,
			status,
			limit,
			offset
		} = req.query as Record<string, string | string[]>

		const parseIds = (v: string | string[] | undefined) => (v != null) ? (Array.isArray(v) ? v : [v]) : undefined
		const takeFirst = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

		const q: IGetEventsQuery = {
			createdBy: takeFirst(createdBy),
			adminOf: takeFirst(adminOf),
			participantOf: takeFirst(participantOf),
			memberOf: takeFirst(memberOf),
			public: (() => { const v = takeFirst(publicFlag); if (v === 'true') { return true } if (v === 'false') { return false } return undefined })(),
			status: (() => {
				const raw = parseIds(status)?.flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
				const filtered = raw?.filter(s => VALID_STATUSES.includes(s))
				return filtered && filtered.length ? filtered : undefined
			})(),
			limit: (() => { const v = takeFirst(limit); if (v == null) { return 50 } const n = parseInt(v, 10); if (isNaN(n) || n <= 0) { throw new Error('Invalid limit') } return Math.min(n, 200) })(),
			offset: (() => { const v = takeFirst(offset); if (v == null) { return 0 } const n = parseInt(v, 10); if (isNaN(n) || n < 0) { throw new Error('Invalid offset') } return n })()
		}

		const viewerId = (req.user as IUser | undefined)?.id
		const filter: FilterQuery<IEvent> = {}
		const and: FilterQuery<IEvent>[] = []

		if (q.public !== undefined) { and.push({ public: q.public }) }
		if (q.status?.length != null) { and.push({ status: q.status.length === 1 ? q.status[0] : { $in: q.status } }) }

		const roleMatch = (id: string, role: string): FilterQuery<IEvent> => ({ members: { $elemMatch: { userId: new mongoose.Types.ObjectId(id), role } } })
		if (q.createdBy != null) { and.push(roleMatch(q.createdBy, 'creator')) }
		if (q.adminOf != null) { and.push(roleMatch(q.adminOf, 'admin')) }
		if (q.participantOf != null) { and.push(roleMatch(q.participantOf, 'participant')) }
		if (q.memberOf != null) { and.push({ 'members.userId': new mongoose.Types.ObjectId(q.memberOf) }) }

		const visibility: FilterQuery<IEvent>[] = [{ public: true, status: { $ne: 'draft' } }]
		if (viewerId != null) {
			const vObj = new mongoose.Types.ObjectId(viewerId)
			visibility.push(
				{ status: 'draft', members: { $elemMatch: { userId: vObj, role: { $in: ['creator', 'admin'] } } } },
				{ public: false, status: { $ne: 'draft' }, 'members.userId': vObj }
			)
		}
		and.push({ $or: visibility })

		const finalFilter = and.length ? { $and: and } : filter

		const [events, total] = await Promise.all([
			EventModel.find(finalFilter)
				.sort({ updatedAt: -1, createdAt: -1 })
				.limit(q.limit)
				.skip(q.offset)
				.exec(),
			EventModel.countDocuments(finalFilter).exec()
		])

		const transformedEvents = await Promise.all(events.map(transformEvent))
		const response: IGetEventsResponse = { events: transformedEvents, total }
		logger.debug(`Retrieved ${events.length} events (${total} total)`)
		res.status(200).json(response)
	} catch (error) {
		logger.error('Get events failed', { error })
		if (error instanceof Error && error.message.toLowerCase().includes('invalid')) {
			res.status(400).json({ error: error.message })
		} else if (error instanceof mongoose.Error.CastError) {
			res.status(400).json({ error: 'Invalid user ID format' })
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

		const memberIndex = event.members.findIndex(p => p.userId.toString() === userId)
		if (memberIndex === -1) {
			logger.warn(`Update participant role failed: User ${userId} not found in event ${eventId}`)
			res.status(404).json({ error: 'Participant not found in event' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const targetParticipant = event.members[memberIndex]

		// Only creators can modify creator roles
		if ((newRole === 'creator' || targetParticipant.role === 'creator') && !userIsCreator) {
			logger.warn(`Update participant role failed: User ${user.id} cannot modify creator role in event ${eventId}`)
			res.status(403).json({ error: 'Only creators can modify creator roles' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		event.members[memberIndex].role = newRole
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

