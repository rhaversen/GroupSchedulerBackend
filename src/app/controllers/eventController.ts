import { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'

import EventModel, { type IEvent, type IMember } from '../models/Event.js'
import { type IUser } from '../models/User.js'

function isMember (event: IEvent, userId: string): boolean {
	return event.members.some(m => m.userId.toString() === userId)
}

function isCreator (event: IEvent, userId: string): boolean {
	return event.members.some(m => m.userId.toString() === userId && m.role === 'creator')
}

function canView (event: IEvent, userId?: string): boolean {
	if (event.visibility === 'public') { return true }
	if (userId == null) { return false }
	if (event.visibility === 'draft') { return isCreator(event, userId) }
	return isMember(event, userId)
}

export async function createEvent (req: Request, res: Response, next: NextFunction): Promise<void> {
	const user = req.user as IUser
	try {
		const { name, description, duration, type, timeWindow, scheduledTime, visibility, members } = req.body as Partial<IEvent>

		if (type == null || duration == null) {
			res.status(400).json({ error: 'type and duration are required' })
			return
		}

		const memberList: IMember[] = [{ userId: user.id, role: 'creator', availabilityStatus: 'available' }]
		if (Array.isArray(members)) {
			for (const m of members) {
				if (m.userId.toString() !== user.id) {
					memberList.push({ userId: m.userId, role: m.role ?? 'participant', availabilityStatus: 'invited' })
				}
			}
		}

		const event = await EventModel.create({
			name, description, duration, type, timeWindow, scheduledTime,
			visibility: visibility ?? 'draft',
			status: type === 'fixed' ? 'locked' : 'open',
			members: memberList
		})

		res.status(201).json(event)
	} catch (error) {
		next(error)
	}
}

export async function getEvent (req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const event = await EventModel.findById(req.params.id).exec()
		if (event === null) { res.status(404).json({ error: 'Event not found' }); return }
		const userId = (req.user as IUser | undefined)?.id
		if (!canView(event, userId)) { res.status(403).json({ error: 'Forbidden' }); return }
		res.status(200).json(event)
	} catch (error) {
		next(error)
	}
}

export async function getEvents (req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { memberOf, status, visibility, limit = '50', offset = '0' } = req.query as Record<string, string>
		const userId = (req.user as IUser | undefined)?.id
		const filter: Record<string, unknown> = {}
		if (memberOf != null && mongoose.isValidObjectId(memberOf)) {
			filter['members.userId'] = new mongoose.Types.ObjectId(memberOf)
		}
		if (status != null) { filter.status = status }
		if (visibility != null) { filter.visibility = visibility }

		const visAccess: Record<string, unknown>[] = [{ visibility: 'public' }]
		if (userId != null) {
			const vObj = new mongoose.Types.ObjectId(userId)
			visAccess.push(
				{ visibility: 'private', 'members.userId': vObj },
				{ visibility: 'draft', members: { $elemMatch: { userId: vObj, role: 'creator' } } }
			)
		}

		const finalFilter = { $and: [filter, { $or: visAccess }] }
		const [events, total] = await Promise.all([
			EventModel.find(finalFilter).sort({ updatedAt: -1 }).limit(Number(limit)).skip(Number(offset)).exec(),
			EventModel.countDocuments(finalFilter).exec()
		])
		res.status(200).json({ events, total })
	} catch (error) {
		next(error)
	}
}

export async function updateEvent (req: Request, res: Response, next: NextFunction): Promise<void> {
	const user = req.user as IUser
	try {
		const event = await EventModel.findById(req.params.id).exec()
		if (event === null) { res.status(404).json({ error: 'Event not found' }); return }
		if (event.status === 'cancelled') { res.status(400).json({ error: 'Cannot modify cancelled events' }); return }
		if (!isCreator(event, user.id)) { res.status(403).json({ error: 'Forbidden' }); return }

		const { name, description, status, visibility, scheduledTime, timeWindow, duration, type } = req.body as Partial<IEvent>
		if (name != null) { event.name = name }
		if (description != null) { event.description = description }
		if (status != null) { event.status = status }
		if (visibility != null) { event.visibility = visibility }
		if (scheduledTime != null) { event.scheduledTime = scheduledTime }
		if (timeWindow != null) { event.timeWindow = timeWindow }
		if (duration != null) { event.duration = duration }
		if (type != null) { event.type = type }

		await event.save()
		res.status(200).json(event)
	} catch (error) {
		next(error)
	}
}

export async function deleteEvent (req: Request, res: Response, next: NextFunction): Promise<void> {
	const user = req.user as IUser
	try {
		const event = await EventModel.findById(req.params.id).exec()
		if (event === null) { res.status(404).json({ error: 'Event not found' }); return }
		if (!isCreator(event, user.id)) { res.status(403).json({ error: 'Forbidden' }); return }
		await event.deleteOne()
		res.status(204).send()
	} catch (error) {
		next(error)
	}
}
