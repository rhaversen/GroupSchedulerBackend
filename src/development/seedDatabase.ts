// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { randomUUID } from 'crypto'

import EventModel from '../app/models/Event.js'
import SessionModel from '../app/models/Session.js'
import UserModel from '../app/models/User.js'
import logger from '../app/utils/logger.js'

logger.info('Seeding database')

const userAgents = [
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (iPad; CPU OS 18_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/134.0.6998.33 Mobile/15E148 Safari/604.1'
]

const now = Date.now()
const hour = 60 * 60 * 1000
const day = 24 * hour

// Test user for end-to-end testing
const userTest = await UserModel.create({ username: 'Test', email: 'test@test.com', password: 'password' })
userTest.confirmUser()
await userTest.save()

// Unconfirmed user for testing confirmation flow
const unconfirmedUser = await UserModel.create({ username: 'Unconfirmed', email: 'test1@test.com', password: 'password' })
unconfirmedUser.confirmationCode = 'unconfirmed123'
await unconfirmedUser.save()

// Additional users for more realistic events
const userAlice = await UserModel.create({ username: 'Alice', email: 'alice.dev@example.com', password: 'Password123!' })
userAlice.confirmUser()
await userAlice.save()

const userBob = await UserModel.create({ username: 'Bob', email: 'bob.dev@example.com', password: 'Password123!' })
userBob.confirmUser()
await userBob.save()

const userCharlie = await UserModel.create({ username: 'Charlie', email: 'charlie.dev@example.com', password: 'Password123!' })
userCharlie.confirmUser()
await userCharlie.save()

const userDana = await UserModel.create({ username: 'Dana', email: 'dana.dev@example.com', password: 'Password123!' })
userDana.confirmUser()
await userDana.save()

const userEve = await UserModel.create({ username: 'Eve', email: 'eve.dev@example.com', password: 'Password123!' })
userEve.confirmUser()
await userEve.save()

const userFrank = await UserModel.create({ username: 'Frank', email: 'frank.dev@example.com', password: 'Password123!' })
userFrank.confirmUser()
await userFrank.save()

// Events
await EventModel.create({
	name: 'Board Game Night',
	description: 'Casual board games with friends',
	participants: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlice._id, role: 'participant', availabilityStatus: 'tentative' },
		{ userId: userBob._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userCharlie._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 1 * day, end: now + 10 * day },
	status: 'scheduling',
	blackoutPeriods: [
		{ start: now + 2 * day + 18 * hour, end: now + 2 * day + 21 * hour }
	],
	preferredTimes: [
		{ start: now + 3 * day + 17 * hour, end: now + 3 * day + 22 * hour }
	]
})

await EventModel.create({
	name: 'Birthday Bash',
	description: 'Surprise party with cake and music',
	participants: [
		{ userId: userAlice._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userDana._id, role: 'participant', availabilityStatus: 'tentative' },
		{ userId: userEve._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 4 * hour,
	timeWindow: { start: now + 2 * day, end: now + 14 * day },
	status: 'scheduled',
	scheduledTime: now + 2 * day + 6 * hour,
	blackoutPeriods: [],
	preferredTimes: []
})

await EventModel.create({
	name: 'Picnic in the Park',
	description: 'Bring snacks and frisbees',
	participants: [
		{ userId: userBob._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'tentative' },
		{ userId: userFrank._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userAlice._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 90 * 60 * 1000,
	timeWindow: { start: now + 3 * day, end: now + 8 * day },
	status: 'draft',
	blackoutPeriods: [
		{ start: now + 4 * day + 12 * hour, end: now + 4 * day + 14 * hour }
	],
	preferredTimes: [
		{ start: now + 5 * day + 10 * hour, end: now + 5 * day + 13 * hour }
	]
})

await EventModel.create({
	name: 'Potluck Dinner',
	description: 'Everyone brings a dish',
	participants: [
		{ userId: userDana._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userEve._id, role: 'participant', availabilityStatus: 'tentative' },
		{ userId: userCharlie._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 1 * day, end: now + 5 * day },
	status: 'scheduling',
	blackoutPeriods: [],
	preferredTimes: [
		{ start: now + 2 * day + 18 * hour, end: now + 2 * day + 21 * hour }
	],
	createdAt: new Date(now - 1 * day)
})

await EventModel.create({
	name: 'Weekend Hike',
	description: 'Early morning trail hike',
	participants: [
		{ userId: userFrank._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userBob._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userAlice._id, role: 'participant', availabilityStatus: 'tentative' }
	],
	duration: 5 * hour,
	timeWindow: { start: now + 6 * day, end: now + 12 * day },
	status: 'scheduling',
	blackoutPeriods: [],
	preferredTimes: [],
	createdAt: new Date(now - 7 * day)
})

// Sessions
await SessionModel.create({
	_id: randomUUID(),
	session: JSON.stringify({
		cookie: {
			originalMaxAge: 86400000,
			expires: new Date(Date.now() + 86400000),
			secure: true,
			httpOnly: true,
			path: '/'
		},
		passport: { user: userAlice.id },
		ipAddress: '127.0.0.1',
		loginTime: new Date(),
		lastActivity: new Date(),
		userAgent: userAgents[1]
	}),
	expires: new Date(Date.now() + 86400000)
})

await SessionModel.create({
	_id: randomUUID(),
	session: JSON.stringify({
		cookie: {
			originalMaxAge: 86400000,
			expires: new Date(Date.now() + 86400000),
			secure: true,
			httpOnly: true,
			path: '/'
		},
		passport: { user: userAlice.id },
		ipAddress: '192.168.0.10',
		loginTime: new Date(Date.now() - 12 * hour),
		lastActivity: new Date(Date.now() - 1 * hour),
		userAgent: userAgents[0]
	}),
	expires: new Date(Date.now() + 86400000)
})

await SessionModel.create({
	_id: randomUUID(),
	session: JSON.stringify({
		cookie: {
			originalMaxAge: 3600000,
			expires: new Date(Date.now() + 3600000),
			secure: true,
			httpOnly: true,
			path: '/'
		},
		passport: { user: userBob.id },
		ipAddress: '192.168.0.11',
		loginTime: new Date(Date.now() - 2 * hour),
		lastActivity: new Date(Date.now() - 30 * 60 * 1000),
		userAgent: userAgents[2]
	}),
	expires: new Date(Date.now() + 3600000)
})

await SessionModel.create({
	_id: randomUUID(),
	session: JSON.stringify({
		cookie: {
			originalMaxAge: null,
			expires: null,
			secure: true,
			httpOnly: true,
			path: '/'
		},
		passport: { user: userBob.id },
		ipAddress: '10.0.0.5',
		loginTime: new Date(Date.now() - 48 * hour),
		lastActivity: new Date(Date.now() - 48 * hour),
		userAgent: userAgents[4]
	}),
	expires: new Date(Date.now() + 86400000)
})

await SessionModel.create({
	_id: randomUUID(),
	session: JSON.stringify({
		cookie: {
			originalMaxAge: 86400000,
			expires: new Date(Date.now() + 86400000),
			secure: true,
			httpOnly: true,
			path: '/'
		},
		passport: { user: userTest.id },
		ipAddress: '203.0.113.5',
		loginTime: new Date(Date.now() - 3 * hour),
		lastActivity: new Date(Date.now() - 10 * 60 * 1000),
		userAgent: userAgents[3]
	}),
	expires: new Date(Date.now() + 86400000)
})

await SessionModel.create({
	_id: randomUUID(),
	session: JSON.stringify({
		cookie: {
			originalMaxAge: null,
			expires: null,
			secure: true,
			httpOnly: true,
			path: '/'
		},
		passport: { user: userTest.id },
		ipAddress: '198.51.100.23',
		loginTime: new Date(Date.now() - 36 * hour),
		lastActivity: new Date(Date.now() - 35 * hour),
		userAgent: userAgents[0]
	}),
	expires: new Date(Date.now() + 86400000)
})

logger.info('Database seeded')
