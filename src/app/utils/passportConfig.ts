import { type PassportStatic } from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'

import UserModel, { IUser } from '../models/User.js'

import logger from './logger.js'

// Extend the Express session interface to include custom properties
declare module 'express-session' {
	interface Session {
		ipAddress?: string
		loginTime?: Date
		lastActivity?: Date
		userAgent?: string
	}
}

const configurePassport = (passport: PassportStatic): void => {
	// Local User Strategy
	passport.use('user-local', new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password'
	}, async (email, password, done) => {
		try {
			const user = await UserModel.findOne({ email }).exec()
			if (user === null || user === undefined) {
				logger.warn(`User login failed: User with email ${email} not found`)
				return done(null, false, { message: 'User med email ' + email + ' findes ikke.' })
			}

			const isMatch = await user.comparePassword(password)
			if (!isMatch) {
				logger.warn(`User login failed: Invalid password for user ${email}`)
				return done(null, false, { message: 'Ugyldigt kodeord' })
			}

			logger.info(`User ${email} logged in successfully`)
			return done(null, user)
		} catch (error) {
			if (error instanceof Error) {
				logger.error(`User login error: ${error.message}`, { error })
			} else {
				logger.error('User login error: An unknown error occurred', { error })
			}
			return done(error)
		}
	}))

	passport.serializeUser((user, done) => {
		const userId = (user as IUser).id
		logger.debug(`Serializing user: ID ${userId}`)
		done(null, userId)
	})

	passport.deserializeUser(async (id: string, done) => {
		try {
			const user = await UserModel.findById(id).exec()
			if (user !== null && user !== undefined) {
				return done(null, user) // User found
			}

			logger.warn(`User not found during deserialization: ID ${id}`)
			return done(new Error('Bruger ikke fundet'), false)
		} catch (err) {
			if (err instanceof Error) {
				logger.error(`Error during deserialization: ${err.message}`, { error: err })
			} else {
				logger.error('Error during deserialization: An unknown error occurred', { error: err })
			}
			return done(err, false)
		}
	})
}

export default configurePassport
