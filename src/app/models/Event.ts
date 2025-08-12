import { type Document, model, Schema } from 'mongoose'

export interface ITimeRange {
	start: number
	end: number
}

export interface IMember {
	userId: Schema.Types.ObjectId
	role: 'creator' | 'admin' | 'participant'
	customPaddingAfter?: number
	availabilityStatus: 'available' | 'unavailable' | 'tentative' | 'invited'
}

export interface IEvent extends Document {
	_id: Schema.Types.ObjectId
	id: string

	/** Name of the event */
	name: string
	/** Description of the event */
	description: string

	/** Event members with their roles */
	members: IMember[]

	/** Amount of days the event lasts */
	duration: number
	/** Possible times when the event can be scheduled */
	timeWindow: {
		/** The start of the time window in milliseconds since epoch */
		start: number
		/** The end of the time window in milliseconds since epoch */
		end: number
	}

	/** Lifecycle status of the event */
	status: 'scheduling' | 'scheduled' | 'confirmed' | 'cancelled'
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
	description: string

	members: {
		userId: string
		role: 'creator' | 'admin' | 'participant'
		availabilityStatus: 'available' | 'unavailable' | 'tentative' | 'invited'
	}[]

	duration: number
	timeWindow: {
		start: number
		end: number
	}

	status: 'scheduling' | 'scheduled' | 'confirmed' | 'cancelled'
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
		required: true,
		validate: {
			validator: (v: number) => v > 0,
			message: 'Start time must be a positive number'
		}
	},
	end: {
		type: Schema.Types.Number,
		required: true,
		validate: {
			validator: function (this: ITimeRange, v: number) {
				return v > this.start
			},
			message: 'End time must be after start time'
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
		enum: ['available', 'unavailable', 'tentative', 'invited'],
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
		required: true,
		trim: true,
		maxLength: [1000, 'Event description is too long (maximum 1000 characters)']
	},
	members: {
		type: [memberSchema],
		required: true,
		validate: {
			validator (members: IMember[]) {
				return members.length > 0
			},
			message: 'Event must have at least one participant'
		}
	},
	timeWindow: {
		start: {
			type: Schema.Types.Number,
			required: true,
			validate: {
				validator: (v: number) => v > Date.now(),
				message: (props) => `Event start time (${props.value}) must be in the future.`
			}
		},
		end: {
			type: Schema.Types.Number,
			required: true,
			validate: {
				validator (this: IEvent, v: number) {
					const start = this.timeWindow?.start
					return typeof start === 'number' && v > start
				},
				message: (props: { value: number }) => `Event end time (${props.value}) must be after the window start.`
			}
		}
	},
	duration: {
		type: Schema.Types.Number,
		required: true,
		min: [60000, 'Event duration (${VALUE}) must be at least 60000ms (1 minute)']
	},
	status: {
		type: Schema.Types.String,
		required: true,
		enum: ['scheduling', 'scheduled', 'confirmed', 'cancelled'],
		default: 'scheduling'
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
			validator (this: IEvent, v: number) {
				const start = this.timeWindow?.start
				const end = this.timeWindow?.end
				if (typeof start !== 'number' || typeof end !== 'number') { return false }
				return v >= start && v + this.duration <= end
			},
			message: (props: { value: number }) => `Scheduled time (${props.value}) is outside the allowed window or violates duration constraints.`
		}
	},
	blackoutPeriods: [timeRangeSchema],
	preferredTimes: [timeRangeSchema],
	dailyStartConstraints: [timeRangeSchema]
}, {
	timestamps: true
})

eventSchema.index({ 'members.userId': 1 })
eventSchema.index({ status: 1 })
eventSchema.index({ 'timeWindow.start': 1, 'timeWindow.end': 1 })
eventSchema.index({ scheduledTime: 1 })

eventSchema.path('members').validate(
	(members: IMember[]) => members.some(p => p.role === 'creator'),
	'At least one participant must be a creator'
)

eventSchema.pre('save', function (next) {
	next()
})

const EventModel = model<IEvent>('Event', eventSchema)

export default EventModel
