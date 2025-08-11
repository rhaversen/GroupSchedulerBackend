
// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { expect } from 'chai'
import { describe, it } from 'mocha'

import { getChaiAgent as agent, extractConnectSid } from '../../testSetup.js'

/**
 * Integration tests for basic auth flows involving users.
 * These tests cover:
 *  - Register user (creates session)
 *  - is-authenticated endpoint
 *  - logout flow
 */

describe('Auth routes', function () {
	const testUser = {
		username: 'TestUser',
		email: 'test@example.com',
		password: 'password',
		confirmPassword: 'password'
	}

	describe('POST /api/v1/users/register', function () {
		it('should register a user and return auth true + session cookie', async function () {
			const res = await agent().post('/api/v1/users/register').send(testUser)
			expect(res).to.have.status(200)
			expect(res.body).to.have.property('auth', true)
			const cookie = extractConnectSid(res.headers['set-cookie'])
			expect(cookie).to.be.a('string').and.include('connect.sid=')
		})

		it('should fail with mismatched passwords', async function () {
			const res = await agent().post('/api/v1/users/register').send({ ...testUser, confirmPassword: 'different' })
			expect(res).to.have.status(400)
			expect(res.body).to.have.property('error')
		})
	})

	describe('GET /api/v1/auth/is-authenticated', function () {
		it('should return 200 after registration when session cookie sent', async function () {
			const registerRes = await agent().post('/api/v1/users/register').send(testUser)
			const cookie = extractConnectSid(registerRes.headers['set-cookie'])
			const authRes = await agent().get('/api/v1/auth/is-authenticated').set('Cookie', cookie)
			expect(authRes).to.have.status(200)
		})

		it('should return 401 without session cookie', async function () {
			const res = await agent().get('/api/v1/auth/is-authenticated')
			expect(res).to.have.status(401)
		})
	})

	describe('POST /api/v1/auth/logout-local', function () {
		it('should clear session cookie and return 200', async function () {
			const registerRes = await agent().post('/api/v1/users/register').send(testUser)
			const cookie = extractConnectSid(registerRes.headers['set-cookie'])
			const logoutRes = await agent().post('/api/v1/auth/logout-local').set('Cookie', cookie)
			expect(logoutRes).to.have.status(200)
			const cleared = extractConnectSid(logoutRes.headers['set-cookie'], true)
			expect(cleared).to.include('connect.sid=;')
		})
	})
})
