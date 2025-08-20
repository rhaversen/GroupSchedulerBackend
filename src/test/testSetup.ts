// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

import { type Server } from 'http'

import * as Sentry from '@sentry/node'
import * as chai from 'chai'
import chaiHttp from 'chai-http'
import type MongoStore from 'connect-mongo'
import { before, beforeEach, afterEach, after } from 'mocha'
import mongoose from 'mongoose'
import { restore } from 'sinon'

import logger from '../app/utils/logger.js'

import { disconnectFromInMemoryMongoDB } from './mongoMemoryReplSetConnector.js'

// Test environment settings
process.env.NODE_ENV = 'test'
process.env.SESSION_SECRET = 'TEST_SESSION_SECRET'

const chaiHttpObject = chai.use(chaiHttp)
let app: { server: Server, sessionStore: MongoStore } | null = null
let appImportPromise: Promise<{ server: Server, sessionStore: MongoStore }> | null = null
let chaiAppAgent: ChaiHttp.Agent

const cleanDatabase = async function (): Promise<void> {
	// /////////////////////////////////////////////
	// ////////////////////////////////////////////
	if (process.env.NODE_ENV !== 'test') {
		logger.warn('Database wipe attempted in non-test environment! Shutting down.')
		return
	}
	// /////////////////////////////////////////////
	// ////////////////////////////////////////////
	logger.debug('Cleaning databases')
	if (mongoose.connection.db !== undefined) {
		await mongoose.connection.db.dropDatabase()
	}
}

before(async function () {
	this.timeout(20000)
	process.env.NODE_ENV = 'test'
	if (app !== null) {
		return
	}
	const database = await import('./mongoMemoryReplSetConnector.js')
	if (mongoose.connection.readyState === 0) {
		await database.default()
	}
	if (appImportPromise === null) {
		appImportPromise = import('../app/index.js') as Promise<{ server: Server, sessionStore: MongoStore }>
	}
	app = await appImportPromise
	if (!app.server.listening) {
		await new Promise<void>((resolve) => {
			app?.server.listen(0, () => { resolve() })
		})
	}
})

beforeEach(async function () {
	if (app === null) {
		throw new Error('App not initialized')
	}
	chaiAppAgent = chaiHttpObject.request(app.server).keepOpen()
})

afterEach(async function () {
	restore()
	await cleanDatabase()
	// Close the agent and wait for the callback using a Promise
	await new Promise<void>((resolve) => {
		// Check if chaiAppAgent exists before attempting to close
		chaiAppAgent.close(() => {
			resolve()
		})
	})
})

after(async function () {
	this.timeout(40000)
	if (app !== null) {
		app.server.close()
		await disconnectFromInMemoryMongoDB(app.sessionStore)
	}
	await Sentry.close()
	app = null
	appImportPromise = null
})

// Define return type explicitly here to match agent created
const getChaiAgent = (): ChaiHttp.Agent => chaiAppAgent

/**
 * Extracts the connect.sid cookie string from the Set-Cookie header.
 * @param {string | string[] | undefined} setCookieHeader - The Set-Cookie header value(s).
 * @returns {string} The full connect.sid cookie string, or an empty string if not found.
 */
export function extractConnectSid (
	setCookieHeader: string | string[] | undefined,
	withFlags: boolean = false
): string {
	if (setCookieHeader === undefined) {
		return ''
	}
	const cookies = Array.isArray(setCookieHeader)
		? setCookieHeader
		: [setCookieHeader]
	// find the sid entry
	const sidCookie = cookies.find(
		cookie => cookie.startsWith('connect.sid=')
	)
	if (sidCookie === null || sidCookie === undefined || sidCookie === '') {
		return ''
	}
	if (withFlags) {
		// return the full cookie string with flags
		return sidCookie
	}
	// return only 'connect.sid=…' without any flags
	return sidCookie.split(';')[0]
}

export { getChaiAgent }
