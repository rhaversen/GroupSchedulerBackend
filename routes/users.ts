// Node.js built-in modules

// Third-party libraries
import Router from 'express'

// Own modules
import {
    sanitizeInput
} from '../middleware/sanitizer.js'

// Controller functions
import {
    registerUser,
    confirmUser,
    loginUserLocal,
    logoutUser,
    getEvents,
    newCode,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getCommonEvents,
    updateUser
} from '../controllers/userController.js'

import { ensureAuthenticated } from '../utils/passportConfig.js'

// Destructuring and global variables
const router = Router()

/**
 * @route GET api/v1/users/ensureAuthenticated
 * @desc Validate session
 * @access Public
 */
router.get('/ensureAuthenticated',
    ensureAuthenticated,
    // If we get here, the session is valid, so we just respond with a success message
    function (req, res) {
        res.status(200).json({
            message: 'User has valid session.'
        })
    }
)

/**
 * @route POST api/v1/users
 * @desc Register user
 * @access Public
 */
router.post('/',
    sanitizeInput,
    registerUser
)

/**
 * @route POST api/v1/users/confirm/:code
 * @desc Confirm user
 * @access Public
 */
router.post('/confirm/:userCode',
    sanitizeInput,
    confirmUser
)

/**
* @route POST api/v1/users/login
* @desc Login user and return session cookie
* @access Public
*/
router.post('/login-local',
    sanitizeInput,
    loginUserLocal
)

/**
* @route DELETE api/v1/users/logout
* @desc Logout user and delete session from store
* @access AUTHENTICATED
*/
router.delete('/logout',
    ensureAuthenticated,
    sanitizeInput,
    logoutUser
)

/**
* @route GET api/v1/users/events
* @desc Get the users events
* @access AUTHENTICATED
*/
router.get('/events',
    ensureAuthenticated,
    getEvents
)

/**
 * @route POST api/v1/users/new-code
 * @desc Update user with a random user code
 * @access AUTHENTICATED
*/
router.post('/new-code',
    ensureAuthenticated,
    newCode
)

/**
* @route PUT api/v1/users/unfollow/:userId
* @desc Follow user. Add userId to users following array, add user to userId's followers array
* @access AUTHENTICATED
*/
router.put('/following/:userId',
    ensureAuthenticated,
    followUser
)

/**
* @route DELETE api/v1/users/unfollow/:userId
* @desc Un-follow user. Remove userId from users following array, remove user from userId's followers array
* @access AUTHENTICATED
*/
router.delete('/unfollow/:userId',
    ensureAuthenticated,
    unfollowUser
)

/**
* @route GET api/v1/users/followers
* @desc Get the users following the logged in user (An array of names)
* @access AUTHENTICATED
*/
router.get('/followers',
    ensureAuthenticated,
    getFollowers
)

/**
* @route GET api/v1/users/following
* @desc Get the users being followed by the logged in user (An array of names)
* @access AUTHENTICATED
*/
router.get('/following',
    ensureAuthenticated,
    getFollowing
)

/**
* @route GET api/v1/users/:userId/common-events
* @desc Get the events in common with a user
* @access AUTHENTICATED
*/
router.get('/:userId/common-events',
    ensureAuthenticated,
    getCommonEvents
)

/**
* @route PATCH api/v1/users/update-password
* @desc Update users name and/or password
* @access AUTHENTICATED
*/
router.patch('/update-user',
    ensureAuthenticated,
    updateUser
)

export default router
