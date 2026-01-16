// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { randomUUID } from 'crypto'

import EventModel from '../app/models/Event.js'
import SessionModel from '../app/models/Session.js'
import UserModel from '../app/models/User.js'
import logger from '../app/utils/logger.js'

logger.info('Seeding database with essential event states')

const userAgents = [
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15'
]

const now = Date.now()
const hour = 60 * 60 * 1000
const day = 24 * hour

const userTest = await UserModel.create({ username: 'TestUser', email: 'test@test.com', password: 'password' }); userTest.confirmUser(); await userTest.save()
const userAlpha = await UserModel.create({ username: 'AlphaUser', email: 'alpha@test.com', password: 'password' }); userAlpha.confirmUser(); await userAlpha.save()
const userBeta = await UserModel.create({ username: 'BetaUser', email: 'beta@test.com', password: 'password' }); userBeta.confirmUser(); await userBeta.save()
const userGamma = await UserModel.create({ username: 'GammaUser', email: 'gamma@test.com', password: 'password' }); userGamma.confirmUser(); await userGamma.save()
const userDelta = await UserModel.create({ username: 'DeltaUser', email: 'delta@test.com', password: 'password' }); userDelta.confirmUser(); await userDelta.save()
const userEpsilon = await UserModel.create({ username: 'EpsilonUser', email: 'epsilon@test.com', password: 'password' }); userEpsilon.confirmUser(); await userEpsilon.save()

const userUnconfirmed = await UserModel.create({ username: 'UnconfirmedUser', email: 'unconfirmed@test.com', password: 'password' })
userUnconfirmed.confirmationCode = 'unconfirmed123'; await userUnconfirmed.save()

await EventModel.create({
	name: 'Draft Event - Basic',
	description: 'Basic draft event with single creator',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }],
	schedulingMethod: 'flexible',
	duration: 2 * hour,
	timeWindow: { start: now + 1 * day, end: now + 7 * day },
	status: 'scheduling',
	visibility: 'draft',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 9 * 60 * 60 * 1000, end: 18 * 60 * 60 * 1000 }]
})

await EventModel.create({
	name: 'Scheduling Private Event',
	description: 'Private event in scheduling phase with multiple members',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available' }
	],
	schedulingMethod: 'flexible',
	duration: 90 * 60 * 1000,
	timeWindow: { start: now + 2 * day, end: now + 14 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 5 * day + 12 * hour, end: now + 5 * day + 14 * hour }],
	preferredTimes: [{ start: now + 3 * day + 10 * hour, end: now + 3 * day + 16 * hour }],
	dailyStartConstraints: [{ start: 10 * 60 * 60 * 1000, end: 17 * 60 * 60 * 1000 }]
})

await EventModel.create({
	name: 'Scheduling Public Event',
	description: 'Public event gathering availability',
	members: [
		{ userId: userAlpha._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'available' }
	],
	schedulingMethod: 'flexible',
	duration: 3 * hour,
	timeWindow: { start: now + 3 * day, end: now + 21 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 7 * day + 14 * hour, end: now + 7 * day + 18 * hour }],
	dailyStartConstraints: [{ start: 14 * 60 * 60 * 1000, end: 20 * 60 * 60 * 1000 }]
})

await EventModel.create({
	name: 'Confirmed Team Meeting',
	description: 'Confirmed weekly team meeting',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' }
	],
	schedulingMethod: 'fixed',
	duration: 60 * 60 * 1000,
	status: 'confirmed',
	scheduledTime: now + 2 * day + 10 * hour,
	visibility: 'private'
})

await EventModel.create({
	name: 'Confirmed Product Launch',
	description: 'Confirmed product launch planning session',
	members: [
		{ userId: userGamma._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userEpsilon._id, role: 'participant', availabilityStatus: 'available' }
	],
	schedulingMethod: 'fixed',
	duration: 4 * hour,
	status: 'confirmed',
	scheduledTime: now + 10 * day + 13 * hour,
	visibility: 'public'
})

await EventModel.create({
	name: 'Cancelled Workshop',
	description: 'Workshop cancelled due to scheduling conflicts',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'unavailable' },
		{ userId: userAlpha._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' }
	],
	schedulingMethod: 'flexible',
	duration: 2 * hour,
	timeWindow: { start: now + 1 * day, end: now + 10 * day },
	status: 'cancelled',
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 9 * 60 * 60 * 1000, end: 17 * 60 * 60 * 1000 }]
})

await EventModel.create({
	name: 'Large Team Event',
	description: 'Event with many participants for stress testing',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userDelta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userEpsilon._id, role: 'participant', availabilityStatus: 'available' }
	],
	schedulingMethod: 'flexible',
	duration: 3 * hour,
	timeWindow: { start: now + 7 * day, end: now + 28 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 14 * day, end: now + 14 * day + 4 * hour }],
	preferredTimes: [
		{ start: now + 10 * day + 9 * hour, end: now + 10 * day + 12 * hour },
		{ start: now + 12 * day + 14 * hour, end: now + 12 * day + 17 * hour }
	],
	dailyStartConstraints: [{ start: 9 * 60 * 60 * 1000, end: 17 * 60 * 60 * 1000 }]
})

await EventModel.create({
	name: 'Public Event (TestUser not member)',
	description: 'Public event that TestUser is not a member of',
	members: [
		{ userId: userAlpha._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' }
	],
	schedulingMethod: 'flexible',
	duration: 2 * hour,
	timeWindow: { start: now + 2 * day, end: now + 15 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 10 * 60 * 60 * 1000, end: 18 * 60 * 60 * 1000 }]
})

await EventModel.create({
	name: 'Event with Custom Padding',
	description: 'Event testing custom padding after members',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available', customPaddingAfter: 30 * 60 * 1000 },
		{ userId: userAlpha._id, role: 'participant', availabilityStatus: 'available', customPaddingAfter: 15 * 60 * 1000 }
	],
	schedulingMethod: 'fixed',
	duration: 90 * 60 * 1000,
	status: 'confirmed',
	scheduledTime: now + 6 * day + 15 * hour,
	visibility: 'private'
})

await EventModel.create({
	name: 'Long Duration Event',
	description: 'Multi-day event for testing long durations',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available' }
	],
	schedulingMethod: 'flexible',
	duration: 8 * hour,
	timeWindow: { start: now + 10 * day, end: now + 45 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [{ start: now + 20 * day, end: now + 20 * day + 6 * hour }],
	preferredTimes: [{ start: now + 15 * day + 9 * hour, end: now + 15 * day + 17 * hour }],
	dailyStartConstraints: [{ start: 9 * 60 * 60 * 1000, end: 17 * 60 * 60 * 1000 }]
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
		ipAddress: '127.0.0.1',
		loginTime: new Date(),
		lastActivity: new Date(),
		userAgent: userAgents[0]
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
		passport: { user: userAlpha.id },
		ipAddress: '192.168.0.10',
		loginTime: new Date(Date.now() - 2 * hour),
		lastActivity: new Date(Date.now() - 30 * 60 * 1000),
		userAgent: userAgents[1]
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
		passport: { user: userBeta.id },
		ipAddress: '10.0.0.5',
		loginTime: new Date(Date.now() - 4 * hour),
		lastActivity: new Date(Date.now() - 1 * hour),
		userAgent: userAgents[2]
	}),
	expires: new Date(Date.now() + 3600000)
})

logger.info('Database seeded with essential event states')
