
// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { expect } from 'chai'
import { describe, it } from 'mocha'
import mongoose from 'mongoose'

import { getChaiAgent as agent, extractConnectSid } from '../../testSetup.js'

const futureWindow = () => {
	const start = Date.now() + 3600000
	const end = start + 86400000
	return { start, end }
}

async function register (username: string, email: string) {
	const res = await agent().post('/api/v1/users/register').send({ username, email, password: 'password', confirmPassword: 'password' })
	return { cookie: extractConnectSid(res.headers['set-cookie']), id: res.body.user._id }
}

describe('Event routes', function () {
	it('should create event with implicit creator', async function () {
		const { cookie, id } = await register('Alice', 'alice@example.com')
		const tw = futureWindow()
		const createRes = await agent().post('/api/v1/events').set('Cookie', cookie).send({
			name: 'Event 1',
			description: 'Desc',
			timeWindow: tw,
			duration: 3600000
		})
		expect(createRes).to.have.status(201)
		expect(createRes.body.members[0]).to.have.property('userId', id)
	})

	it('should forbid unauthenticated create', async function () {
		const tw = futureWindow()
		const res = await agent().post('/api/v1/events').send({ name: 'E', description: 'D', timeWindow: tw, duration: 3600000 })
		expect(res).to.have.status(401)
	})

	it('should get event if member', async function () {
		const { cookie } = await register('Alice', 'alice@example.com')
		const tw = futureWindow()
		const createRes = await agent().post('/api/v1/events').set('Cookie', cookie).send({ name: 'Event 1', description: 'D', timeWindow: tw, duration: 3600000 })
		const id = createRes.body._id
		const getRes = await agent().get(`/api/v1/events/${id}`).set('Cookie', cookie)
		expect(getRes).to.have.status(200)
	})

	it('should update name as creator', async function () {
		const { cookie } = await register('Alice', 'alice@example.com')
		const tw = futureWindow()
		const createRes = await agent().post('/api/v1/events').set('Cookie', cookie).send({ name: 'Event 1', description: 'D', timeWindow: tw, duration: 3600000 })
		const id = createRes.body._id
		const patchRes = await agent().patch(`/api/v1/events/${id}`).set('Cookie', cookie).send({ name: 'Event 2' })
		expect(patchRes).to.have.status(200)
		expect(patchRes.body).to.have.property('name', 'Event 2')
	})

	it('should forbid update by non-admin participant', async function () {
		const { cookie: creatorCookie, id: creatorId } = await register('Alice', 'alice@example.com')
		const { cookie: bobCookie, id: bobId } = await register('Bob', 'bob@example.com')
		const tw = futureWindow()
		const createRes = await agent().post('/api/v1/events').set('Cookie', creatorCookie).send({
			name: 'Event 1',
			description: 'D',
			timeWindow: tw,
			duration: 3600000,
			members: [
				{ userId: creatorId, role: 'creator', availabilityStatus: 'available' },
				{ userId: bobId, role: 'participant', availabilityStatus: 'available' }
			]
		})
		const id = createRes.body._id
		const patchRes = await agent().patch(`/api/v1/events/${id}`).set('Cookie', bobCookie).send({ name: 'Hacked' })
		expect(patchRes).to.have.status(403)
	})

	it('should delete event as creator', async function () {
		const { cookie } = await register('Alice', 'alice@example.com')
		const tw = futureWindow()
		const createRes = await agent().post('/api/v1/events').set('Cookie', cookie).send({ name: 'Event 1', description: 'D', timeWindow: tw, duration: 3600000 })
		const id = createRes.body._id
		const delRes = await agent().delete(`/api/v1/events/${id}`).set('Cookie', cookie)
		expect(delRes).to.have.status(204)
	})

	describe('User event settings', function () {
		it('should update and fetch user event settings', async function () {
			const { cookie, id: userId } = await register('Alice', 'alice@example.com')
			const tw = futureWindow()
			const createRes = await agent().post('/api/v1/events').set('Cookie', cookie).send({ name: 'Event 1', description: 'D', timeWindow: tw, duration: 3600000 })
			const eventId = createRes.body._id
			const patchRes = await agent().patch(`/api/v1/events/${eventId}/settings`).set('Cookie', cookie).send({ availabilityStatus: 'unavailable', customPaddingAfter: 60000 })
			expect(patchRes).to.have.status(200)
			expect(patchRes.body).to.include({ userId, eventId })
			const getRes = await agent().get(`/api/v1/events/${eventId}/settings`).set('Cookie', cookie)
			expect(getRes).to.have.status(200)
			expect(getRes.body).to.have.property('availabilityStatus', 'unavailable')
		})
	})

	it('should return 404 for missing event', async function () {
		const { cookie } = await register('Alice', 'alice@example.com')
		const res = await agent().get(`/api/v1/events/${new mongoose.Types.ObjectId().toString()}`).set('Cookie', cookie)
		expect(res).to.have.status(404)
	})

	describe('Event timing update resets status', function () {
		it('reverts confirmed event to scheduling when timing fields updated', async function () {
			const { cookie } = await register('TimingUser', 'timinguser@example.com')
			const tw = futureWindow()
			const createRes = await agent().post('/api/v1/events').set('Cookie', cookie).send({
				name: 'Confirmed Event',
				description: 'D',
				timeWindow: tw,
				duration: 3600000,
				status: 'confirmed',
				scheduledTime: tw.start + 600000
			})
			expect(createRes).to.have.status(201)
			expect(createRes.body.status).to.equal('confirmed')
			const eventId = createRes.body._id
			const newWindow = { start: tw.start + 7200000, end: tw.end + 7200000 }
			const patchRes = await agent().patch(`/api/v1/events/${eventId}`).set('Cookie', cookie).send({ timeWindow: newWindow })
			expect(patchRes).to.have.status(200)
			expect(patchRes.body.status).to.equal('scheduling')
			expect(patchRes.body.scheduledTime).to.be.undefined
		})

		it('explicit status scheduling transition from scheduled event clears scheduledTime', async function () {
			const { cookie } = await register('ScheduleUser', 'scheduleuser@example.com')
			const tw = futureWindow()
			const createRes = await agent().post('/api/v1/events').set('Cookie', cookie).send({
				name: 'Scheduled Event',
				description: 'D',
				timeWindow: tw,
				duration: 3600000,
				status: 'scheduled',
				scheduledTime: tw.start + 600000
			})
			expect(createRes).to.have.status(201)
			const eventId = createRes.body._id
			const patchRes = await agent().patch(`/api/v1/events/${eventId}`).set('Cookie', cookie).send({ status: 'scheduling' })
			expect(patchRes).to.have.status(200)
			expect(patchRes.body.status).to.equal('scheduling')
			expect(patchRes.body.scheduledTime).to.be.undefined
		})
	})
})
