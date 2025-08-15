// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { randomUUID } from 'crypto'

import EventModel from '../app/models/Event.js'
import SessionModel from '../app/models/Session.js'
import UserModel from '../app/models/User.js'
import logger from '../app/utils/logger.js'

logger.info('Seeding database with extensive combination coverage')

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

// Core test users (confirmed)
const userTest = await UserModel.create({ username: 'TestUser', email: 'test@test.com', password: 'password' }); userTest.confirmUser(); await userTest.save()
const userAlpha = await UserModel.create({ username: 'AlphaUser', email: 'alpha@test.com', password: 'password' }); userAlpha.confirmUser(); await userAlpha.save()
const userBeta = await UserModel.create({ username: 'BetaUser', email: 'beta@test.com', password: 'password' }); userBeta.confirmUser(); await userBeta.save()
const userGamma = await UserModel.create({ username: 'GammaUser', email: 'gamma@test.com', password: 'password' }); userGamma.confirmUser(); await userGamma.save()
const userDelta = await UserModel.create({ username: 'DeltaUser', email: 'delta@test.com', password: 'password' }); userDelta.confirmUser(); await userDelta.save()
const userEpsilon = await UserModel.create({ username: 'EpsilonUser', email: 'epsilon@test.com', password: 'password' }); userEpsilon.confirmUser(); await userEpsilon.save()
const userZeta = await UserModel.create({ username: 'ZetaUser', email: 'zeta@test.com', password: 'password' }); userZeta.confirmUser(); await userZeta.save()
const userEta = await UserModel.create({ username: 'EtaUser', email: 'eta@test.com', password: 'password' }); userEta.confirmUser(); await userEta.save()
const userTheta = await UserModel.create({ username: 'ThetaUser', email: 'theta@test.com', password: 'password' }); userTheta.confirmUser(); await userTheta.save()
const userIota = await UserModel.create({ username: 'IotaUser', email: 'iota@test.com', password: 'password' }); userIota.confirmUser(); await userIota.save()
const userKappa = await UserModel.create({ username: 'KappaUser', email: 'kappa@test.com', password: 'password' }); userKappa.confirmUser(); await userKappa.save()
const userLambda = await UserModel.create({ username: 'LambdaUser', email: 'lambda@test.com', password: 'password' }); userLambda.confirmUser(); await userLambda.save()
const userMu = await UserModel.create({ username: 'MuUser', email: 'mu@test.com', password: 'password' }); userMu.confirmUser(); await userMu.save()
const userNu = await UserModel.create({ username: 'NuUser', email: 'nu@test.com', password: 'password' }); userNu.confirmUser(); await userNu.save()
const userXi = await UserModel.create({ username: 'XiUser', email: 'xi@test.com', password: 'password' }); userXi.confirmUser(); await userXi.save()
const userOmicron = await UserModel.create({ username: 'OmicronUser', email: 'omicron@test.com', password: 'password' }); userOmicron.confirmUser(); await userOmicron.save()
const userPi = await UserModel.create({ username: 'PiUser', email: 'pi@test.com', password: 'password' }); userPi.confirmUser(); await userPi.save()
const userRho = await UserModel.create({ username: 'RhoUser', email: 'rho@test.com', password: 'password' }); userRho.confirmUser(); await userRho.save()
const userSigma = await UserModel.create({ username: 'SigmaUser', email: 'sigma@test.com', password: 'password' }); userSigma.confirmUser(); await userSigma.save()
const userTau = await UserModel.create({ username: 'TauUser', email: 'tau@test.com', password: 'password' }); userTau.confirmUser(); await userTau.save()
const userUpsilon = await UserModel.create({ username: 'UpsilonUser', email: 'upsilon@test.com', password: 'password' }); userUpsilon.confirmUser(); await userUpsilon.save()
const userPhi = await UserModel.create({ username: 'PhiUser', email: 'phi@test.com', password: 'password' }); userPhi.confirmUser(); await userPhi.save()
const userChi = await UserModel.create({ username: 'ChiUser', email: 'chi@test.com', password: 'password' }); userChi.confirmUser(); await userChi.save()
const userPsi = await UserModel.create({ username: 'PsiUser', email: 'psi@test.com', password: 'password' }); userPsi.confirmUser(); await userPsi.save()
const userOmega = await UserModel.create({ username: 'OmegaUser', email: 'omega@test.com', password: 'password' }); userOmega.confirmUser(); await userOmega.save()

// Unconfirmed + partially configured users
const userUnconfirmed = await UserModel.create({ username: 'UnconfirmedUser', email: 'unconfirmed@test.com', password: 'password' })
userUnconfirmed.confirmationCode = 'unconfirmed123'; await userUnconfirmed.save()
const userPending = await UserModel.create({ username: 'PendingUser', email: 'pending@test.com', password: 'password' })
userPending.confirmationCode = 'pending456'; await userPending.save()

// User with no events to test empty state handling
await UserModel.create({ username: 'NoEventsUser', email: 'noevents@test.com', password: 'password' })

// Additional diverse username users
const userShort = await UserModel.create({ username: 'A', email: 'short-a@test.com', password: 'password' }); userShort.confirmUser(); await userShort.save()
const userTwoChar = await UserModel.create({ username: 'ZX', email: 'zx@test.com', password: 'password' }); userTwoChar.confirmUser(); await userTwoChar.save()
const userWithSpaces = await UserModel.create({ username: 'User With Spaces', email: 'user.spaces@test.com', password: 'password' }); userWithSpaces.confirmUser(); await userWithSpaces.save()
const userLeadingSpace = await UserModel.create({ username: ' LeadingSpace', email: 'leading.space@test.com', password: 'password' }); userLeadingSpace.confirmUser(); await userLeadingSpace.save()
const userTrailingSpace = await UserModel.create({ username: 'TrailingSpace ', email: 'trailing.space@test.com', password: 'password' }); userTrailingSpace.confirmUser(); await userTrailingSpace.save()
const userMultiSpaces = await UserModel.create({ username: 'Multiple   Spaces   In   Name', email: 'multi.spaces@test.com', password: 'password' }); userMultiSpaces.confirmUser(); await userMultiSpaces.save()
const userLong = await UserModel.create({ username: 'ThisIsAnExceptionallyLongUserName', email: 'longname1@test.com', password: 'password' }); userLong.confirmUser(); await userLong.save()
const userMax50 = await UserModel.create({ username: 'FiftyCharUserName_123456789012345678901234', email: 'fiftychar@test.com', password: 'password' }); userMax50.confirmUser(); await userMax50.save()
const userMixedCase = await UserModel.create({ username: 'mIxEdCaSeUser', email: 'mixedcase@test.com', password: 'password' }); userMixedCase.confirmUser(); await userMixedCase.save()
const userNumeric = await UserModel.create({ username: '123456', email: 'numeric@test.com', password: 'password' }); userNumeric.confirmUser(); await userNumeric.save()
const userAlnum = await UserModel.create({ username: 'User123Name', email: 'user123name@test.com', password: 'password' }); userAlnum.confirmUser(); await userAlnum.save()
const userDash = await UserModel.create({ username: 'User-Name-With-Dashes', email: 'userdash@test.com', password: 'password' }); userDash.confirmUser(); await userDash.save()
const userUnderscore = await UserModel.create({ username: 'User_Name_With_Underscores', email: 'userunderscore@test.com', password: 'password' }); userUnderscore.confirmUser(); await userUnderscore.save()
const userPeriods = await UserModel.create({ username: 'User.Name.With.Periods', email: 'userperiods@test.com', password: 'password' }); userPeriods.confirmUser(); await userPeriods.save()
const userApostrophe = await UserModel.create({ username: 'O\'Brien Test', email: 'obrien@test.com', password: 'password' }); userApostrophe.confirmUser(); await userApostrophe.save()
const userUnicode = await UserModel.create({ username: 'Ångström Δelta', email: 'unicode1@test.com', password: 'password' }); userUnicode.confirmUser(); await userUnicode.save()
const userEmoji = await UserModel.create({ username: 'Event 🚀 User', email: 'emojiuser@test.com', password: 'password' }); userEmoji.confirmUser(); await userEmoji.save()
const userEdgeTrim = await UserModel.create({ username: '  Surrounded By Spaces  ', email: 'surrounded.spaces@test.com', password: 'password' }); userEdgeTrim.confirmUser(); await userEdgeTrim.save()
const userDuplicatePattern1 = await UserModel.create({ username: 'PatternTester1', email: 'pattern1@test.com', password: 'password' }); userDuplicatePattern1.confirmUser(); await userDuplicatePattern1.save()
const userDuplicatePattern2 = await UserModel.create({ username: 'PatternTester2', email: 'pattern2@test.com', password: 'password' }); userDuplicatePattern2.confirmUser(); await userDuplicatePattern2.save()
const userEmailLike = await UserModel.create({ username: 'looks.like.email@not', email: 'looks.like.email.user@test.com', password: 'password' }); userEmailLike.confirmUser(); await userEmailLike.save()
const userSpecialMix = await UserModel.create({ username: 'Mix_Of-Different Parts 123', email: 'mix.parts@test.com', password: 'password' }); userSpecialMix.confirmUser(); await userSpecialMix.save()
// Unconfirmed variants
const userUnconfirmedSpaces = await UserModel.create({ username: 'Unconfirmed Spaces User', email: 'unconfirmed.spaces@test.com', password: 'password' })
userUnconfirmedSpaces.confirmationCode = 'unconfirmedSpaces789'; await userUnconfirmedSpaces.save()

// Events with descriptive names capturing edge/combinational scenarios
await EventModel.create({
	name: 'Single Member Draft Event',
	description: 'Only one creator member present (minimum viable event)',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }],
	duration: 2 * hour,
	timeWindow: { start: now + 1 * day, end: now + 2 * day },
	status: 'scheduling',
	visibility: 'draft',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 8 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Two Creators Event',
	description: 'Exactly two creators to test multi-creator logic',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 90 * 60 * 1000,
	timeWindow: { start: now + 2 * day, end: now + 5 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [{ start: now + 3 * day + 3 * hour, end: now + 3 * day + 5 * hour }],
	preferredTimes: [{ start: now + 2 * day + 6 * hour, end: now + 2 * day + 9 * hour }],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'All Creators Event',
	description: 'Every member is a creator (extreme permissions case)',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'creator', availabilityStatus: 'available' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 1 * day, end: now + 6 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Creator With All Admins Event',
	description: 'One creator and rest admins',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userEpsilon._id, role: 'admin', availabilityStatus: 'unavailable' },
		{ userId: userZeta._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userEta._id, role: 'admin', availabilityStatus: 'unavailable' }
	],
	duration: 4 * hour,
	timeWindow: { start: now + 2 * day, end: now + 9 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 3 * day + 2 * hour, end: now + 3 * day + 6 * hour }],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'Scheduled Event With ScheduledTime Inside Window',
	description: 'Event that is already scheduled inside time window',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTheta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userIota._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 2 * day, end: now + 12 * day },
	status: 'scheduled',
	scheduledTime: now + 3 * day + 5 * hour,
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'Cancelled Event Basic',
	description: 'Cancelled state event to test filtering',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'unavailable' },
		{ userId: userKappa._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 60 * 60 * 1000,
	timeWindow: { start: now + 1 * day, end: now + 4 * day },
	status: 'cancelled',
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'Confirmed Event Example',
	description: 'Confirmed event with preferred times originally specified',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userLambda._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userMu._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 2 * day, end: now + 20 * day },
	status: 'confirmed',
	scheduledTime: now + 5 * day + 4 * hour,
	visibility: 'public',
	blackoutPeriods: [{ start: now + 6 * day, end: now + 6 * day + 2 * hour }],
	preferredTimes: [{ start: now + 5 * day + 3 * hour, end: now + 5 * day + 7 * hour }],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'Event With Overlapping Preferred And Blackout',
	description: 'Preferred slot overlaps blackout for edge logic',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userNu._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userXi._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 3 * day, end: now + 10 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [{ start: now + 5 * day + 1 * hour, end: now + 5 * day + 5 * hour }],
	preferredTimes: [{ start: now + 5 * day, end: now + 5 * day + 4 * hour }],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'Event Without Test User Public',
	description: 'Public event intentionally excluding test user',
	members: [
		{ userId: userOmicron._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userPi._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 1 * day, end: now + 7 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'Event Without Test User Private',
	description: 'Private event excluding test user',
	members: [
		{ userId: userRho._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userSigma._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 90 * 60 * 1000,
	timeWindow: { start: now + 2 * day, end: now + 9 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'Many Members Mixed Roles Event',
	description: 'Stress test with many members and mixed roles',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTau._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userUpsilon._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userPhi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userChi._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userPsi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userOmega._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 5 * hour,
	timeWindow: { start: now + 4 * day, end: now + 30 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 10 * day, end: now + 10 * day + 3 * hour }],
	preferredTimes: [
		{ start: now + 6 * day + 2 * hour, end: now + 6 * day + 7 * hour },
		{ start: now + 8 * day + 1 * hour, end: now + 8 * day + 4 * hour }
	],
	dailyStartConstraints: []
})

await EventModel.create({
	name: 'Event With Custom Padding After Members',
	description: 'Members include customPaddingAfter for post-event buffer logic',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available', customPaddingAfter: 30 * 60 * 1000 },
		{ userId: userAlpha._id, role: 'participant', availabilityStatus: 'available', customPaddingAfter: 15 * 60 * 1000 },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available', customPaddingAfter: 45 * 60 * 1000 }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 3 * day, end: now + 15 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Long Duration Event Spanning Large Window',
	description: 'Large window and long duration scheduling challenge',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 12 * hour,
	timeWindow: { start: now + 5 * day, end: now + 60 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 20 * day, end: now + 20 * day + 6 * hour }],
	preferredTimes: [{ start: now + 25 * day, end: now + 25 * day + 14 * hour }],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Short Duration Narrow Window Event',
	description: 'Very short duration with tight window',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userEta._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 60 * 60 * 1000,
	timeWindow: { start: now + 1 * day + 2 * hour, end: now + 1 * day + 8 * hour },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [{ start: now + 1 * day + 5 * hour, end: now + 1 * day + 6 * hour }],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 14 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Unavailable Heavy Event',
	description: 'Most members unavailable to test conflict logic',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'unavailable' },
		{ userId: userMu._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userNu._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userXi._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 3 * day, end: now + 11 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Public Massive Preferred Times Event',
	description: 'Many preferred times for recommendation logic coverage',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userOmicron._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userPi._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 2 * day, end: now + 25 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [
		{ start: now + 3 * day, end: now + 3 * day + 4 * hour },
		{ start: now + 4 * day + 5 * hour, end: now + 4 * day + 9 * hour },
		{ start: now + 7 * day + 2 * hour, end: now + 7 * day + 6 * hour },
		{ start: now + 10 * day + 1 * hour, end: now + 10 * day + 5 * hour }
	],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Edge Case Minimum Duration Event',
	description: 'Duration equal to minimum allowed (60,000 ms)',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }],
	duration: 60000,
	timeWindow: { start: now + 1 * day, end: now + 1 * day + 3 * hour },
	status: 'scheduling',
	visibility: 'draft',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 8 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Edge Case Scheduled Near Window End',
	description: 'Scheduled so it ends exactly at window end',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userRho._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 5 * day, end: now + 5 * day + 10 * hour },
	status: 'scheduled',
	scheduledTime: (now + 5 * day + 10 * hour) - 2 * hour,
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 15 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Cancelled With ScheduledTime Event',
	description: 'Cancelled after being scheduled',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'unavailable' },
		{ userId: userSigma._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 2 * day, end: now + 15 * day },
	status: 'cancelled',
	scheduledTime: now + 4 * day + 3 * hour,
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed With No ScheduledTime Event',
	description: 'Edge: confirmed but no scheduledTime purposely (data anomaly)',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }],
	duration: 2 * hour,
	timeWindow: { start: now + 3 * day, end: now + 9 * day },
	status: 'confirmed',
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Public Event Excluding Test With Many Preferences',
	description: 'Multiple prefs and no test user for search exposure testing',
	members: [
		{ userId: userTau._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userPhi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userChi._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 1 * day, end: now + 18 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [{ start: now + 8 * day, end: now + 8 * day + 5 * hour }],
	preferredTimes: [{ start: now + 4 * day, end: now + 4 * day + 3 * hour }],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduling Event With Dense Blackouts',
	description: 'Multiple blackout periods fragmenting window',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }, { userId: userPsi._id, role: 'participant', availabilityStatus: 'available' }],
	duration: 2 * hour,
	timeWindow: { start: now + 2 * day, end: now + 12 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [
		{ start: now + 3 * day, end: now + 3 * day + 6 * hour },
		{ start: now + 4 * day + 10 * hour, end: now + 4 * day + 14 * hour },
		{ start: now + 7 * day, end: now + 7 * day + 12 * hour }
	],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Large Membership All Participants',
	description: 'Many participants no admins (only one creator)',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userEpsilon._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userZeta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userEta._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 4 * hour,
	timeWindow: { start: now + 6 * day, end: now + 20 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 8 * day + 1 * hour, end: now + 8 * day + 5 * hour }],
	dailyStartConstraints: [{ start: 8 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Draft Event With Preferences Only',
	description: 'Draft state with only preferred times and no blackouts',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }, { userId: userOmega._id, role: 'participant', availabilityStatus: 'available' }],
	duration: 2 * hour,
	timeWindow: { start: now + 2 * day, end: now + 9 * day },
	status: 'scheduling',
	visibility: 'draft',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 3 * day, end: now + 3 * day + 3 * hour }],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduling Event Empty Preferences',
	description: 'Scheduling state but no preferences or blackouts',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }, { userId: userPhi._id, role: 'participant', availabilityStatus: 'available' }],
	duration: 2 * hour,
	timeWindow: { start: now + 1 * day, end: now + 6 * day },
	status: 'scheduling',
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed Event Multiple Members',
	description: 'Confirmed with multiple participants and scheduled time',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userChi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userPsi._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 5 * day, end: now + 15 * day },
	status: 'confirmed',
	scheduledTime: now + 7 * day + 3 * hour,
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 13 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Cancelled Event Many Members',
	description: 'Cancelled with many participants to test cascade behavior',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'unavailable' },
		{ userId: userAlpha._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 3 * day, end: now + 18 * day },
	status: 'cancelled',
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 14 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduling Event Blackout Covering Window',
	description: 'Blackout covers entire window except maybe scheduling edge',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }, { userId: userLambda._id, role: 'participant', availabilityStatus: 'available' }],
	duration: 2 * hour,
	timeWindow: { start: now + 9 * day, end: now + 10 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 9 * day, end: now + 10 * day }],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduled Event With Padding Members',
	description: 'Scheduled event to test padding plus scheduledTime',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available', customPaddingAfter: 20 * 60 * 1000 },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available', customPaddingAfter: 10 * 60 * 1000 }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 4 * day, end: now + 14 * day },
	status: 'scheduled',
	scheduledTime: now + 6 * day + 2 * hour,
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 11 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Draft Event No Test User',
	description: 'Draft event purposely excluding test user',
	members: [{ userId: userXi._id, role: 'creator', availabilityStatus: 'available' }],
	duration: 2 * hour,
	timeWindow: { start: now + 2 * day, end: now + 4 * day },
	status: 'scheduling',
	visibility: 'draft',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

// Additional realistic scenario events focusing on status transitions and confirmations
await EventModel.create({
	name: 'Confirmed Weekly Standup',
	description: 'Recurring style standup meeting (simulated single occurrence)',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 30 * 60 * 1000,
	timeWindow: { start: now + 1 * day, end: now + 15 * day },
	status: 'confirmed',
	scheduledTime: now + 2 * day + 9 * hour,
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 2 * day + 8 * hour, end: now + 2 * day + 11 * hour }],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed Product Launch Planning',
	description: 'Cross-team planning session locked in',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userEpsilon._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 3 * day, end: now + 25 * day },
	status: 'confirmed',
	scheduledTime: now + 6 * day + 14 * hour,
	visibility: 'public',
	blackoutPeriods: [{ start: now + 10 * day + 9 * hour, end: now + 10 * day + 12 * hour }],
	preferredTimes: [
		{ start: now + 6 * day + 13 * hour, end: now + 6 * day + 16 * hour },
		{ start: now + 7 * day + 14 * hour, end: now + 7 * day + 17 * hour }
	],
	dailyStartConstraints: [{ start: 14 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed Hackathon Kickoff',
	description: 'Kickoff meeting for upcoming internal hackathon',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTheta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userIota._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userKappa._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 90 * 60 * 1000,
	timeWindow: { start: now + 2 * day, end: now + 18 * day },
	status: 'confirmed',
	scheduledTime: now + 4 * day + 11 * hour,
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 11 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed Design Review Session',
	description: 'Design review locked after scheduling negotiation',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userLambda._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userMu._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 5 * day, end: now + 21 * day },
	status: 'confirmed',
	scheduledTime: now + 8 * day + 15 * hour,
	visibility: 'private',
	blackoutPeriods: [{ start: now + 9 * day + 10 * hour, end: now + 9 * day + 13 * hour }],
	preferredTimes: [{ start: now + 8 * day + 14 * hour, end: now + 8 * day + 18 * hour }],
	dailyStartConstraints: [{ start: 15 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduled Quarterly Business Review',
	description: 'Scheduled but awaiting confirmation by leadership',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userOmega._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userPhi._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 10 * day, end: now + 40 * day },
	status: 'scheduled',
	scheduledTime: now + 15 * day + 9 * hour,
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [
		{ start: now + 15 * day + 8 * hour, end: now + 15 * day + 12 * hour },
		{ start: now + 16 * day + 9 * hour, end: now + 16 * day + 12 * hour }
	],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduled Community AMA',
	description: 'Public AMA awaiting final confirmation',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userUpsilon._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userChi._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 60 * 60 * 1000,
	timeWindow: { start: now + 7 * day, end: now + 28 * day },
	status: 'scheduled',
	scheduledTime: now + 9 * day + 17 * hour,
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 9 * day + 16 * hour, end: now + 9 * day + 19 * hour }],
	dailyStartConstraints: [{ start: 17 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduling User Research Interviews',
	description: 'Still gathering participant availability',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userSigma._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userRho._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 4 * hour,
	timeWindow: { start: now + 6 * day, end: now + 22 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 12 * day, end: now + 12 * day + 6 * hour }],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Draft Internal Training Session',
	description: 'Not yet published; still drafting scope',
	members: [{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' }],
	duration: 2 * hour,
	timeWindow: { start: now + 8 * day, end: now + 14 * day },
	status: 'scheduling',
	visibility: 'draft',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 13 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Cancelled Customer Onboarding Webinar',
	description: 'Cancelled before confirmation due to low registrations',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'unavailable' },
		{ userId: userAlpha._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 90 * 60 * 1000,
	timeWindow: { start: now + 3 * day, end: now + 16 * day },
	status: 'cancelled',
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 16 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed Engineering All Hands',
	description: 'Large confirmed internal gathering',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userEpsilon._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 9 * day, end: now + 35 * day },
	status: 'confirmed',
	scheduledTime: now + 12 * day + 16 * hour,
	visibility: 'private',
	blackoutPeriods: [{ start: now + 20 * day + 8 * hour, end: now + 20 * day + 11 * hour }],
	preferredTimes: [
		{ start: now + 12 * day + 15 * hour, end: now + 12 * day + 18 * hour },
		{ start: now + 13 * day + 16 * hour, end: now + 13 * day + 19 * hour }
	],
	dailyStartConstraints: [{ start: 16 * 60, end: 24 * 60 }]
})

// Events where TestUser participates but is not the creator
await EventModel.create({
	name: 'Scheduled Private Meeting (TestUser participant)',
	description: 'Covers case where TestUser is a regular participant in a scheduled private meeting they did not create.',
	members: [
		{ userId: userAlpha._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 60 * 60 * 1000,
	timeWindow: { start: now + 2 * day, end: now + 14 * day },
	status: 'scheduled',
	scheduledTime: now + 4 * day + 10 * hour,
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduling Private Meeting',
	description: 'Covers scheduling phase where TestUser is participant; creator and admin are other users.',
	members: [
		{ userId: userGamma._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'admin', availabilityStatus: 'unavailable' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userEpsilon._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 5 * day, end: now + 25 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 12 * day + 13 * hour, end: now + 12 * day + 16 * hour }],
	preferredTimes: [{ start: now + 7 * day + 14 * hour, end: now + 7 * day + 17 * hour }],
	dailyStartConstraints: [{ start: 11 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed Public Event (TestUser participant)',
	description: 'Covers confirmed public event where TestUser is a non-creator attendee; includes preferred window alignment.',
	members: [
		{ userId: userOmega._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userPhi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 3 * day, end: now + 18 * day },
	status: 'confirmed',
	scheduledTime: now + 6 * day + 13 * hour,
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 6 * day + 12 * hour, end: now + 6 * day + 15 * hour }],
	dailyStartConstraints: [{ start: 13 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Cancelled Private Event (TestUser participant)',
	description: 'Covers cancelled event scenario after scheduling where TestUser was only a participant.',
	members: [
		{ userId: userLambda._id, role: 'creator', availabilityStatus: 'unavailable' },
		{ userId: userMu._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 90 * 60 * 1000,
	timeWindow: { start: now + 4 * day, end: now + 16 * day },
	status: 'cancelled',
	scheduledTime: now + 5 * day + 15 * hour,
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 14 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Draft Event (TestUser invited, not creator)',
	description: 'Covers draft event where TestUser is not the creator.',
	members: [
		{ userId: userNu._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userXi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 6 * day, end: now + 13 * day },
	status: 'scheduling',
	visibility: 'draft',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 15 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduling Public Event (TestUser participant)',
	description: 'Covers public event in scheduling state where TestUser and others propose times; not a creator.',
	members: [
		{ userId: userOmicron._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userPi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userRho._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 4 * hour,
	timeWindow: { start: now + 8 * day, end: now + 26 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 14 * day, end: now + 14 * day + 5 * hour }],
	preferredTimes: [
		{ start: now + 9 * day + 9 * hour, end: now + 9 * day + 13 * hour },
		{ start: now + 10 * day + 11 * hour, end: now + 10 * day + 15 * hour }
	],
	dailyStartConstraints: [{ start: 12 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed Private Event (TestUser participant)',
	description: 'Covers confirmed private event where TestUser participates but another user owns it.',
	members: [
		{ userId: userTau._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userChi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userPsi._id, role: 'participant', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 7 * day, end: now + 24 * day },
	status: 'confirmed',
	scheduledTime: now + 11 * day + 10 * hour,
	visibility: 'private',
	blackoutPeriods: [],
	preferredTimes: [],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

// Multi-creator scenarios
await EventModel.create({
	name: 'Scheduling Event With TestUser co-creator',
	description: 'Covers scheduling state where TestUser and another user are both creators; tests authorization logic for multiple creators.',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'admin', availabilityStatus: 'unavailable' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 5 * day, end: now + 20 * day },
	status: 'scheduling',
	visibility: 'private',
	blackoutPeriods: [{ start: now + 9 * day + 12 * hour, end: now + 9 * day + 15 * hour }],
	preferredTimes: [
		{ start: now + 6 * day + 14 * hour, end: now + 6 * day + 16 * hour },
		{ start: now + 7 * day + 10 * hour, end: now + 7 * day + 12 * hour }
	],
	dailyStartConstraints: [{ start: 10 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Confirmed Event With Creators (TestUser admin)',
	description: 'Covers confirmed event with multiple creators (excluding TestUser) where TestUser is an admin with elevated privileges but not creator.',
	members: [
		{ userId: userDelta._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userEpsilon._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userZeta._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 90 * 60 * 1000,
	timeWindow: { start: now + 10 * day, end: now + 28 * day },
	status: 'confirmed',
	scheduledTime: now + 14 * day + 11 * hour,
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 14 * day + 10 * hour, end: now + 14 * day + 13 * hour }],
	dailyStartConstraints: [{ start: 11 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduled Event With Creators TestUser participant',
	description: 'Covers scheduled (not yet confirmed) event with multiple creators; TestUser is a simple participant.',
	members: [
		{ userId: userEta._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTheta._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userIota._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 9 * day, end: now + 30 * day },
	status: 'scheduled',
	scheduledTime: now + 13 * day + 9 * hour,
	visibility: 'private',
	blackoutPeriods: [{ start: now + 15 * day + 13 * hour, end: now + 15 * day + 17 * hour }],
	preferredTimes: [
		{ start: now + 12 * day + 8 * hour, end: now + 12 * day + 12 * hour },
		{ start: now + 13 * day + 8 * hour, end: now + 13 * day + 11 * hour }
	],
	dailyStartConstraints: [{ start: 13 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Second Creator Has Long Username',
	description: 'Covers UI/logic where the secondary creator possesses an exceptionally long username; tests truncation/role handling.',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userLong._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'admin', availabilityStatus: 'unavailable' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 6 * day, end: now + 22 * day },
	status: 'scheduled',
	scheduledTime: now + 10 * day + 15 * hour,
	visibility: 'public',
	blackoutPeriods: [],
	preferredTimes: [{ start: now + 10 * day + 14 * hour, end: now + 10 * day + 16 * hour }],
	dailyStartConstraints: [{ start: 14 * 60, end: 24 * 60 }]
})

// Additional realistic scheduled events with blackout periods, preferred times and multi-hour durations
await EventModel.create({
	name: 'Scheduled Data Lake Migration Planning',
	description: 'Scheduled multi-hour planning block with morning blackout due to maintenance; afternoon preferred slots.',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'participant', availabilityStatus: 'unavailable' },
		{ userId: userEpsilon._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 4 * hour,
	timeWindow: { start: now + 8 * day, end: now + 18 * day },
	status: 'scheduled',
	scheduledTime: now + 11 * day + 19 * hour,
	visibility: 'private',
	blackoutPeriods: [
		{ start: now + 11 * day + 6 * hour, end: now + 11 * day + 9 * hour }, // maintenance
		{ start: now + 12 * day + 13 * hour, end: now + 12 * day + 15 * hour } // leadership overlap
	],
	preferredTimes: [
		{ start: now + 11 * day + 18 * hour, end: now + 11 * day + 22 * hour },
		{ start: now + 12 * day + 16 * hour, end: now + 12 * day + 20 * hour }
	],
	dailyStartConstraints: [{ start: 18 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduled Regional Rollout Coordination',
	description: 'Scheduled coordination spanning multiple time zones; midday blackout, early/late preferred bands.',
	members: [
		{ userId: userAlpha._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userGamma._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 9 * day, end: now + 25 * day },
	status: 'scheduled',
	scheduledTime: now + 14 * day + 8 * hour,
	visibility: 'public',
	blackoutPeriods: [
		{ start: now + 14 * day + 11 * hour, end: now + 14 * day + 13 * hour } // lunch / system change freeze
	],
	preferredTimes: [
		{ start: now + 14 * day + 7 * hour, end: now + 14 * day + 11 * hour },
		{ start: now + 15 * day + 6 * hour, end: now + 15 * day + 10 * hour }
	],
	dailyStartConstraints: [{ start: 7 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduled Quarterly Cost Review',
	description: 'Scheduled finance review; blackout for audit sync; narrow preferred ranges evening hours.',
	members: [
		{ userId: userTheta._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userIota._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 2 * hour,
	timeWindow: { start: now + 7 * day, end: now + 20 * day },
	status: 'scheduled',
	scheduledTime: now + 9 * day + 21 * hour,
	visibility: 'private',
	blackoutPeriods: [
		{ start: now + 9 * day + 17 * hour, end: now + 9 * day + 19 * hour }
	],
	preferredTimes: [
		{ start: now + 9 * day + 20 * hour, end: now + 9 * day + 23 * hour },
		{ start: now + 10 * day + 19 * hour, end: now + 10 * day + 22 * hour }
	],
	dailyStartConstraints: [{ start: 20 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduled Event (Daily Window Constraint)',
	description: 'Scheduled creative workshop respecting a daily intra-day allowable window (09:00-17:30).',
	members: [
		{ userId: userNu._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userXi._id, role: 'admin', availabilityStatus: 'unavailable' },
		{ userId: userTest._id, role: 'participant', availabilityStatus: 'available' }
	],
	duration: 3 * hour,
	timeWindow: { start: now + 10 * day, end: now + 27 * day },
	status: 'scheduled',
	scheduledTime: now + 16 * day + 13 * hour, // 13:00 local within daily window
	visibility: 'public',
	blackoutPeriods: [
		{ start: now + 16 * day + 9 * hour, end: now + 16 * day + 11 * hour } // earlier conflicting session
	],
	preferredTimes: [
		{ start: now + 16 * day + 12 * hour, end: now + 16 * day + 15 * hour },
		{ start: now + 17 * day + 9 * hour, end: now + 17 * day + 12 * hour }
	],
	dailyStartConstraints: [{ start: 9 * 60, end: 24 * 60 }]
})

// Long duration events (slightly over a day and over a week)
await EventModel.create({
	name: 'Scheduled 26h Maintenance Window Event',
	description: 'Event spanning slightly more than one day (26h) to test multi-day handling with blackout inside window.',
	members: [
		{ userId: userTest._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userAlpha._id, role: 'admin', availabilityStatus: 'available' },
		{ userId: userBeta._id, role: 'participant', availabilityStatus: 'unavailable' }
	],
	duration: 26 * hour,
	timeWindow: { start: now + 5 * day, end: now + 9 * day },
	status: 'scheduled',
	scheduledTime: now + 6 * day + 3 * hour, // fits fully before end
	visibility: 'private',
	blackoutPeriods: [
		{ start: now + 6 * day + 12 * hour, end: now + 6 * day + 15 * hour } // midday outage inside span
	],
	preferredTimes: [
		{ start: now + 6 * day + 2 * hour, end: now + 6 * day + 5 * hour }
	],
	dailyStartConstraints: [{ start: 2 * 60, end: 24 * 60 }]
})

await EventModel.create({
	name: 'Scheduled 7.5 Day Program Increment Planning',
	description: 'Event slightly exceeding one week (~7.5 days) to test long durations near window boundary.',
	members: [
		{ userId: userGamma._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userDelta._id, role: 'creator', availabilityStatus: 'available' },
		{ userId: userTest._id, role: 'admin', availabilityStatus: 'available' }
	],
	duration: Math.round(7.5 * 24 * hour),
	timeWindow: { start: now + 15 * day, end: now + 30 * day },
	status: 'scheduled',
	scheduledTime: now + 16 * day, // ensure end at 16d + 7.5d < 30d
	visibility: 'public',
	blackoutPeriods: [
		{ start: now + 19 * day + 8 * hour, end: now + 19 * day + 12 * hour },
		{ start: now + 21 * day + 14 * hour, end: now + 21 * day + 18 * hour }
	],
	preferredTimes: [
		{ start: now + 16 * day + 2 * hour, end: now + 16 * day + 6 * hour },
		{ start: now + 17 * day + 9 * hour, end: now + 17 * day + 13 * hour }
	],
	dailyStartConstraints: [{ start: 8 * 60, end: 24 * 60 }]
})

// Sessions (retained original style & a few referencing new users)
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
		passport: { user: userAlpha.id },
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
		passport: { user: userBeta.id },
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
		passport: { user: userBeta.id },
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
logger.info('Database seeded')
