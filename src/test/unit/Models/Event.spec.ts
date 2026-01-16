/* eslint-disable @typescript-eslint/no-unused-expressions */
// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { expect } from 'chai'
import { describe, it } from 'mocha'

import EventModel, { type IMember } from '../../../app/models/Event.js'
import UserModel, { IUser } from '../../../app/models/User.js'

import '../../testSetup.js'

describe('Event Model', function () {
	let testUser: IUser
	let fixedEventFields: {
		name: string
		description: string
		members: IMember[]
		duration: number
		timeWindow: { start: number; end: number }
		visibility: 'draft' | 'public' | 'private'
		scheduledTime: number
	}

	beforeEach(async function () {
		testUser = await UserModel.create({
			username: 'testUser',
			email: 'test@example.com',
			password: 'testPassword123'
		})

		const futureStart = Date.now() + 86400000
		const futureEnd = futureStart + 604800000

		fixedEventFields = {
			name: 'Test Event',
			description: 'A test event description',
			members: [{
				userId: testUser._id,
				role: 'creator',
				availabilityStatus: 'available'
			}],
			duration: 3600000,
			timeWindow: { start: futureStart, end: futureEnd },
			visibility: 'draft',
			scheduledTime: futureStart + 1800000
		}
	})

	describe('Fixed scheduling', function () {
		it('should create a valid fixed event and strip constraints', async function () {
			const event = await EventModel.create(fixedEventFields)
			expect(event).to.exist
			expect(event.name).to.equal(fixedEventFields.name)
			expect(event.description).to.equal(fixedEventFields.description)
			expect(event.members).to.have.lengthOf(1)
			expect(event.members[0].userId.toString()).to.equal(testUser._id.toString())
			expect(event.members[0].role).to.equal('creator')
			expect(event.duration).to.equal(fixedEventFields.duration)
			expect(event.status).to.equal('confirmed')
			expect(event.visibility).to.equal('draft')
			expect(event.timeWindow).to.equal(undefined)
			expect(event.blackoutPeriods).to.equal(undefined)
			expect(event.preferredTimes).to.equal(undefined)
			expect(event.dailyStartConstraints).to.equal(undefined)
			expect(event.scheduledTime).to.equal(fixedEventFields.scheduledTime)
		})

		it('should trim event name', async function () {
			const event = await EventModel.create({
				...fixedEventFields,
				name: '  Trimmed Event  '
			})
			expect(event.name).to.equal('Trimmed Event')
		})

		it('should trim event description', async function () {
			const event = await EventModel.create({
				...fixedEventFields,
				description: '  Trimmed description  '
			})
			expect(event.description).to.equal('Trimmed description')
		})

		it('should default status to confirmed', async function () {
			const event = await EventModel.create(fixedEventFields)
			expect(event.status).to.equal('confirmed')
		})

		it('should default visibility to draft', async function () {
			const event = await EventModel.create({
				...fixedEventFields,
				visibility: undefined
			})
			expect(event.visibility).to.equal('draft')
		})

		it('should strip blackout and preferred times if provided', async function () {
			const event = await EventModel.create({
				...fixedEventFields,
				blackoutPeriods: [{ start: 100, end: 200 }],
				preferredTimes: [{ start: 300, end: 400 }],
				dailyStartConstraints: [{ start: 480 * 60 * 1000, end: 1020 * 60 * 1000 }]
			})
			expect(event.timeWindow).to.equal(undefined)
			expect(event.blackoutPeriods).to.equal(undefined)
			expect(event.preferredTimes).to.equal(undefined)
			expect(event.dailyStartConstraints).to.equal(undefined)
		})

		it('should require at least one member and a creator', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...fixedEventFields,
					members: []
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			errorOccurred = false
			try {
				await EventModel.create({
					...fixedEventFields,
					members: [{ userId: testUser._id, role: 'participant', availabilityStatus: 'available' }]
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true
		})

		it('should validate name/description/duration bounds', async function () {
			// name too short
			let errorOccurred = false
			try { await EventModel.create({ ...fixedEventFields, name: '' }) } catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			// name too long
			errorOccurred = false
			try { await EventModel.create({ ...fixedEventFields, name: 'a'.repeat(101) }) } catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			// description too long
			errorOccurred = false
			try { await EventModel.create({ ...fixedEventFields, description: 'a'.repeat(1001) }) } catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			// duration too short
			errorOccurred = false
			try { await EventModel.create({ ...fixedEventFields, duration: 59999 }) } catch { errorOccurred = true }
			expect(errorOccurred).to.be.true
		})

		it('should reject invalid role/status/availability/custom padding', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...fixedEventFields,
					status: 'invalid'
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			errorOccurred = false
			try {
				await EventModel.create({
					...fixedEventFields,
					members: [{ userId: testUser._id, role: 'invalid', availabilityStatus: 'available' }]
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			errorOccurred = false
			try {
				await EventModel.create({
					...fixedEventFields,
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'invalid' }]
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			errorOccurred = false
			try {
				await EventModel.create({
					...fixedEventFields,
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available', customPaddingAfter: -1 }]
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true
		})

		it('should handle multiple members and defaults', async function () {
			const secondUser = await UserModel.create({ username: 'secondUser', email: 'second@example.com', password: 'password123' })
			const event = await EventModel.create({
				...fixedEventFields,
				members: [
					{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' },
					{ userId: secondUser._id, availabilityStatus: 'available' }
				]
			})
			expect(event.members).to.have.lengthOf(2)
			const participant = event.members.find(m => m.userId.toString() === secondUser._id.toString())
			expect(participant!.role).to.equal('participant')
			expect(event.members[0].availabilityStatus).to.be.oneOf(['available', 'invited'])
		})
	})

	describe('Flexible scheduling', function () {
		it('should create a flexible event with constraints', async function () {
			const futureStart = Date.now() + 86400000
			const futureEnd = futureStart + 604800000
			const event = await EventModel.create({
				name: 'Flex',
				members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' }],
				schedulingMethod: 'flexible',
				duration: 3600000,
				timeWindow: { start: futureStart, end: futureEnd },
				blackoutPeriods: [{ start: 100, end: 200 }],
				preferredTimes: [{ start: 300, end: 400 }],
				dailyStartConstraints: [{ start: 480 * 60 * 1000, end: 1020 * 60 * 1000 }]
			})
			expect(event.schedulingMethod).to.equal('flexible')
			expect(event.scheduledTime).to.equal(undefined)
			expect(event.timeWindow).to.exist
			expect(event.blackoutPeriods).to.have.lengthOf(1)
			expect(event.preferredTimes).to.have.lengthOf(1)
			expect(event.dailyStartConstraints).to.have.lengthOf(1)
		})

		it('should not create flexible event with timeWindow start in the past', async function () {
			let errorOccurred = false
			try {
				const futureEnd = Date.now() + 86400000
				await EventModel.create({
					name: 'Flex Past',
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' }],
					schedulingMethod: 'flexible',
					duration: 3600000,
					timeWindow: { start: Date.now() - 86400000, end: futureEnd }
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true
		})

		it('should enforce scheduledTime within timeWindow (before start)', async function () {
			let errorOccurred = false
			const futureStart = Date.now() + 86400000
			const futureEnd = futureStart + 604800000
			try {
				await EventModel.create({
					name: 'Flex Scheduled',
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' }],
					schedulingMethod: 'flexible',
					duration: 3600000,
					timeWindow: { start: futureStart, end: futureEnd },
					scheduledTime: futureStart - 3600000
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true
		})

		it('should enforce scheduledTime within timeWindow (ends after end)', async function () {
			let errorOccurred = false
			const futureStart = Date.now() + 86400000
			const futureEnd = futureStart + 604800000
			try {
				await EventModel.create({
					name: 'Flex Scheduled 2',
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' }],
					schedulingMethod: 'flexible',
					duration: 3600000,
					timeWindow: { start: futureStart, end: futureEnd },
					scheduledTime: futureEnd - 1800000
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true
		})

		it('should validate blackout and preferred time ranges', async function () {
			// start >= end
			let errorOccurred = false
			const futureStart = Date.now() + 86400000
			const futureEnd = futureStart + 604800000
			try {
				await EventModel.create({
					name: 'Flex Bad Blackout',
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' }],
					schedulingMethod: 'flexible',
					duration: 3600000,
					timeWindow: { start: futureStart, end: futureEnd },
					blackoutPeriods: [{ start: 200, end: 100 }]
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			// preferred start >= end
			errorOccurred = false
			try {
				await EventModel.create({
					name: 'Flex Bad Preferred',
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' }],
					schedulingMethod: 'flexible',
					duration: 3600000,
					timeWindow: { start: futureStart, end: futureEnd },
					preferredTimes: [{ start: 200, end: 100 }]
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			// negative start
			errorOccurred = false
			try {
				await EventModel.create({
					name: 'Flex Negative Start',
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' }],
					schedulingMethod: 'flexible',
					duration: 3600000,
					timeWindow: { start: futureStart, end: futureEnd },
					blackoutPeriods: [{ start: -100, end: 100 }]
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true

			// zero start
			errorOccurred = false
			try {
				await EventModel.create({
					name: 'Flex Zero Start',
					members: [{ userId: testUser._id, role: 'creator', availabilityStatus: 'available' }],
					schedulingMethod: 'flexible',
					duration: 3600000,
					timeWindow: { start: futureStart, end: futureEnd },
					blackoutPeriods: [{ start: 0, end: 100 }]
				})
			} catch { errorOccurred = true }
			expect(errorOccurred).to.be.true
		})
	})
})
