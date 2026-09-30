import { expect } from 'chai'
import { describe, it } from 'mocha'

import { getChaiAgent as agent } from '../../testSetup.js'

async function registerAndLogin (username: string, email: string) {
	const res = await agent().post('/api/v1/auth/register').send({ username, email, password: 'password123' })
	const cookieHeader = res.headers['set-cookie']
	const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : ''
	return { cookie, id: res.body.user._id }
}

describe('Event routes', function () {
	it('creates a flexible event', async function () {
		const { cookie, id } = await registerAndLogin('Alice', 'alice@example.com')
		const now = Date.now()
		const res = await agent().post('/api/v1/events').set('Cookie', cookie).send({
			name: 'Planning',
			duration: 3600000,
			type: 'flexible',
			timeWindow: { start: now + 3600000, end: now + 86400000 },
			members: [{ userId: id, role: 'creator' }],
			visibility: 'private'
		})
		expect(res).to.have.status(201)
		expect(res.body).to.have.property('type', 'flexible')
		expect(res.body).to.have.property('status', 'open')
	})

	it('forbids unauthenticated create', async function () {
		const now = Date.now()
		const res = await agent().post('/api/v1/events').send({
			name: 'NoAuth',
			duration: 3600000,
			type: 'flexible',
			timeWindow: { start: now + 3600000, end: now + 86400000 }
		})
		expect(res).to.have.status(401)
	})
})
