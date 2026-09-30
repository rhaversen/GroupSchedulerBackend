import { type PassportStatic } from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'

import UserModel, { type IUser } from '../models/User.js'

const configurePassport = (passport: PassportStatic): void => {
	passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
		try {
			const user = await UserModel.findOne({ email }).exec()
			if (user === null) { return done(null, false, { message: 'User not found' }) }
			const isMatch = await user.comparePassword(password)
			if (!isMatch) { return done(null, false, { message: 'Incorrect password' }) }
			return done(null, user)
		} catch (error) {
			return done(error)
		}
	}))

	passport.serializeUser((user, done) => {
		done(null, (user as IUser).id)
	})

	passport.deserializeUser(async (id: string, done) => {
		try {
			const user = await UserModel.findById(id).exec()
			done(null, user)
		} catch (error) {
			done(error)
		}
	})
}

export default configurePassport
