import { type Server } from 'http'

import * as chai from 'chai'
import chaiHttp, { request } from 'chai-http'
import { after, afterEach, before, beforeEach } from 'mocha'
import mongoose from 'mongoose'
import { restore } from 'sinon'

import { disconnectFromInMemoryMongoDB } from './mongoMemoryReplSetConnector.js'

process.env.NODE_ENV = 'test'
process.env.SESSION_SECRET = 'TEST_SESSION_SECRET'

chai.use(chaiHttp)
let appServer: Server | null = null
let appImportPromise: Promise<{ server: Server }> | null = null
let chaiAppAgent: ChaiHttp.Agent

const cleanDatabase = async (): Promise<void> => {
	if (process.env.NODE_ENV !== 'test') { return }
	if (mongoose.connection.db != null) {
		await mongoose.connection.db.dropDatabase()
	}
}

before(async function () {
	this.timeout(20000)
	const database = await import('./mongoMemoryReplSetConnector.js')
	if (mongoose.connection.readyState === 0) {
		await database.default()
	}
	if (appImportPromise == null) {
		appImportPromise = import('../app/index.js') as Promise<{ server: Server }>
	}
	const imported = await appImportPromise
	appServer = imported.server
})

beforeEach(async () => {
	if (appServer == null) { throw new Error('App not initialized') }
	chaiAppAgent = request.execute(appServer).keepOpen()
})

afterEach(async () => {
	restore()
	await cleanDatabase()
	await new Promise<void>((resolve) => {
		chaiAppAgent.close(() => resolve())
	})
})

after(async function () {
	this.timeout(20000)
	if (appServer != null && appServer.listening) {
		appServer.close()
	}
	await disconnectFromInMemoryMongoDB({ close: async () => {} } as any)
	appServer = null
	appImportPromise = null
})

const getChaiAgent = (): ChaiHttp.Agent => chaiAppAgent

export function extractConnectSid (
	setCookieHeader: string | string[] | undefined,
	withFlags: boolean = false
): string {
	if (setCookieHeader == null) { return '' }
	const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
	const sidCookie = cookies.find(cookie => cookie.startsWith('connect.sid='))
	if (sidCookie == null || sidCookie === '') { return '' }
	if (withFlags) { return sidCookie }
	return sidCookie.split(';')[0]
}

export { getChaiAgent }
