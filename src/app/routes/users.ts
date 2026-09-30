import { Router } from 'express'

import { deleteUser, getUser, getUsers, updateUser } from '../controllers/userController.js'
import { ensureAuthenticated } from '../middleware/auth.js'

const router = Router()

router.get('/', getUsers)
router.get('/:id', getUser)
router.patch('/:id', ensureAuthenticated, updateUser)
router.delete('/:id', ensureAuthenticated, deleteUser)

export default router
