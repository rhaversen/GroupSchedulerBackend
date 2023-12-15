/* // file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes

// Node.js built-in modules

// Third-party libraries
import chai from 'chai'
import chaiHttp from 'chai-http'
import { parse } from 'cookie'

// Own modules
import logger from '../src/utils/logger.js'
import UserModel, { type IUser } from '../src/models/User.js'
import EventModel, { type IEvent } from '../src/models/Event.js'
import {
    getSessionExpiry,
    getSessionPersistentExpiry,
    getExpressPort
} from '../src/utils/setupConfig.js'
import { isMemoryDatabase } from '../src/database/databaseHandler.js'

chai.use(chaiHttp)
const { expect } = chai

const server = await import('../src/index.js')

// Configs
const sessionExpiry = getSessionExpiry()
const sessionPersistentExpiry = getSessionPersistentExpiry()
const expressPort = getExpressPort()

async function getCSRFToken (agent: ChaiHttp.Agent) {
    const res = await agent.get('/csrf-token')
    logger.silly(res.body.csrfToken)
    return res.body.csrfToken
}

async function cleanDatabase () {
    /// ////////////////////////////////////////////
    /// ///////////////////////////////////////////
    if (!isMemoryDatabase()) { return }
    /// ////////////////////////////////////////////
    /// ///////////////////////////////////////////
    try {
        await UserModel.collection.dropIndexes()
        await EventModel.collection.dropIndexes()
        logger.silly('Indexes dropped successfully')
    } catch (error: any) {
        logger.error('Error dropping indexes:', error ? error.message || error : 'Unknown error')
    }
}

beforeEach(async function () {
})

afterEach(async function () {
    await cleanDatabase()
})

after(function () {
    server.shutDown()
})

describe('Delete User Endpoint DELETE /v1/users/', function () {
    let userA: IUser, userB: IUser
    let event1: IEvent, event2: IEvent
    let agent: ChaiHttp.Agent

    beforeEach(async function () {
        agent = chai.request.agent(server.app)

        // Create two test users: A and B
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
        userA.confirmUser()
        await userA.save()

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        })
        userB.confirmUser()
        await userB.save()

        // Create three test events
        event1 = new EventModel({
            eventName: 'Event 1',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event1.save()

        event2 = new EventModel({
            eventName: 'Event 2',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event2.save()

        // Assign events to users
        await Promise.all([
            // UserA and UserB attends Event 1
            UserModel.findByIdAndUpdate(userA._id, { $push: { events: { $each: [event1._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userB._id, { $push: { events: { $each: [event1._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event1._id, { $push: { participants: { $each: [userA._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event1._id, { $push: { participants: { $each: [userB._id] } } }).exec(),

            // UserA attends Event 2
            UserModel.findByIdAndUpdate(userA._id, { $push: { events: { $each: [event2._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event2._id, { $push: { participants: { $each: [userA._id] } } }).exec(),
        ])

        // Login as userA
        await agent.post('/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
    })

    afterEach(async function () {
        // Clean up by removing test users and events
        await UserModel.findOneAndDelete({ email: 'userA@gmail.com' }).exec()
        await UserModel.findOneAndDelete({ email: 'userB@gmail.com' }).exec()
        await EventModel.findByIdAndDelete(event1._id).exec()
        await EventModel.findByIdAndDelete(event2._id).exec()
        agent.close()
    })

    it('should delete the empty event after deletion', async function () {
        await agent.delete(`/v1/users/`)

        const deletedEvent = await EventModel.findById(event2._id).exec() as IEvent | null

        expect(deletedEvent).to.be.null

    })

}) */