import { type Document, model, Schema } from 'mongoose'

import UserModel from './User.js'

export interface ITimeRange {
	start: number
	end: number
}

export interface IMember {
	userId: Schema.Types.ObjectId | string
	role: 'creator' | 'admin' | 'participant'
	customPaddingAfter?: number
	availabilityStatus: 'available' | 'unavailable' | 'invited'
}

export interface IEvent extends Document {
	_id: Schema.Types.ObjectId
	id: string

	/** Name of the event */
	name: string
	/** Description of the event */
	description?: string

	/** Event members with their roles */
	members: IMember[]

	/**
	 * - 'fixed': Event has a specific time window and duration.
	 * - 'flexible': Event can be scheduled within a broader time range.
	 */
	schedulingMethod: 'fixed' | 'flexible'

	/** Amount of days the event lasts */
	duration: number
	/** Possible times when the event can be scheduled */
	timeWindow?: ITimeRange

	/** Lifecycle status of the event
	 * - 'scheduling': Event is being scheduled. It may or may not have a tentative scheduled time.
	 * - 'confirmed': Event has been confirmed with a scheduled time.
	 * - 'cancelled': Event has been cancelled and will not occur.
	*/
	status: 'scheduling' | 'confirmed' | 'cancelled'
	/** The current scheduled time for the event, if any */
	scheduledTime?: number

	/** Visibility of the event */
	visibility: 'draft' | 'public' | 'private'

	/** Blackout periods where the event cannot be scheduled */
	blackoutPeriods?: ITimeRange[]
	/** Preferred times for the event */
	preferredTimes?: ITimeRange[]
	/** Intra-day start constraint for the event, in minutes of the day */
	dailyStartConstraints?: ITimeRange[]

	createdAt: Date
	updatedAt: Date
}

export interface IEventFrontend {
	_id: string
	name: string
	description?: string

	members: {
		userId: string
		role: 'creator' | 'admin' | 'participant'
		availabilityStatus: 'available' | 'unavailable' | 'invited'
	}[]

	schedulingMethod: 'fixed' | 'flexible'

	duration: number
	timeWindow?: ITimeRange

	status: 'scheduling' | 'confirmed' | 'cancelled'
	scheduledTime?: number

	visibility: 'draft' | 'public' | 'private'

	blackoutPeriods?: ITimeRange[]
	preferredTimes?: ITimeRange[]
	dailyStartConstraints?: ITimeRange[]

	createdAt: Date
	updatedAt: Date
}

const timeRangeSchema = new Schema<ITimeRange>({
	start: {
		type: Schema.Types.Number,
		validate: {
			validator: function (this: ITimeRange, v: number | undefined) {
				if (v == null && this.end != null) { return false }
				if (v != null && v <= 0) { return false }
				return true
			},
			message: 'Start time must be provided and positive if end time is set'
		}
	},
	end: {
		type: Schema.Types.Number,
		validate: {
			validator: function (this: ITimeRange, v: number | undefined) {
				if (v == null && this.start != null) { return false }
				if (v != null && (this.start == null || v <= this.start)) { return false }
				return true
			},
			message: 'End time must be provided if start is set and must be greater than start'
		}
	}
}, { _id: false })

// 0..1440 minute-of-day range for daily start constraints
const dailyRangeSchema = new Schema<ITimeRange>({
	start: {
		type: Schema.Types.Number,
		validate: {
			validator: function (this: ITimeRange, v: number | undefined) {
				if (v == null && this.end != null) { return false }
				if (v != null && (v < 0 || v > 1440)) { return false }
				return true
			},
			message: 'Start must be between 0 and 1440 minutes when end is set'
		}
	},
	end: {
		type: Schema.Types.Number,
		validate: {
			validator: function (this: ITimeRange, v: number | undefined) {
				if (v == null && this.start != null) { return false }
				if (v != null && (this.start == null || v <= this.start || v > 1440)) { return false }
				return true
			},
			message: 'End must be greater than start and at most 1440'
		}
	}
}, { _id: false })

const memberSchema = new Schema<IMember>({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	role: {
		type: Schema.Types.String,
		required: true,
		enum: ['creator', 'admin', 'participant'],
		default: 'participant'
	},
	customPaddingAfter: {
		type: Schema.Types.Number,
		min: [0, 'Custom padding must be non-negative']
	},
	availabilityStatus: {
		type: Schema.Types.String,
		required: true,
		enum: ['available', 'unavailable', 'invited'],
		default: 'invited'
	}
}, { _id: false })

const eventSchema = new Schema<IEvent>({
	name: {
		type: Schema.Types.String,
		required: true,
		trim: true,
		minLength: [1, 'Event name is too short (minimum 1 character)'],
		maxLength: [50, 'Event name is too long (maximum 50 characters)']
	},
	description: {
		type: Schema.Types.String,
		trim: true,
		maxLength: [1000, 'Event description is too long (maximum 1000 characters)']
	},
	members: {
		type: [memberSchema],
		required: true,
		validate: [
			{
				validator (members: IMember[]) {
					return members.length > 0
				},
				message: 'Event must have at least one participant'
			},
			{
				validator (members: IMember[]) {
					return members.some(member => member.role === 'creator')
				},
				message: 'Event must have at least one creator'
			},
			{
				validator (members: IMember[]) {
					const ids = members.map(m => String(m.userId))
					return new Set(ids).size === ids.length
				},
				message: 'Members must be unique by userId'
			},
			{
				validator (members: IMember[]) {
					if (members.length === 0) { return true }
					return members[0].role === 'creator'
				},
				message: 'First member must be a creator'
			},
			{
				// Verify all member userIds are valid ObjectIds and exist
				validator: async function (this: IEvent, members: IMember[]) {
					const userIds = members.map(m => m.userId)
					const existingUsers = await UserModel.find({ _id: { $in: userIds } })
					const existingUserIds = existingUsers.map(u => String(u._id))
					return userIds.every(id => existingUserIds.includes(String(id)))
				},
				message: 'All members must reference existing users'
			}
		]
	},
	schedulingMethod: {
		type: Schema.Types.String,
		required: true,
		enum: ['fixed', 'flexible'],
		default: 'fixed',
		validate: [
			{
				validator: function (this: IEvent, v: string) {
					if (v === 'flexible' && this.timeWindow == null) {
						return false
					}
					return true
				},
				message: 'Flexible scheduling requires a time window'
			},
			{
				validator: function (this: IEvent, v: string) {
					if (v === 'fixed' && this.scheduledTime == null) {
						return false
					}
					return true
				},
				message: 'Fixed scheduling requires a scheduled time'
			}
		]
	},
	timeWindow: {
		type: timeRangeSchema,
		validate: [
			{
				validator: function (this: IEvent, v: ITimeRange | undefined) {
					if (this.schedulingMethod !== 'flexible' || v == null) { return true }
					const { start } = v
					if (typeof start !== 'number') { return false }
					const now = Date.now()
					return start >= now
				},
				message: 'For flexible scheduling, timeWindow.start must be in the future'
			}
		]
	},
	duration: {
		type: Schema.Types.Number,
		required: true,
		min: [60000, 'Event duration (${VALUE}) must be at least 60000ms (1 minute)']
	},
	status: {
		type: Schema.Types.String,
		required: true,
		enum: ['scheduling', 'confirmed', 'cancelled'],
		default: 'scheduling',
		validate: {
			validator: function (this: IEvent, v: string) {
				if (v === 'confirmed' && this.scheduledTime == null) {
					return false
				}
				return true
			},
			message: 'Confirmed events must have a scheduled time'
		}
	},
	visibility: {
		type: Schema.Types.String,
		required: true,
		enum: ['draft', 'public', 'private'],
		default: 'draft'
	},
	scheduledTime: {
		type: Schema.Types.Number,
		validate: {
			validator (this: IEvent, v: number | undefined) {
				if (v == null) { return true }
				if (this.schedulingMethod === 'fixed') {
					return typeof v === 'number' && v > 0
				}
				if (this.schedulingMethod === 'flexible') {
					const start = this.timeWindow?.start
					const end = this.timeWindow?.end
					if (typeof start !== 'number' || typeof end !== 'number') { return false }
					return v >= start && (v + this.duration) <= end
				}
				return true
			},
			message: (props: { value: number }) => `Scheduled time (${props.value}) is invalid for the current scheduling method or outside constraints.`
		}
	},
	blackoutPeriods: [timeRangeSchema],
	preferredTimes: [timeRangeSchema],
	dailyStartConstraints: [dailyRangeSchema]
}, {
	timestamps: true
})

eventSchema.index({ 'members.userId': 1 })
eventSchema.index({ status: 1 })
eventSchema.index({ 'timeWindow.start': 1, 'timeWindow.end': 1 })
eventSchema.index({ scheduledTime: 1 })

eventSchema.pre('save', function (next) {
	if (this.schedulingMethod === 'fixed') {
		// If fixed scheduling, ensure time constraints are not set
		this.timeWindow = undefined
		this.blackoutPeriods = undefined
		this.preferredTimes = undefined
		this.dailyStartConstraints = undefined

		// Set status to confirmed if not already set
		this.status = 'confirmed'

		if (this.isNew) {
			// If new event, ensure timeWindow is not set
			this.timeWindow = undefined
		}
	} else if (this.schedulingMethod === 'flexible') {
		if (this.isNew) {
			// If new event, ensure scheduledTime is not set
			this.scheduledTime = undefined
		}
	}
	next()
})

const EventModel = model<IEvent>('Event', eventSchema)

export default EventModel
