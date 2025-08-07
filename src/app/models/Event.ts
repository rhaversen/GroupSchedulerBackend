import { type Document, model, Schema } from 'mongoose'

export interface ITimeRange {
	start: number
	end: number
}

export interface IParticipant {
	userId: Schema.Types.ObjectId
	role: 'creator' | 'admin' | 'participant'
	customPaddingAfter?: number
	availabilityStatus: 'available' | 'unavailable' | 'tentative'
}

export interface IEvent extends Document {
	_id: Schema.Types.ObjectId
	id: string

	/** Name of the event */
	name: string
	/** Description of the event */
	description: string

	/** Event participants with their roles */
	participants: IParticipant[]

	/** Amount of days the event lasts */
	duration: number
	/** Possible times when the event can be scheduled */
	timeWindow: {
		/** The start of the time window in milliseconds since epoch */
		start: number
		/** The end of the time window in milliseconds since epoch */
		end: number
	}

	/** Status of the event */
	status: 'draft' | 'scheduling' | 'scheduled' | 'confirmed' | 'cancelled'
	/** The current scheduled time for the event, if any */
	scheduledTime?: number

	/** Blackout periods where the event cannot be scheduled */
	blackoutPeriods: ITimeRange[]
	/** Preferred times for the event */
	preferredTimes?: ITimeRange[]

	createdAt: Date
	updatedAt: Date
}

export interface IEventFrontend {
	_id: string
	name: string
	description: string

	participants: {
		userId: string
		role: 'creator' | 'admin' | 'participant'
	}[]

	duration: number
	timeWindow: {
		start: number
		end: number
	}

	status: 'draft' | 'scheduling' | 'scheduled' | 'confirmed' | 'cancelled'
	scheduledTime?: number

	blackoutPeriods: ITimeRange[]
	preferredTimes?: ITimeRange[]

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

const participantSchema = new Schema<IParticipant>({
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
		enum: ['available', 'unavailable', 'tentative'],
		default: 'tentative'
	}
}, { _id: false })

const eventSchema = new Schema<IEvent>({
	name: {
		type: Schema.Types.String,
		required: true,
		trim: true,
		minLength: [1, 'Event name is too short (minimum 1 character)'],
		maxLength: [100, 'Event name is too long (maximum 100 characters)']
	},
	description: {
		type: Schema.Types.String,
		required: true,
		trim: true,
		maxLength: [1000, 'Event description is too long (maximum 1000 characters)']
	},
	participants: {
		type: [participantSchema],
		required: true,
		validate: {
			validator (participants: IParticipant[]) {
				return participants.length > 0
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
					return v > this.timeWindow.start
				},
				message (this: IEvent, props: { value: number }) {
					const start = this.timeWindow.start
					return `Event end time (${props.value}) must be after the window start (${start}).`
				}
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
		enum: ['draft', 'scheduling', 'scheduled', 'confirmed', 'cancelled'],
		default: 'draft'
	},
	scheduledTime: {
		type: Schema.Types.Number,
		validate: {
			validator (this: IEvent, v: number) {
				const withinWindow = v >= this.timeWindow.start && v + this.duration <= this.timeWindow.end
				return withinWindow
			},
			message (this: IEvent, props: { value: number }) {
				const start = this.timeWindow.start
				const end = this.timeWindow.end
				const maxEnd = start + this.duration
				return `Scheduled time (${props.value}) must start no earlier than ${start}, end no later than ${end}, and finish by ${maxEnd}.`
			}
		}
	},
	blackoutPeriods: [timeRangeSchema],
	preferredTimes: [timeRangeSchema]
}, {
	timestamps: true
})

eventSchema.index({ 'participants.userId': 1 })
eventSchema.index({ status: 1 })
eventSchema.index({ 'timeWindow.start': 1, 'timeWindow.end': 1 })
eventSchema.index({ scheduledTime: 1 })

eventSchema.path('participants').validate(
	(participants: IParticipant[]) => participants.some(p => p.role === 'creator'),
	'At least one participant must be a creator'
)

eventSchema.pre('save', function (next) {
	next()
})

const EventModel = model<IEvent>('Event', eventSchema)

export default EventModel
