import { Router } from 'express'

import { createEvent, deleteEvent, getEvent, getEvents, updateEvent } from '../controllers/eventController.js'
import { ensureAuthenticated } from '../middleware/auth.js'

const router = Router()

router.post('/', ensureAuthenticated, createEvent)
router.get('/', getEvents)
router.get('/:id', getEvent)
router.patch('/:id', ensureAuthenticated, updateEvent)
router.delete('/:id', ensureAuthenticated, deleteEvent)

export default router
