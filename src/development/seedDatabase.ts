// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
import EventModel from '../app/models/Event.js'
import UserModel from '../app/models/User.js'

const now = Date.now()
const day = 24 * 60 * 60 * 1000

const alice = await UserModel.create({ username: 'Alice', email: 'alice@example.com', password: 'password123', confirmed: true })
const bob = await UserModel.create({ username: 'Bob', email: 'bob@example.com', password: 'password123', confirmed: true })

await EventModel.create({
	name: 'Team Meeting',
	duration: 3_600_000,
	type: 'fixed',
	status: 'locked',
	scheduledTime: now + 2 * day,
	visibility: 'private',
	members: [
		{ userId: String(alice._id), role: 'creator', availabilityStatus: 'available' },
		{ userId: String(bob._id), role: 'participant', availabilityStatus: 'invited' }
	]
})

await EventModel.create({
	name: 'Project Kickoff',
	duration: 7_200_000,
	type: 'flexible',
	status: 'open',
	timeWindow: { start: now + day, end: now + 14 * day },
	visibility: 'public',
	members: [
		{ userId: String(alice._id), role: 'creator', availabilityStatus: 'available' }
	]
})

export {}
