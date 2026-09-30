import { type Document, model, Schema } from 'mongoose'

export interface ITimeRange {
	start: number
	end: number
}

export interface IMember {
	userId: Schema.Types.ObjectId | string
	role: 'creator' | 'admin' | 'participant'
	availabilityStatus: 'available' | 'unavailable' | 'invited'
}

export interface IEvent extends Document {
	id: string
	name: string
	description?: string
	members: IMember[]
	type: 'fixed' | 'flexible'
	duration: number
	timeWindow?: ITimeRange
	status: 'open' | 'locked' | 'cancelled'
	scheduledTime?: number
	visibility: 'draft' | 'public' | 'private'
	createdAt: Date
	updatedAt: Date
}

const memberSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	role: { type: String, required: true, enum: ['creator', 'admin', 'participant'], default: 'participant' },
	availabilityStatus: { type: String, required: true, enum: ['available', 'unavailable', 'invited'], default: 'invited' }
}, { _id: false })

const eventSchema = new Schema<IEvent>({
	name: { type: String, required: true, trim: true, maxlength: [50, 'Name too long (max 50)'] },
	description: { type: String, trim: true, maxlength: [1000, 'Description too long (max 1000)'] },
	members: { type: [memberSchema], required: true },
	type: { type: String, required: true, enum: ['fixed', 'flexible'] },
	duration: { type: Number, required: true, min: [60000, 'Duration must be at least 1 minute'] },
	timeWindow: { start: { type: Number }, end: { type: Number } } as any,
	status: { type: String, required: true, enum: ['open', 'locked', 'cancelled'], default: 'open' },
	scheduledTime: { type: Number },
	visibility: { type: String, required: true, enum: ['draft', 'public', 'private'], default: 'draft' }
}, { timestamps: true })

eventSchema.index({ 'members.userId': 1 })
eventSchema.index({ status: 1 })

const EventModel = model<IEvent>('Event', eventSchema)

export default EventModel
