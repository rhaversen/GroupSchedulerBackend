import { expect } from 'chai'
import { describe, it } from 'mocha'

import { getChaiAgent as agent } from '../../testSetup.js'

describe('User routes', function () {
	it('lists users', async function () {
		await agent().post('/api/v1/auth/register').send({ username: 'User1', email: 'user1@example.com', password: 'password123' })
		const res = await agent().get('/api/v1/users')
		expect(res).to.have.status(200)
		expect(res.body).to.be.an('array')
	})
})
