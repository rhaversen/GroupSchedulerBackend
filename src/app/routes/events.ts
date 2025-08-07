import { Router } from 'express'

import { ensureAuthenticated } from '../controllers/authController.js'
import {
	createEvent,
	deleteEvent,
	getEvent,
	getUserEvents,
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
 * @param {Object[]} [req.body.participants] - Array of participant objects with userId, role, and settings (optional, defaults to creator).
 * @param {string} req.body.participants[].userId - User ID of the participant.
 * @param {string} req.body.participants[].role - Role of the participant ('creator', 'admin', 'participant').
 * @param {number} [req.body.participants[].customPaddingAfter] - Custom padding after event (optional).
 * @param {string} [req.body.participants[].availabilityStatus] - Availability status ('available', 'unavailable', 'tentative').
 * @param {Object} req.body.timeWindow - Time window for the event.
 * @param {number} req.body.timeWindow.start - Start time (Unix ms).
 * @param {number} req.body.timeWindow.end - End time (Unix ms).
 * @param {number} req.body.duration - Duration in milliseconds.
 * @param {Array} [req.body.blackoutPeriods] - Blackout time ranges (optional).
 * @param {Array} [req.body.preferredTimes] - Preferred time ranges (optional).
 * @returns {number} res.status - The status code of the HTTP response (201 Created).
 * @returns {Object} res.body - The created event object.
 * @returns {string} res.body._id - The event ID.
 * @returns {string} res.body.name - The event name.
 * @returns {string} res.body.description - The event description.
 * @returns {Array} res.body.participants - Array of participant objects.
 * @returns {Object} res.body.timeWindow - Time window object.
 * @returns {number} res.body.duration - Duration in milliseconds.
 * @returns {string} res.body.status - Event status (defaults to 'draft').
 * @returns {Array} res.body.blackoutPeriods - Blackout periods array.
 * @returns {Array} [res.body.preferredTimes] - Preferred times array if provided.
 * @returns {Date} res.body.createdAt - Creation timestamp.
 * @returns {Date} res.body.updatedAt - Last update timestamp.
 */
router.post('/',
	ensureAuthenticated,
	createEvent
)

/**
 * @route GET /api/v1/events/user
 * @description Get all events for the current user.
 * @access Private
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Array} res.body - Array of event objects sorted by start time.
 * @returns {string} res.body[]._id - The event ID.
 * @returns {string} res.body[].name - The event name.
 * @returns {string} res.body[].description - The event description.
 * @returns {Array} res.body[].participants - Array of participant objects (userId and role only).
 * @returns {Object} res.body[].timeWindow - Time window object.
 * @returns {number} res.body[].duration - Duration in milliseconds.
 * @returns {string} res.body[].status - Event status.
 * @returns {number} [res.body[].scheduledTime] - Scheduled time if set.
 * @returns {Array} res.body[].blackoutPeriods - Blackout periods array.
 * @returns {Array} [res.body[].preferredTimes] - Preferred times array if set.
 * @returns {Date} res.body[].createdAt - Creation timestamp.
 * @returns {Date} res.body[].updatedAt - Last update timestamp.
 */
router.get('/user',
	ensureAuthenticated,
	getUserEvents
)

/**
 * @route GET /api/v1/events/:id
 * @description Get event by ID.
 * @access Private (participants only)
 * @param {string} req.params.id - The ID of the event.
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The event object.
 * @returns {string} res.body._id - The event ID.
 * @returns {string} res.body.name - The event name.
 * @returns {string} res.body.description - The event description.
 * @returns {Array} res.body.participants - Array of participant objects (userId and role only).
 * @returns {Object} res.body.timeWindow - Time window object.
 * @returns {number} res.body.duration - Duration in milliseconds.
 * @returns {string} res.body.status - Event status.
 * @returns {number} [res.body.scheduledTime] - Scheduled time if set.
 * @returns {Array} res.body.blackoutPeriods - Blackout periods array.
 * @returns {Array} [res.body.preferredTimes] - Preferred times array if set.
 * @returns {Date} res.body.createdAt - Creation timestamp.
 * @returns {Date} res.body.updatedAt - Last update timestamp.
 */
router.get('/:id',
	ensureAuthenticated,
	getEvent
)

/**
 * @route PATCH /api/v1/events/:id
 * @description Update event by ID (partial update).
 * @access Private (admins only)
 * @param {string} req.params.id - The ID of the event.
 * @param {string} [req.body.name] - The new name (optional).
 * @param {string} [req.body.description] - The new description (optional).
 * @param {Object[]} [req.body.participants] - Array of participant objects with userId, role, and settings (optional).
 * @param {string} req.body.participants[].userId - User ID of the participant.
 * @param {string} req.body.participants[].role - Role of the participant ('creator', 'admin', 'participant').
 * @param {number} [req.body.participants[].customPaddingAfter] - Custom padding after event (optional).
 * @param {string} [req.body.participants[].availabilityStatus] - Availability status ('available', 'unavailable', 'tentative').
 * @param {Object} [req.body.timeWindow] - Time window for the event (optional).
 * @param {number} req.body.timeWindow.start - Start time (Unix ms).
 * @param {number} req.body.timeWindow.end - End time (Unix ms).
 * @param {number} [req.body.duration] - Duration in milliseconds (optional).
 * @param {string} [req.body.status] - Event status ('draft', 'scheduling', 'scheduled', 'confirmed', 'cancelled') (optional).
 * @param {number} [req.body.scheduledTime] - Scheduled time (Unix ms) (optional).
 * @param {Array} [req.body.blackoutPeriods] - Blackout time ranges (optional).
 * @param {Array} [req.body.preferredTimes] - Preferred time ranges (optional).
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The updated event object.
 * @returns {string} res.body._id - The event ID.
 * @returns {string} res.body.name - The event name.
 * @returns {string} res.body.description - The event description.
 * @returns {Array} res.body.participants - Array of participant objects.
 * @returns {Object} res.body.timeWindow - Time window object.
 * @returns {number} res.body.duration - Duration in milliseconds.
 * @returns {string} res.body.status - Event status.
 * @returns {number} [res.body.scheduledTime] - Scheduled time if set.
 * @returns {Array} res.body.blackoutPeriods - Blackout periods array.
 * @returns {Array} [res.body.preferredTimes] - Preferred times array if set.
 * @returns {Date} res.body.createdAt - Creation timestamp.
 * @returns {Date} res.body.updatedAt - Last update timestamp.
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
 * @returns {number} res.status - The status code of the HTTP response (204 No Content).
 */
router.delete('/:id',
	ensureAuthenticated,
	deleteEvent
)

/**
 * @route PATCH /api/v1/events/:eventId/settings
 * @description Update user's settings for a specific event (partial update).
 * @access Private (participants only)
 * @param {string} req.params.eventId - The ID of the event.
 * @param {number} [req.body.customPaddingAfter] - Custom padding after event (optional).
 * @param {string} [req.body.availabilityStatus] - Availability status: 'available', 'unavailable', 'tentative' (optional).
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The updated user event settings object.
 * @returns {string} res.body.userId - The user ID.
 * @returns {string} res.body.eventId - The event ID.
 * @returns {number} [res.body.customPaddingAfter] - Custom padding after event if set.
 * @returns {string} res.body.availabilityStatus - Current availability status.
 */
router.patch('/:eventId/settings',
	ensureAuthenticated,
	updateUserEventSettings
)

/**
 * @route GET /api/v1/events/:eventId/settings
 * @description Get user's settings for a specific event.
 * @access Private (participants only)
 * @param {string} req.params.eventId - The ID of the event.
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The user event settings object.
 * @returns {string} res.body.userId - The user ID.
 * @returns {string} res.body.eventId - The event ID.
 * @returns {number} [res.body.customPaddingAfter] - Custom padding after event if set.
 * @returns {string} res.body.availabilityStatus - Current availability status.
 */
router.get('/:eventId/settings',
	ensureAuthenticated,
	getUserEventSettings
)

/**
 * @route PATCH /api/v1/events/:id/participants/role
 * @description Update a participant's role in an event (partial update).
 * @access Private (admins and creators only)
 * @param {string} req.params.id - The ID of the event.
 * @param {string} req.body.userId - The user ID whose role to update.
 * @param {string} req.body.role - The new role ('creator', 'admin', 'participant').
 * @returns {number} res.status - The status code of the HTTP response.
 * @returns {Object} res.body - The updated event object with all fields.
 */
router.patch('/:id/participants/role',
	ensureAuthenticated,
	updateParticipantRole
)

export default router
