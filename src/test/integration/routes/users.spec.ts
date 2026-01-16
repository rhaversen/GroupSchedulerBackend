
// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { expect } from 'chai'
import { describe, it } from 'mocha'
import mongoose from 'mongoose'

import { getChaiAgent as agent, extractConnectSid } from '../../testSetup.js'

const baseUser = {
	username: 'Alice',
	email: 'alice@example.com',
	password: 'password',
	confirmPassword: 'password'
}

async function registerUser (override?: Partial<typeof baseUser>) {
	const res = await agent().post('/api/v1/users/register').send({ ...baseUser, ...override })
	return { res, cookie: extractConnectSid(res.headers['set-cookie']) }
}

describe('User routes', function () {
	describe('GET /api/v1/users/:id public vs self fields', function () {
		it('should hide sensitive fields when viewing another user', async function () {
			const { res: res1 } = await registerUser()
			const user1Id = res1.body.user._id
			await registerUser({ username: 'Bob', email: 'bob@example.com' })
			const listRes = await agent().get(`/api/v1/users/${user1Id}`)
			expect(listRes).to.have.status(200)
			expect(listRes.body).to.have.property('email', null)
		})

		it('should show full fields for self', async function () {
			const { res, cookie } = await registerUser()
			const userId = res.body.user._id
			const selfRes = await agent().get(`/api/v1/users/${userId}`).set('Cookie', cookie)
			expect(selfRes).to.have.status(200)
			expect(selfRes.body).to.have.property('email', baseUser.email)
		})
	})

	describe('GET /api/v1/users/me', function () {
		it('should return 401 when unauthenticated', async function () {
			const res = await agent().get('/api/v1/users/me')
			expect(res).to.have.status(401)
		})

		it('should return current user when authenticated', async function () {
			const { cookie } = await registerUser()
			const meRes = await agent().get('/api/v1/users/me').set('Cookie', cookie)
			expect(meRes).to.have.status(200)
			expect(meRes.body).to.have.property('email', baseUser.email)
		})
	})

	describe('PATCH /api/v1/users/:id', function () {
		it('should update username', async function () {
			const { res, cookie } = await registerUser()
			const userId = res.body.user._id
			const patchRes = await agent().patch(`/api/v1/users/${userId}`).set('Cookie', cookie).send({ username: 'Alice2' })
			expect(patchRes).to.have.status(200)
			expect(patchRes.body).to.have.property('username', 'Alice2')
		})

		it('should forbid updating another user', async function () {
			const { res: res1 } = await registerUser()
			const user1Id = res1.body.user._id
			const { cookie: user2Cookie } = await registerUser({ username: 'Bob', email: 'bob@example.com' })
			const patchRes = await agent().patch(`/api/v1/users/${user1Id}`).set('Cookie', user2Cookie).send({ username: 'Hacker' })
			expect(patchRes).to.have.status(403)
		})
	})

	describe('Password update', function () {
		it('should update password with correct currentPassword', async function () {
			const { cookie } = await registerUser()
			const pwRes = await agent().patch('/api/v1/users/me/password').set('Cookie', cookie).send({ currentPassword: baseUser.password, newPassword: 'newPass', confirmNewPassword: 'newPass' })
			expect(pwRes).to.have.status(200)
			// login with new password (register endpoint logs in; we need a fresh session via login-user-local)
			const loginRes = await agent().post('/api/v1/auth/login-user-local').send({ email: baseUser.email, password: 'newPass' })
			expect(loginRes).to.have.status(200)
		})
	})

	describe('Blackout periods', function () {
		it('should add and then delete a blackout period', async function () {
			const { res, cookie } = await registerUser()
			const userId = res.body.user._id
			const start = Date.now() + 3600000
			const end = start + 7200000
			const addRes = await agent().post(`/api/v1/users/${userId}/blackout-periods`).set('Cookie', cookie).send({ start, end })
			expect(addRes).to.have.status(201)
			expect(addRes.body).to.be.an('array').with.lengthOf(1)
			const delRes = await agent().delete(`/api/v1/users/${userId}/blackout-periods`).set('Cookie', cookie).send({ start, end })
			expect(delRes).to.have.status(200)
			expect(delRes.body).to.be.an('array').with.lengthOf(0)
		})

		it('should not allow blackout modification by another user', async function () {
			const { res: res1 } = await registerUser()
			const user1Id = res1.body.user._id
			const { cookie: user2Cookie } = await registerUser({ username: 'Bob', email: 'bob@example.com' })
			const start = Date.now() + 3600000
			const end = start + 7200000
			const addRes = await agent().post(`/api/v1/users/${user1Id}/blackout-periods`).set('Cookie', user2Cookie).send({ start, end })
			expect(addRes).to.have.status(403)
		})
	})

	it('should return 404 for non-existing user', async function () {
		const res = await agent().get(`/api/v1/users/${new mongoose.Types.ObjectId().toString()}`)
		expect(res).to.have.status(404)
	})
})
