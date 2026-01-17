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
	let testEventFields: {
		name: string
		description: string
		members: IMember[]
		duration: number
		timeWindow: {
			start: number
			end: number
		}
		public: boolean
	}

	beforeEach(async function () {
		testUser = await UserModel.create({
			username: 'testUser',
			email: 'test@example.com',
			password: 'testPassword123'
		})

		const futureStart = Date.now() + 86400000 // 1 day from now
		const futureEnd = futureStart + 604800000 // 7 days later

		testEventFields = {
			name: 'Test Event',
			description: 'A test event description',
			members: [{
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				userId: testUser._id.toString() as any,
				role: 'creator',
				availabilityStatus: 'available'
			}],
			duration: 3600000, // 1 hour
			timeWindow: {
				start: futureStart,
				end: futureEnd
			},
			public: false
		}
	})

	describe('Event Creation', function () {
		it('should create a valid event', async function () {
			const event = await EventModel.create(testEventFields)
			expect(event).to.exist
			expect(event.name).to.equal(testEventFields.name)
			expect(event.description).to.equal(testEventFields.description)
			expect(event.members).to.have.lengthOf(1)
			expect(event.members[0].userId.toString()).to.equal(testUser.id.toString())
			expect(event.members[0].role).to.equal('creator')
			expect(event.duration).to.equal(testEventFields.duration)
			expect(event.status).to.equal('draft')
			expect(event.public).to.be.false
			expect(event.blackoutPeriods).to.be.an('array').that.is.empty
		})

		it('should trim event name', async function () {
			const event = await EventModel.create({
				...testEventFields,
				name: '  Trimmed Event  '
			})
			expect(event.name).to.equal('Trimmed Event')
		})

		it('should trim event description', async function () {
			const event = await EventModel.create({
				...testEventFields,
				description: '  Trimmed description  '
			})
			expect(event.description).to.equal('Trimmed description')
		})

		it('should default status to draft', async function () {
			const event = await EventModel.create(testEventFields)
			expect(event.status).to.equal('draft')
		})

		it('should default public to false', async function () {
			const event = await EventModel.create({
				...testEventFields,
				public: undefined
			})
			expect(event.public).to.be.false
		})
	})

	describe('Event Validation', function () {
		it('should not create event without name', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					name: undefined
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event without description', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					description: undefined
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event without members', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					members: []
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event without creator', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					members: [{
						userId: testUser.id,
						role: 'participant',
						availabilityStatus: 'available'
					}]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with name too short', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					name: ''
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with name too long', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					name: 'a'.repeat(101)
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with description too long', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					description: 'a'.repeat(1001)
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with duration too short', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					duration: 59999 // Less than 1 minute
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with timeWindow start in the past', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					timeWindow: {
						start: Date.now() - 86400000, // Yesterday
						end: Date.now() + 86400000
					}
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with timeWindow end before start', async function () {
			let errorOccurred = false
			try {
				const futureTime = Date.now() + 86400000
				await EventModel.create({
					...testEventFields,
					timeWindow: {
						start: futureTime,
						end: futureTime - 3600000 // 1 hour before start
					}
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with invalid status', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					status: 'invalid'
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with invalid member role', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					members: [{
						userId: testUser.id,
						role: 'invalid',
						availabilityStatus: 'available'
					}]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with invalid availability status', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					members: [{
						userId: testUser.id,
						role: 'creator',
						availabilityStatus: 'invalid'
					}]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not create event with negative custom padding', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					members: [{
						userId: testUser.id,
						role: 'creator',
						availabilityStatus: 'available',
						customPaddingAfter: -1
					}]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})
	})

	describe('Scheduled Time Validation', function () {
		it('should allow valid scheduled time within window', async function () {
			const scheduledTime = testEventFields.timeWindow.start + 3600000 // 1 hour after start
			const event = await EventModel.create({
				...testEventFields,
				scheduledTime
			})
			expect(event.scheduledTime).to.equal(scheduledTime)
		})

		it('should not allow scheduled time before window start', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					scheduledTime: testEventFields.timeWindow.start - 3600000 // 1 hour before start
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not allow scheduled time that would end after window end', async function () {
			let errorOccurred = false
			try {
				const scheduledTime = testEventFields.timeWindow.end - 1800000 // 30 minutes before end, but event is 1 hour long
				await EventModel.create({
					...testEventFields,
					scheduledTime
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})
	})

	describe('Blackout and Preferred Times', function () {
		it('should allow valid blackout periods', async function () {
			const event = await EventModel.create({
				...testEventFields,
				blackoutPeriods: [
					{ start: 100, end: 200 },
					{ start: 300, end: 400 }
				]
			})
			expect(event.blackoutPeriods).to.have.lengthOf(2)
			expect(event.blackoutPeriods[0].start).to.equal(100)
			expect(event.blackoutPeriods[0].end).to.equal(200)
		})

		it('should allow valid preferred times', async function () {
			const event = await EventModel.create({
				...testEventFields,
				preferredTimes: [
					{ start: 100, end: 200 },
					{ start: 300, end: 400 }
				]
			})
			expect(event.preferredTimes).to.have.lengthOf(2)
			expect(event.preferredTimes![0].start).to.equal(100)
			expect(event.preferredTimes![0].end).to.equal(200)
		})

		it('should not allow blackout period with start >= end', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					blackoutPeriods: [{ start: 200, end: 100 }]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not allow preferred time with start >= end', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					preferredTimes: [{ start: 200, end: 100 }]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not allow blackout period with negative start time', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					blackoutPeriods: [{ start: -100, end: 100 }]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})

		it('should not allow blackout period with zero start time', async function () {
			let errorOccurred = false
			try {
				await EventModel.create({
					...testEventFields,
					blackoutPeriods: [{ start: 0, end: 100 }]
				})
			} catch {
				errorOccurred = true
			}
			expect(errorOccurred).to.be.true
		})
	})

	describe('Multiple Members', function () {
		it('should allow multiple members with different roles', async function () {
			const secondUser = await UserModel.create({
				username: 'secondUser',
				email: 'second@example.com',
				password: 'password123'
			})

			const event = await EventModel.create({
				...testEventFields,
				members: [
					{
						userId: testUser.id,
						role: 'creator',
						availabilityStatus: 'available'
					},
					{
						userId: secondUser._id,
						role: 'participant',
						availabilityStatus: 'tentative'
					}
				]
			})

			expect(event.members).to.have.lengthOf(2)
			expect(event.members.find(m => m.role === 'creator')).to.exist
			expect(event.members.find(m => m.role === 'participant')).to.exist
		})

		it('should default member role to participant', async function () {
			const secondUser = await UserModel.create({
				username: 'secondUser',
				email: 'second@example.com',
				password: 'password123'
			})

			const event = await EventModel.create({
				...testEventFields,
				members: [
					{
						userId: testUser.id,
						role: 'creator',
						availabilityStatus: 'available'
					},
					{
						userId: secondUser._id,
						availabilityStatus: 'available'
					}
				]
			})

			const participant = event.members.find(m => m.userId.toString() === secondUser._id.toString())
			expect(participant!.role).to.equal('participant')
		})

		it('should default availability status to tentative', async function () {
			const event = await EventModel.create({
				...testEventFields,
				members: [{
					userId: testUser.id,
					role: 'creator'
				}]
			})

			expect(event.members[0].availabilityStatus).to.equal('tentative')
		})
	})
})
