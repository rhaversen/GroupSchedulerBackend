// Types for frontend event create/update payloads

import { ITimeRange } from './Event.js'

// Event creation payload allowed from client
export interface IEventCreateRequest {
	name: string
	description?: string
	members: Array<{
		userId: string
		role: 'creator' | 'admin' | 'participant'
	}>,
	timeWindow?: ITimeRange
	duration: number
	scheduledTime?: number
	visibility: 'draft' | 'public' | 'private'
	blackoutPeriods?: ITimeRange[]
	preferredTimes?: ITimeRange[]
	dailyStartConstraints?: ITimeRange[]
	type: 'fixed' | 'flexible'
	status?: 'open' | 'locked'
}

// Partial update payload (PATCH). Some fields conditionally validated server-side.
export interface IEventUpdateRequest {
	name?: string
	description?: string
	members?: Array<{
		userId: string
		role: 'creator' | 'admin' | 'participant'
	}>,
	status?: 'open' | 'locked' | 'cancelled'
	timeWindow?: ITimeRange
	duration?: number
	scheduledTime?: number
	visibility?: 'draft' | 'public' | 'private'
	blackoutPeriods?: ITimeRange[]
	preferredTimes?: ITimeRange[]
	dailyStartConstraints?: ITimeRange[]
	type?: 'fixed' | 'flexible'
}

export type { ITimeRange } from './Event.js'
