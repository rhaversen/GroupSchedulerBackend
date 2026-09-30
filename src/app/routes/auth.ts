import { Router } from 'express'

import { login, logout, register, status } from '../controllers/authController.js'
import { ensureAuthenticated } from '../middleware/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', ensureAuthenticated, logout)
router.get('/status', status)
router.get('/is-authenticated', ensureAuthenticated, (req, res) => {
	res.status(200).send(req.sessionID)
})

export default router
