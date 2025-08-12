import { Router } from 'express'

import { ensureAuthenticated } from '../controllers/authController.js'
import {
	createEvent,
	deleteEvent,
	getEvent,
	getEvents,
	updateEvent,
	updateParticipantRole
} from '../controllers/eventController.js'
import {
	getUserEventSettings,
	updateUserEventSettings
} from '../controllers/userEventSettingsController.js'

const router = Router()

/**
 * @route POST /api/v1/events
 * @description Create a new event.
 * @access Private
 * @param {string} req.body.name - The name of the event.
 * @param {string} req.body.description - The description of the event.
 * @param {Object[]} [req.body.members] - Array of member objects with userId and role (optional). First element MUST be posting user with role 'creator'. Availability & padding ignored here.
 * @param {string} req.body.members[].userId - User ID of the participant.
 * @param {string} req.body.members[].role - Role of the participant ('creator', 'admin', 'participant').
 * NOTE: customPaddingAfter and availabilityStatus (including 'invited') cannot be set on creation; defaults to 'invited' until user updates via settings endpoint.
 * @param {Object} [req.body.timeWindow] - Time window for the event. Required unless creating a confirmed event with scheduledTime (then derived from scheduledTime+duration).
 * @param {number} [req.body.timeWindow.start] - Start time (Unix ms).
 * @param {number} [req.body.timeWindow.end] - End time (Unix ms).
 * @param {number} req.body.duration - Duration in milliseconds.
 * @param {boolean} [req.body.public] - Whether the event is public (optional, defaults to false).
 * @param {Array<{start:number,end:number}>} [req.body.blackoutPeriods] - Blackout time ranges.
 * @param {Array<{start:number,end:number}>} [req.body.preferredTimes] - Preferred time ranges.
 * @param {Array<{start:number,end:number}>} [req.body.dailyStartConstraints] - Intra-day start time ranges (minutes of day, 0-1440).
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The created event object.
 */
router.post('/',
	ensureAuthenticated,
	createEvent
)

/**
 * @route GET /api/v1/events
 * @description Fetch events with explicit filter parameters. All filters are optional. Multiple user-scoped filters MAY be supplied; when more than one is present they are combined with AND (intersection). If this is undesirable you may enforce "only one user filter" and return 400 otherwise.
 * @access Public/Private
 *
 * Authorization rules:
 *  - Draft events are only returned if the authenticated user is the event creator or an admin for that event.
 *  - Non-public (public=false) events are only returned if the authenticated user is in the members list (any role).
 *
 * Query Parameters:
 *  - createdBy: string
 *      Return events whose creator userId matches this value (creator role).
 *
 *  - adminOf: string
 *      Return events where this userId appears in members with role='admin'.
 *
 *  - participantOf: string
 *      Return events where this userId appears in members with role='participant' (excludes creator/admin).
 *
 *  - memberOf: string
 *      Return events where this userId appears in members with any role (creator | admin | participant).
 *      (If provided together with createdBy/adminOf/participantOf, intersection semantics apply.)
 *
 *  - public: 'true' | 'false'
 *      Filter by publicity flag.
 *
 *  - status: string | string[]
 *      One or multiple event status values (draft | scheduling | scheduled | confirmed | cancelled).
 *      Accept either repeated query parameters (?status=a&status=b) or a comma-separated list (?status=a,b).
 *
 *  - limit: number (default 50, max 200)
 *  - offset: number (default 0)
 *
 * Sorting:
 *  - Default: descending by updatedAt (or scheduledTime if you prefer). Define explicitly for consistency.
 *
 * Responses:
 *  - 200: { events: EventType[]; total: number; }
 *         total = total rows matching (before limit/offset).
 *  - 400: Invalid query parameter combination / validation error.
 *  - 401: If authentication required for requested private/draft data and user not authenticated.
 *
 * Notes:
 *  - Apply authorization constraints before final pagination.
 *  - If both public=true and a non-public-only user filter are given, intersection still applies (likely yielding only public events among that user set).
 *  - For performance, build a compound query using indexes on (public, status), members.userId, members.role, createdBy.
 *
 * Example Requests
	My managed events (creator or admin): choose either two filters or expose a convenience on frontend:
	/api/v1/events?createdBy=ME
	/api/v1/events?adminOf=ME (Frontend can merge results, or you can first call with memberOf=ME and filter roles client-side.)
	Events I participate in (non-admin): /api/v1/events?participantOf=ME
	Any events I am in: /api/v1/events?memberOf=ME
	Public events: /api/v1/events?public=true&limit=20
	Public scheduled events: /api/v1/events?public=true&status=scheduled
	Multiple statuses: /api/v1/events?status=scheduled,confirmed
 */
router.get('/',
	getEvents
)

/**
 * @route GET /api/v1/events/:id
 * @description Get event by ID.
 * @access Public (limited info) / Private (full info for members)
 * @param {string} req.params.id - The ID of the event.
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The event object.
 */
router.get('/:id',
	getEvent
)

/**
 * @route PATCH /api/v1/events/:id
 * @description Partially update event by ID.
 * @access Private (admins only)
 * @param {string} req.params.id - The ID of the event.
 * @param {string} [req.body.name] - The new name (optional).
 * @param {string} [req.body.description] - The new description (optional).
 * @param {Object[]} [req.body.members] - Array of participant objects with userId and role only (availability & padding ignored). First element MUST remain the original creator.
 * @param {string} req.body.members[].userId - User ID of the participant.
 * @param {string} req.body.members[].role - Role of the participant ('creator', 'admin', 'participant').
 * NOTE: customPaddingAfter and availabilityStatus (including 'invited') cannot be modified via this route; use /:eventId/settings as the participant.
 * @param {Object} [req.body.timeWindow] - Time window for the event (optional).
 * @param {number} req.body.timeWindow.start - Start time (Unix ms).
 * @param {number} req.body.timeWindow.end - End time (Unix ms).
 * @param {number} [req.body.duration] - Duration in milliseconds (optional).
 * @param {string} [req.body.status] - Event status ('draft', 'scheduling', 'scheduled', 'confirmed', 'cancelled') (optional).
 * @param {number} [req.body.scheduledTime] - Scheduled time (Unix ms) (optional).
 * @param {boolean} [req.body.public] - Whether the event is public (optional).
 * @param {Array} [req.body.blackoutPeriods] - Blackout time ranges (optional).
 * @param {Array} [req.body.preferredTimes] - Preferred time ranges (optional).
 * @param {Array} [req.body.dailyStartConstraints] - Intra-day start time ranges (minutes of day, 0-1440).
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The updated event object.
 */
router.patch('/:id',
	ensureAuthenticated,
	updateEvent
)

/**
 * @route DELETE /api/v1/events/:id
 * @description Delete event by ID.
 * @access Private (admins only)
 * @param {string} req.params.id - The ID of the event.
 * @returns {number} res.status - The status code of the HTTP response.
 */
router.delete('/:id',
	ensureAuthenticated,
	deleteEvent
)

/**
 * @route PATCH /api/v1/events/:eventId/settings
 * @description Partially update user's settings for a specific event.
 * @access Private (members only)
 * @param {string} req.params.eventId - The ID of the event.
 * @param {number} [req.body.customPaddingAfter] - Custom padding after event (optional).
 * @param {string} [req.body.availabilityStatus] - Availability status: 'invited', 'available', 'unavailable', 'tentative' (optional).
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The updated user event settings object.
 */
router.patch('/:eventId/settings',
	ensureAuthenticated,
	updateUserEventSettings
)

/**
 * @route GET /api/v1/events/:eventId/settings
 * @description Get user's settings for a specific event.
 * @access Private (members only)
 * @param {string} req.params.eventId - The ID of the event.
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The user event settings object.
 */
router.get('/:eventId/settings',
	ensureAuthenticated,
	getUserEventSettings
)

/**
 * @route PATCH /api/v1/events/:id/members/role
 * @description Update a participant's role in an event.
 * @access Private (admins and creators only)
 * @param {string} req.params.id - The ID of the event.
 * @param {string} req.body.userId - The user ID whose role to update.
 * @param {string} req.body.role - The new role ('creator', 'admin', 'participant').
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The updated event object.
 */
router.patch('/:id/members/role',
	ensureAuthenticated,
	updateParticipantRole
)

export default router
