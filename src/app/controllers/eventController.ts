import { type NextFunction, type Request, type Response } from 'express'
import mongoose, { FilterQuery } from 'mongoose'

import EventModel, { IEvent, IEventFrontend, IMember } from '../models/Event.js'
import { IEventUpdateRequest } from '../models/EventRequestTypes.js'
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
				role: p.role,
				availabilityStatus: p.availabilityStatus
			})),
			schedulingMethod: event.schedulingMethod,
			timeWindow: event.timeWindow,
			duration: event.duration,
			status: event.status,
			scheduledTime: event.scheduledTime,
			visibility: event.visibility,
			blackoutPeriods: event.blackoutPeriods,
			preferredTimes: event.preferredTimes,
			dailyStartConstraints: event.dailyStartConstraints,
			createdAt: event.createdAt.toISOString(),
			updatedAt: event.updatedAt.toISOString()
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
	// Public visibility: anyone can access
	if (event.visibility === 'public') { return true }

	// Draft visibility: only admins/creators (must be authenticated)
	if (event.visibility === 'draft') {
		if (userId == null) { return false }
		return isEventAdmin(event, userId) || isEventCreator(event, userId)
	}

	// Private visibility: must be participant
	if (event.visibility === 'private') {
		if (userId == null) { return false }
		return isEventParticipant(event, userId)
	}

	return false
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
		dailyStartConstraints,
		visibility,
		scheduledTime,
		schedulingMethod,
		status: requestedStatus
	} = req.body as Partial<IEvent>

	// Validate first member is authenticated user
	if (members == null || members.length === 0 || members[0].userId.toString() !== user.id) {
		logger.warn('Create event failed: First member must be the authenticated user')
		res.status(400).json({ error: 'First member must be the authenticated user' })
		return
	}

	// Build members array with first member as creator
	const sanitizedMembers: IMember[] = members.map((m, idx) => ({
		userId: m.userId,
		role: idx === 0 ? 'creator' : (m.role ?? 'participant'),
		availabilityStatus: 'invited'
	}))

	// Enforce that clients cannot create an invalid confirmed event
	if (requestedStatus === 'confirmed') {
		if (schedulingMethod !== 'fixed') {
			logger.warn('Create event failed: Cannot create confirmed event unless schedulingMethod is fixed')
			res.status(400).json({ error: 'Confirmed events must use fixed scheduling' })
			return
		}
		if (typeof scheduledTime !== 'number') {
			logger.warn('Create event failed: Confirmed events must include scheduledTime')
			res.status(400).json({ error: 'Confirmed events must have a scheduledTime' })
			return
		}
	}

	const status = schedulingMethod === 'flexible' ? 'scheduling' : 'confirmed'

	const eventData: Partial<IEvent> = {
		name,
		description,
		members: sanitizedMembers,
		timeWindow,
		duration,
		blackoutPeriods,
		preferredTimes,
		dailyStartConstraints,
		visibility,
		scheduledTime,
		schedulingMethod,
		status
	}

	try {
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

		// Terminal state: cancelled
		if (event.status === 'cancelled') {
			logger.warn(`Update event failed: Event ${eventId} is cancelled and cannot be modified`)
			res.status(400).json({ error: 'Cannot modify cancelled events' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const userIsCreator = isEventCreator(event, user.id)
		const userIsAdmin = isEventAdmin(event, user.id)

		if (!userIsAdmin && !userIsCreator) {
			logger.warn(`Update event failed: User ${user.id} not authorized to edit event ${eventId}`)
			res.status(403).json({ error: 'Not authorized to edit this event' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		const {
			name,
			description,
			members,
			timeWindow,
			duration,
			scheduledTime,
			visibility,
			schedulingMethod,
			blackoutPeriods,
			preferredTimes,
			dailyStartConstraints,
			status
		} = req.body as Partial<IEventUpdateRequest>

		// Can only update status to confirmed or cancelled
		if (status != null && status !== 'confirmed' && status !== 'cancelled') {
			logger.warn(`Update event failed: Invalid status value '${status}' for event ${eventId}`)
			res.status(400).json({ error: 'Invalid status update' })
			await session.abortTransaction(); await session.endSession(); return
		}

		// Semi-terminal state: confirmed
		// Cannot change scheduled time, duration, timeWindow, schedulingMethod or status
		const changingScheduledTime = scheduledTime != null && scheduledTime !== event.scheduledTime
		const changingDuration = duration != null && duration !== event.duration
		const changingTimeWindow = timeWindow != null && timeWindow !== event.timeWindow
		const changingSchedulingMethod = schedulingMethod != null && schedulingMethod !== event.schedulingMethod
		const changingStatus = status != null && status !== event.status

		const isConfirmed = event.status === 'confirmed'
		const restrictedStatusChange = changingScheduledTime || changingDuration || changingTimeWindow || changingSchedulingMethod || changingStatus
		if (isConfirmed && restrictedStatusChange) {
			logger.warn(`Update event failed: Cannot change scheduled time, duration, time window, scheduling method or status for confirmed event ${eventId}`)
			res.status(400).json({ error: 'Cannot change scheduled time, duration, time window, scheduling method or status for confirmed events' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		// If members are being updated, enforce governance incl. additions/removals/role changes
		if (members != null) {
			const originalFirst = event.members[0]
			if (members[0].userId.toString() !== originalFirst.userId.toString() || members[0].role !== 'creator') {
				logger.warn(`Update event failed: First member must remain the original creator for event ${eventId}`)
				res.status(400).json({ error: 'First member must remain the original creator' })
				await session.abortTransaction(); await session.endSession(); return
			}
			const currentById = new Map(event.members.map(m => [m.userId.toString(), m]))
			const proposedById = new Map(members.map(m => [m.userId.toString(), m]))
			const isOriginalCreator = originalFirst.userId.toString() === user.id
			for (const [uid, curr] of currentById) {
				// Check if current member is being removed
				if (!proposedById.has(uid)) {
					// Cannot remove original creator
					if (uid === originalFirst.userId.toString()) {
						logger.warn(`Update event failed: Cannot remove original creator in event ${eventId}`)
						res.status(400).json({ error: 'Cannot remove original creator' })
						await session.abortTransaction(); await session.endSession(); return
					}
					// Cannot remove creator or admin unless original creator
					if (curr.role === 'creator' && !isOriginalCreator) {
						logger.warn(`Update event failed: Only original creator can remove another creator in event ${eventId}`)
						res.status(403).json({ error: 'Only the original creator can remove another creator' })
						await session.abortTransaction(); await session.endSession(); return
					}
					// Admins cannot remove creator or admin
					if (!userIsCreator) {
						if (curr.role !== 'participant') {
							logger.warn(`Update event failed: Admin cannot remove ${curr.role} in event ${eventId}`)
							res.status(403).json({ error: 'Admins can only remove participants' })
							await session.abortTransaction(); await session.endSession(); return
						}
					}
				}
			}
			for (const [uid, proposed] of proposedById) {
				// Check if proposed member is changing role
				const current = currentById.get(uid)
				if (current == null) { continue }
				const from = current.role
				const to = proposed.role
				if (from === to) { continue }
				// Original creator cannot change role
				if (uid === originalFirst.userId.toString()) {
					if (to !== 'creator') {
						logger.warn(`Update event failed: Original creator role cannot change in event ${eventId}`)
						res.status(400).json({ error: 'Original creator role cannot be changed' })
						await session.abortTransaction(); await session.endSession(); return
					}
					continue
				}
				// Only original creator can demote a creator
				if (from === 'creator' && to !== 'creator' && !isOriginalCreator) {
					logger.warn(`Update event failed: Only original creator can demote a creator in event ${eventId}`)
					res.status(403).json({ error: 'Only the original creator can demote a creator' })
					await session.abortTransaction(); await session.endSession(); return
				}
				// Admins can only demote to participant
				if (!userIsCreator) {
					if (!(from === 'admin' && to === 'participant')) {
						logger.warn(`Update event failed: Admin attempted forbidden role change ${from} -> ${to} in event ${eventId}`)
						res.status(403).json({ error: 'Admins can only demote admin to participant' })
						await session.abortTransaction(); await session.endSession(); return
					}
				}
			}
		}

		// Visibility transition rules:
		// draft -> public | private | draft
		// public <-> private
		if (visibility != null && visibility === 'draft' as unknown && event.visibility !== 'draft') {
			logger.warn(`Update event failed: Cannot change visibility from ${event.visibility} to draft for event ${eventId}`)
			res.status(400).json({ error: 'Cannot change visibility to draft once set' })
			await session.abortTransaction()
			await session.endSession()
			return
		}

		let updateApplied = false

		// Check if any time constraints changed
		const timeConstraintsChanged = (
			(scheduledTime != null && scheduledTime !== event.scheduledTime) ||
			(timeWindow != null && timeWindow !== event.timeWindow) ||
			(duration != null && duration !== event.duration) ||
			(preferredTimes != null && preferredTimes !== event.preferredTimes) ||
			(blackoutPeriods != null && blackoutPeriods !== event.blackoutPeriods) ||
			(dailyStartConstraints != null && dailyStartConstraints !== event.dailyStartConstraints)
		)

		// Check if scheduling method changed to flexible
		const schedulingMethodChangedToFlexible = (schedulingMethod != null && schedulingMethod !== event.schedulingMethod && schedulingMethod === 'flexible')

		// Downgrade to scheduling if any time constraints change or scheduling method changes to flexible
		const shouldDowngradeToScheduling = timeConstraintsChanged || schedulingMethodChangedToFlexible

		if (shouldDowngradeToScheduling) {
			// Clear scheduledTime when constraints change or when moving to scheduling
			event.status = 'scheduling'
			event.scheduledTime = undefined
			updateApplied = true
		}

		// Build members array with first member as creator
		const sanitizedMembers: IMember[] | undefined = members?.map((m, idx) => ({
			userId: m.userId,
			role: idx === 0 ? 'creator' : (m.role ?? 'participant'),
			availabilityStatus: event.members.find(p => p.userId.toString() === m.userId)?.availabilityStatus ?? 'invited'
		}))

		// Explicitly apply allowed simple fields
		if (name != null) { event.name = name; updateApplied = true }
		if (description != null) { event.description = description; updateApplied = true }
		if (duration != null) { event.duration = duration; updateApplied = true	}
		if (status != null) { event.status = status; updateApplied = true }
		if (visibility != null) { event.visibility = visibility; updateApplied = true }
		if (scheduledTime != null) { event.scheduledTime = scheduledTime; updateApplied = true }
		if (timeWindow != null) { event.timeWindow = timeWindow; updateApplied = true }
		if (blackoutPeriods != null) { event.blackoutPeriods = blackoutPeriods; updateApplied = true }
		if (preferredTimes != null) { event.preferredTimes = preferredTimes; updateApplied = true }
		if (dailyStartConstraints != null) { event.dailyStartConstraints = dailyStartConstraints; updateApplied = true }
		if (sanitizedMembers != null) { event.members = sanitizedMembers; updateApplied = true }

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

		// Only the creator can delete the event
		if (!isEventCreator(event, user.id)) {
			logger.warn(`Delete event failed: User ${user.id} not authorized to delete event ${eventId}`)
			res.status(403).json({ error: 'Not authorized to delete this event' })
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

interface IGetEventsQuery { createdBy?: string; adminOf?: string; participantOf?: string; memberOf?: string; visibility?: string[]; status?: string[]; limit: number; offset: number }
interface IGetEventsResponse { events: IEventFrontend[]; total: number }
const VALID_STATUSES = ['scheduling', 'confirmed', 'cancelled']
const VALID_VISIBILITY = ['draft', 'public', 'private']

export async function getEvents (req: Request, res: Response, next: NextFunction): Promise<void> {
	logger.debug('Getting events with query', { query: req.query })
	try {
		const {
			createdBy,
			adminOf,
			participantOf,
			memberOf,
			visibility: visibilityParam,
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
			visibility: (() => {
				const raw = parseIds(visibilityParam)?.flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
				const filtered = raw?.filter(s => VALID_VISIBILITY.includes(s))
				return filtered && filtered.length ? filtered : undefined
			})(),
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

		if (q.visibility?.length != null) { and.push({ visibility: q.visibility.length === 1 ? q.visibility[0] : { $in: q.visibility } }) }
		if (q.status?.length != null) { and.push({ status: q.status.length === 1 ? q.status[0] : { $in: q.status } }) }

		const roleMatch = (id: string, role: string): FilterQuery<IEvent> => ({ members: { $elemMatch: { userId: new mongoose.Types.ObjectId(id), role } } })
		if (q.createdBy != null) { and.push(roleMatch(q.createdBy, 'creator')) }
		if (q.adminOf != null) { and.push(roleMatch(q.adminOf, 'admin')) }
		if (q.participantOf != null) { and.push(roleMatch(q.participantOf, 'participant')) }
		if (q.memberOf != null) { and.push({ 'members.userId': new mongoose.Types.ObjectId(q.memberOf) }) }

		const visibilityAccess: FilterQuery<IEvent>[] = [{ visibility: 'public' }]
		if (viewerId != null) {
			const vObj = new mongoose.Types.ObjectId(viewerId)
			visibilityAccess.push(
				{ visibility: 'draft', members: { $elemMatch: { userId: vObj, role: { $in: ['creator', 'admin'] } } } },
				{ visibility: 'private', 'members.userId': vObj }
			)
		}
		and.push({ $or: visibilityAccess })

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
