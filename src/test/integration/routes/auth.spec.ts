import { expect } from 'chai'
import { describe, it } from 'mocha'

import { getChaiAgent as agent } from '../../testSetup.js'

describe('Auth routes', function () {
	it('registers and returns user', async function () {
		const res = await agent().post('/api/v1/auth/register').send({
			username: 'Alice',
			email: 'alice@example.com',
			password: 'password123'
		})
		expect(res).to.have.status(201)
		expect(res.body.user).to.have.property('email', 'alice@example.com')
	})

	it('fails login with wrong password', async function () {
		await agent().post('/api/v1/auth/register').send({ username: 'Alice', email: 'alice@example.com', password: 'password123' })
		const res = await agent().post('/api/v1/auth/login').send({ email: 'alice@example.com', password: 'wrong' })
		expect(res).to.have.status(401)
	})
})
