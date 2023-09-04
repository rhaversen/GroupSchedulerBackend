/* import dotenv from 'dotenv'

import chai from 'chai'
import chaiHttp from 'chai-http'

import { deleteAllDocumentsFromAllCollections } from '../utils/database.js'
import logger from '../utils/logger.js'
import UserModel, { type IUser } from '../models/User.js'
import error from '../utils/errors.js'
import { AppType, ShutDownType } from '../server.js'

// Controller functions
import {
    registerUser,
    loginUser,
    getEvents,
    newCode,
    followUser,
    unfollowUser,
    getUser,
    updateUser
} from '../controllers/userController'
dotenv.config()

chai.use(chaiHttp)
const { expect } = chai

const {
    ServerError
} = error

// Types
type ServerType = {
    app: AppType
    shutDown: ShutDownType
};

// Helper functions
async function establishFollowing (followingUser: IUser, followedUser: IUser) {
    await Promise.all([
        UserModel.findByIdAndUpdate(followingUser._id, { $push: { following: followedUser._id } }).exec(),
        UserModel.findByIdAndUpdate(followedUser._id, { $push: { followers: followingUser._id._id } }).exec()
    ])
    logger.info('User followed')
}

let server: ServerType

describe('Server Tests', () => {
    before(async function () {
        this.timeout(10000) // Set the timeout to 10 seconds.
        server = await import('../server.js')
        // Wipe database before testing
        await deleteAllDocumentsFromAllCollections()
    })

    beforeEach(async function () {
        this.timeout(10000) // Set the timeout to 10 seconds.
        // Define users
        const names = [
            'a1',
            'b2',
            'c3',
            'd4',
            'e5',
            'f6',
            'g7',
            'h8',
            'i9',
            'j10',
            'k11'
        ]
        const emails = [
            'a1@gmail.com',
            'b2@gmail.com',
            'c3@gmail.com',
            'd4@gmail.com',
            'e5@hot.com',
            'f6@hot.com',
            'g7@outlook.com',
            'h8@apple.com',
            'i9@outlook.com',
            'j10@microsoft.com',
            'k11@bing.com'
        ]
        const passwords = [
            '123',
            'abc',
            'abc123',
            '123abc',
            '123',
            'qwe',
            'rty',
            'ab12',
            'a1b2',
            'a2b1',
            'a123bc'
        ]

        logger.info('Creating users')

        // Create users
        const savedUserArray = []
        for (let i = 0; i <= 10; i++) {
            const username = names[i]
            const email = emails[i]
            const password = passwords[i]
            const newUser = new UserModel({ username, email, password })
            try {
                const savedUser = await newUser.save()
                if (!savedUser) {
                    throw new ServerError('Error saving user')
                }
                savedUserArray[i] = savedUser
                logger.info('User created')
            } catch (err) {
                logger.error('Error occurred:', err)
                throw err // Re-throwing the error to fail the test
            }            
        }

        // Follow users according to spreadsheet https://docs.google.com/spreadsheets/d/141samGt6TACfhqiGgxYQHJvSCWAKOiOF8dTemNfQrkk/edit

        const relations = [
            [0, 1],
            [1, 0],
            [2, 0],
            [2, 1],
            [2, 3],
            [2, 4],
            [2, 5],
            [2, 6],
            [2, 7],
            [2, 8],
            [2, 9],
            [2, 10],
            [3, 0],
            [3, 1],
            [3, 4],
            [3, 5],
            [3, 6],
            [3, 7],
            [3, 8],
            [3, 9],
            [3, 10],
            [0, 10],
            [1, 10],
            [2, 10],
            [3, 10],
            [4, 10],
            [5, 10],
            [6, 10],
            [7, 10],
            [8, 10],
            [9, 10],
            [10, 3],
            [4, 5],
            [6, 7],
            [6, 8],
            [6, 9],
            [6, 10],
            [7, 6],
            [7, 8],
            [7, 9],
            [7, 10],
            [8, 6],
            [8, 7],
            [8, 9],
            [8, 10],
            [9, 6],
            [9, 7],
            [9, 8],
            [9, 10],
            [10, 6],
            [10, 7],
            [10, 8],
            [10, 9]
        ]

        for (const relation of relations) {
            const followingUser = savedUserArray[relation[0]]
            const followedUser = savedUserArray[relation[1]]
            await establishFollowing(followingUser, followedUser)
        }
    })

    afterEach(async function () {
        this.timeout(10000) // Set the timeout to 10 seconds.
        // Wipe database after each test
        await deleteAllDocumentsFromAllCollections()
    })

    after(async function () {
        this.timeout(10000) // Set the timeout to 10 seconds.
        await server.shutDown()
    })

    it('POST /api/v1/users should create a new user', async function () {
        this.timeout(10000) // Set the timeout to 10 seconds.

        const newUser = { username: 'Test User', email: 'testuser@gmail.com', password: 'testpassword', confirmPassword: 'testpassword', stayLoggedIn: false }
        
        const res = await chai.request(server.app).post('/api/v1/users').send(newUser)

        expect(res).to.have.status(201)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.string('Registration successful! Please check your email to confirm your account within 24 hours or your account will be deleted.')

        const savedUser = await UserModel.findOne({email: newUser.email}).exec() as IUser

        expect(savedUser.confirmed).to.be.false

        await savedUser.confirmUser()
        await savedUser.save()

        expect(savedUser.confirmed).to.be.true

        expect(savedUser.username).to.be.a.string(newUser.username)

    })
})
 */