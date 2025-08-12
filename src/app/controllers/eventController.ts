import { type NextFunction, type Request, type Response } from 'express'
import mongoose, { FilterQuery } from 'mongoose'

import EventModel, { IEvent, IEventFrontend, IMember } from '../models/Event.js'
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
			timeWindow: event.timeWindow,
			duration: event.duration,
			status: event.status,
			scheduledTime: event.scheduledTime,
			visibility: event.visibility,
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
		status: requestedStatus,
		visibility: requestedVisibility,
		scheduledTime
	} = req.body as Partial<IEvent>

	try {
		let status: IEvent['status'] = 'scheduling'
		// Creation rules: scheduling default; confirmed only with scheduledTime; scheduled requires scheduledTime present; cannot create cancelled
		if (requestedStatus != null) {
			if (requestedStatus === 'scheduling') {
				if (scheduledTime != null) { res.status(400).json({ error: 'scheduledTime must be absent when creating a scheduling event' }); return }
				status = 'scheduling'
			} else if (requestedStatus === 'scheduled') {
				if (scheduledTime == null) { res.status(400).json({ error: 'scheduledTime required when creating a scheduled event' }); return }
				status = 'scheduled'
			} else if (requestedStatus === 'confirmed') {
				if (scheduledTime == null) { res.status(400).json({ error: 'scheduledTime required when creating a confirmed event' }); return }
				status = 'confirmed'
			} else {
				res.status(400).json({ error: `Status '${requestedStatus}' not allowed at creation` }); return
			}
		}

		// Build members list and enforce first member is posting user as creator
		let rawMembers = members ?? [{ userId: user._id, role: 'creator' }]
		if (rawMembers.length === 0) { rawMembers = [{ userId: user._id, role: 'creator' }] }
		const first = rawMembers[0]
		if (first.userId.toString() !== user._id.toString() || first.role !== 'creator') {
			res.status(400).json({ error: 'First member must be the posting user with role creator' }); return
		}
		const sanitizedMembers: IMember[] = rawMembers.map((m, idx) => ({
			userId: m.userId,
			role: idx === 0 ? 'creator' : (m.role ?? 'participant'),
			availabilityStatus: 'invited'
		}))

		let effectiveTimeWindow = timeWindow
		if (effectiveTimeWindow == null) {
			if (status === 'confirmed') {
				if (scheduledTime == null || duration == null) { res.status(400).json({ error: 'scheduledTime and duration required for confirmed event' }); return }
				effectiveTimeWindow = undefined
			} else {
				res.status(400).json({ error: 'timeWindow is required unless creating a confirmed event with scheduledTime' }); return
			}
		}

		// visibility rules: default draft; only allow draft|public|private
		let visibility: IEvent['visibility'] = 'draft'
		if (requestedVisibility != null) {
			if (!['draft', 'public', 'private'].includes(requestedVisibility)) { res.status(400).json({ error: 'Invalid visibility value' }); return }
			visibility = requestedVisibility as IEvent['visibility']
		}

		const eventData: Partial<IEvent> = {
			name,
			description,
			members: sanitizedMembers,
			timeWindow: effectiveTimeWindow,
			duration,
			blackoutPeriods: blackoutPeriods ?? [],
			preferredTimes,
			dailyStartConstraints,
			status,
			visibility
		}
		if (status === 'confirmed' && scheduledTime != null) {
			// only confirmed may carry scheduledTime on create per above logic
			eventData.scheduledTime = scheduledTime
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

		const userIsCreator = isEventCreator(event, user.id)
		const userIsAdmin = isEventAdmin(event, user.id)

		if (!userIsAdmin && !userIsCreator) {
			logger.warn(`Update event failed: User ${user.id} not authorized to edit event ${eventId}`)
			res.status(403).json({ error: 'Not authorized to edit this event' })
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

		const body = req.body as Partial<IEvent>
		const requestedStatus = body.status
		const requestedVisibility = body.visibility
		const scheduledTime = body.scheduledTime ?? event.scheduledTime

		// Collect other (non status/time) fields to update after validation
		const otherFields: (keyof IEvent)[] = ['name', 'description', 'members', 'timeWindow', 'duration', 'visibility', 'blackoutPeriods', 'preferredTimes', 'dailyStartConstraints']

		async function reject (message: string): Promise<void> {
			logger.warn(`Update event failed validation for ${eventId}: ${message}`)
			await session.abortTransaction()
			await session.endSession()
			res.status(400).json({ error: message })
		}

		const current = event.status
		let statusChangeAllowed = false
		let updateApplied = false
		// Validate status transitions when a status change is requested OR when scheduledTime is being modified without a status change
		if (requestedStatus !== undefined || body.scheduledTime !== undefined) {
			switch (current) {
				case 'scheduling': {
					if (requestedStatus === undefined) {
						// No explicit status change; scheduledTime not allowed
						if (body.scheduledTime !== undefined) { await reject('scheduledTime must not be set when in scheduling'); return }
						break
					}
					if (requestedStatus === 'scheduling') {
						if (scheduledTime != null) { await reject('scheduledTime must not be set when in scheduling'); return }
					} else if (requestedStatus === 'confirmed') {
						if (scheduledTime == null) { await reject('scheduledTime required to confirm event'); return }
					} else if (requestedStatus === 'cancelled') {
						// always allowed
					} else {
						await reject(`Invalid status transition from scheduling to ${requestedStatus}`); return
					}
					break
				}
				case 'scheduled': {
					if (requestedStatus === undefined) {
						// Only allow scheduledTime presence if it remains set (cannot unset)
						if (body.scheduledTime !== undefined && scheduledTime == null) { await reject('scheduledTime must be set for scheduled events'); return }
						break
					}
					if (requestedStatus === 'scheduled') {
						if (scheduledTime == null) { await reject('scheduledTime must be set for scheduled events'); return }
					} else if (requestedStatus === 'confirmed') {
						if (scheduledTime == null) { await reject('scheduledTime must be set to confirm scheduled events'); return }
					} else if (requestedStatus === 'cancelled') {
						// always allowed
					} else {
						await reject(`Invalid status transition from scheduled to ${requestedStatus}`); return
					}
					break
				}
				case 'confirmed': {
					if (requestedStatus === undefined || requestedStatus === 'confirmed') {
						if (body.scheduledTime !== undefined && body.scheduledTime !== event.scheduledTime) { await reject('Cannot change scheduledTime after confirmation'); return }
					} else if (requestedStatus === 'cancelled') {
						// allowed
					} else {
						await reject(`Confirmed events can only be cancelled; attempted: ${requestedStatus}`); return
					}
					break
				}
				// cancelled handled earlier
			}
			if (requestedStatus !== undefined) { statusChangeAllowed = true }
		}

		// Apply status & scheduledTime mutations after validation logic
		if (requestedStatus !== undefined && statusChangeAllowed) {
			if (requestedStatus !== event.status) {
				event.set('status', requestedStatus)
				updateApplied = true
			}
		}
		// scheduledTime assignment rules:
		//  - Allow setting scheduledTime when transitioning to confirmed
		//  - Allow setting scheduledTime for scheduled status (future enhancement if scheduled reintroduced)
		//  - Prevent modifying scheduledTime once confirmed (already validated above)
		if (body.scheduledTime !== undefined) {
			if (event.status === 'confirmed') {
				// Already enforced earlier; double guard
			} else {
				event.set('scheduledTime', body.scheduledTime)
				updateApplied = true
			}
		}

		// Visibility transition rules:
		// draft -> public | private | draft
		// public <-> private
		if (requestedVisibility !== undefined) {
			if (event.visibility === 'public' || event.visibility === 'private') {
				if (requestedVisibility === 'draft') {
					await reject('Cannot revert to draft visibility once changed from public/private')
				}
			}
		}

		// If confirmed and not cancelling, restrict other field modifications
		if (event.status === 'confirmed' && requestedStatus !== 'cancelled') {
			const otherChange = otherFields.some(f => body[f] !== undefined)
			if (otherChange) { await reject('Cannot modify confirmed events except to cancel them'); return }
		}

		for (const f of otherFields) {
			if (body[f] !== undefined) {
				if (f === 'members') {
					// Membership update rules:
					//  - First member is the original creator and must remain creator and remain in list
					//  - Multiple creators allowed; only creators can create additional creators
					//  - Only the original creator can demote or remove another creator
					//  - Creators (any) can promote participant->admin or participant->creator, admin->creator
					//  - Admins may add/remove participants and demote admin->participant but cannot promote or touch any creator
					const incoming = body.members ?? []
					if (incoming.length === 0) { await reject('Members array cannot be empty'); return }
					const originalFirst = event.members[0]
					const incomingFirst = incoming[0]
					if (originalFirst.userId.toString() !== incomingFirst.userId.toString() || incomingFirst.role !== 'creator') {
						await reject('First member must remain the original creator'); return
					}
					// Build lookup of existing roles
					const existingRoleById = new Map(event.members.map(m => [m.userId.toString(), m.role]))
					// Track IDs of incoming to detect removals
					const incomingIds = new Set(incoming.map(m => m.userId.toString()))
					// Validate removals: original creator cannot be removed; only original creator may remove other creators
					for (const prev of event.members) {
						const prevId = prev.userId.toString()
						if (!incomingIds.has(prevId)) {
							if (prevId === originalFirst.userId.toString()) { await reject('Original creator cannot be removed'); return }
							if (prev.role === 'creator' && !userIsCreator) { await reject('Only the original creator can remove a creator'); return }
						}
					}
					for (let i = 1; i < incoming.length; i++) {
						const m = incoming[i]
						const existingRole = existingRoleById.get(m.userId.toString())
						if (!userIsCreator) {
							// Acting user is admin
							if (m.role === 'creator') { await reject('Admins cannot assign creator role'); return }
							if (existingRole === 'creator') { await reject('Admins cannot modify creator roles'); return }
							if (existingRole == null) {
								if (m.role != null && m.role !== 'participant') { await reject('Admins can only add new members as participants'); return }
							} else if (m.role !== existingRole) {
								if (!(existingRole === 'admin' && m.role === 'participant')) { await reject('Admins can only demote admin to participant'); return }
							}
						} else {
							// Acting user is a creator. If not original creator, limit ability to demote/remove other creators.
							const isOriginalCreator = user.id === originalFirst.userId.toString()
							if (!isOriginalCreator) {
								if (existingRole === 'creator' && m.role !== 'creator') { await reject('Only original creator can demote another creator'); return }
							}
						}
					}
					// Sanitization: ensure roles for non-creator entries default to participant if omitted
					const sanitized: IMember[] = incoming.map((m, idx) => ({
						userId: m.userId,
						role: idx === 0 ? 'creator' : (m.role ?? 'participant'),
						availabilityStatus: 'invited'
					}))
					event.set('members', sanitized)
					updateApplied = true
					logger.debug(`Updating members (role rules enforced) for event ID ${eventId}`)
				} else {
					// For other fields, just set directly
					event.set(f, body[f])
					updateApplied = true
					logger.debug(`Updating ${f} for event ID ${eventId}`)
				}
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

interface IGetEventsQuery { createdBy?: string; adminOf?: string; participantOf?: string; memberOf?: string; visibility?: string[]; status?: string[]; limit: number; offset: number }
interface IGetEventsResponse { events: IEventFrontend[]; total: number }
const VALID_STATUSES = ['scheduling', 'scheduled', 'confirmed', 'cancelled']
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

		// Role change rules with multiple creators:
		//  - First member is original creator (immutable, cannot change role)
		//  - Multiple creators allowed (creator can promote to creator)
		//  - Only original creator can demote or remove another creator
		//  - Any creator can promote participant/admin -> creator
		//  - Any creator can promote participant -> admin
		//  - Admin can only demote admin -> participant or keep same; cannot touch creators or promote
		const originalFirst = event.members[0]
		const isOriginalCreator = originalFirst.userId.toString() === user.id
		if (targetParticipant.userId.toString() === originalFirst.userId.toString()) {
			// Original creator role immutable
			if (newRole !== 'creator') {
				logger.warn(`Update participant role failed: Attempt to change original creator role for event ${eventId}`)
				res.status(400).json({ error: 'Original creator role cannot be changed' })
				await session.abortTransaction()
				await session.endSession()
				return
			}
		} else if (targetParticipant.role === 'creator') {
			// Changing a (non-original) creator
			if (!isOriginalCreator && newRole !== 'creator') {
				logger.warn(`Update participant role failed: Non-original creator ${user.id} attempted to demote another creator in event ${eventId}`)
				res.status(403).json({ error: 'Only the original creator can demote another creator' })
				await session.abortTransaction()
				await session.endSession()
				return
			}
			if (!userIsCreator && newRole !== 'creator') {
				logger.warn(`Update participant role failed: Admin ${user.id} attempted to modify creator in event ${eventId}`)
				res.status(403).json({ error: 'Admins cannot modify creator roles' })
				await session.abortTransaction()
				await session.endSession()
				return
			}
		} else if (!userIsCreator) {
			// Acting user is admin on non-creator target
			if (newRole === 'creator' || newRole === 'admin') {
				logger.warn(`Update participant role failed: Admin ${user.id} attempted promotion to ${newRole} in event ${eventId}`)
				res.status(403).json({ error: 'Admins cannot promote members' })
				await session.abortTransaction()
				await session.endSession()
				return
			}
			if (targetParticipant.role === 'admin' && newRole === 'participant') {
				// Allowed demotion
			} else if (targetParticipant.role !== newRole) {
				logger.warn(`Update participant role failed: Admin ${user.id} attempted forbidden role change ${targetParticipant.role} -> ${newRole} in event ${eventId}`)
				res.status(403).json({ error: 'Admins can only demote admin to participant' })
				await session.abortTransaction()
				await session.endSession()
				return
			}
		} else {
			// Acting user is a creator modifying non-creator target; promotions allowed
			// No extra validation needed beyond above
		}

		// Apply role (idempotent allowed cases)
		if (event.members[memberIndex].role !== newRole) {
			event.members[memberIndex].role = newRole
		}
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

