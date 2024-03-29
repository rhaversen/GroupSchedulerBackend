// Node.js built-in modules

// Third-party libraries
import passport from 'passport'
import validator from 'validator'
import { type NextFunction, type Request, type Response } from 'express'
import mongoose, { type Types } from 'mongoose'

// Own modules
import {
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidEmailError,
    InvalidQueryError,
    MissingFieldsError,
    UserNotFoundError
} from '../utils/errors.js'
import { sendConfirmationEmail, sendEmailNotRegisteredEmail, sendPasswordResetEmail } from '../utils/mailer.js'
import UserModel, { type IUser, type IUserPopulated } from '../models/User.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'
import logger from '../utils/logger.js'
import config from '../utils/setupConfig.js'
import { compare } from 'bcrypt'

// Destructuring and global variables
export const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }), 'sessions')

// Interfaces
export interface InternalSessionType extends mongoose.Document {
    _id: string
    session: string
    expires?: Date
    lastModified?: Date
}

export interface ParsedSessionData {
    cookie: {
        originalMaxAge: any
        expires: any
        secure: any
        httpOnly: any
        path: any
    }
    passport?: {
        user: any
    }
}

// Config
const {
    sessionExpiry,
    nextJsPort,
    frontendDomain
} = config

// Helper functions
function generateConfirmationLink (confirmationCode: string): string {
    let confirmationLink: string
    // Generate confirmation link
    if (process.env.NODE_ENV === 'production') {
        confirmationLink = `https://${frontendDomain}/confirm?confirmationCode=${confirmationCode}`
    } else {
        confirmationLink = `https://${frontendDomain}:${nextJsPort}/confirm?confirmationCode=${confirmationCode}`
    }

    logger.silly(confirmationLink)

    return confirmationLink
}

function generatePasswordResetLink (passwordResetCode: string): string {
    let passwordResetLink: string
    // Generate confirmation link
    if (process.env.NODE_ENV === 'production') {
        passwordResetLink = `https://${frontendDomain}/reset-password?passwordResetCode=${passwordResetCode}`
    } else {
        passwordResetLink = `https://${frontendDomain}:${nextJsPort}/reset-password?passwordResetCode=${passwordResetCode}`
    }

    logger.silly(passwordResetLink)

    return passwordResetLink
}

function ensureFieldsPresent (body: Record<string, string>, requiredFields: string[], next: NextFunction): void {
    const missingFields = requiredFields.filter(reqField => !body[reqField])
    if (missingFields.length > 0) {
        missingFields.sort((a, b) => a.localeCompare(b))
        throw new MissingFieldsError(`Missing ${missingFields.join(', ')}`)
    }
}

export const getCurrentUser =
    (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user as IUser

        const userToSendToFrontend = {
            username: user.username,
            email: user.email,
            events: user.events,
            blockedDates: user.blockedDates,
            following: user.following,
            followers: user.followers,
            userCode: user.userCode,
            confirmed: user.confirmed,
            registrationDate: user.registrationDate,
            expirationDate: user.expirationDate
        }
        res.send(userToSendToFrontend)
    }

export const getSessions = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req.user as IUser).id

    // Use type assertion here
    const sessions = await Session.find({}).exec() as InternalSessionType[]

    const userSessions = sessions.filter(sessionDocument => {
        const sessionData = JSON.parse(sessionDocument.session) as ParsedSessionData
        return sessionData.passport?.user === userId
    })

    res.json(userSessions.map(sessionDocument => {
        const sessionData = JSON.parse(sessionDocument.session) as ParsedSessionData
        return {
            sessionExpires: sessionDocument.expires,
            lastModified: sessionDocument.lastModified,
            sessionCookie: sessionData.cookie
        }
    }))
})

export const registerUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { username, email, password, confirmPassword } = req.body

    const requiredFields = ['username', 'email', 'password', 'confirmPassword']
    ensureFieldsPresent(req.body, requiredFields, next)

    if (!validator.isEmail(email)) {
        next(new InvalidEmailError('Invalid email format'))
        return
    }

    if (password !== confirmPassword) {
        next(new InvalidCredentialsError('Password and Confirm Password does not match'))
        return
    }

    if (String(password).length < 4) {
        next(new InvalidCredentialsError('Password must be at least 5 characters'))
        return
    }

    const existingUser = await UserModel.findOne({ email }).exec()

    if (existingUser !== null && existingUser !== undefined) { // TODO: It should not reveal whether the email exists in the database. Log the user in instead
        next(new EmailAlreadyExistsError('Email already exists, please sign in instead'))
        return
    }

    // User doesn't exist, create a new user
    const newUser = new UserModel({
        username,
        email,
        password
    })
    const savedUser = await newUser.save() as IUser

    const confirmationLink = generateConfirmationLink(savedUser.confirmationCode!)
    await sendConfirmationEmail(email, confirmationLink)

    passport.authenticate('local', (err: Error, user: Express.User, info: { message: string }) => {
        if (err) {
            return res.status(500).json({ auth: false, error: err.message })
        }
        if (!user) {
            return res.status(401).json({ auth: false, error: info.message })
        }
        req.logIn(user, loginErr => {
            if (loginErr) {
                return res.status(500).json({ auth: false, error: loginErr.message })
            }
            return res.status(201).json({
                auth: true,
                user,
                message: 'Registration successful! Please check your email to confirm your account within 24 hours or your account will be deleted.'
            })
        })
    })(req, res, next)
})

export const requestPasswordResetEmail = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email } = req.body

    const user = await UserModel.findOne({ email }).exec()

    if (user !== null && user !== undefined) {
        const passwordResetCode = await user.generateNewPasswordResetCode()
        user.passwordResetCode = passwordResetCode
        await user.save()
        const passwordResetLink = generatePasswordResetLink(passwordResetCode)
        await sendPasswordResetEmail(email, passwordResetLink)
    } else {
        await sendEmailNotRegisteredEmail(email)
    }

    res.status(200).json({
        message: 'If the email address exists, a password reset email has been sent.'
    })
})

export const confirmUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Extract the confirmation code from the query parameters
    const { confirmationCode } = req.query

    if (!confirmationCode) {
        next(new MissingFieldsError('Confirmation code missing'))
        return
    }

    // Find the user with the corresponding confirmation code
    const user = await UserModel.findOne({ confirmationCode }).exec()

    if (user === null || user === undefined) {
        next(new InvalidQueryError('The confirmation code is invalid or the user has already been confirmed'))
        return
    }

    // Update the user's status to 'confirmed'
    user.confirmUser()
    await user.save()

    // Redirect the user or send a success message
    res.status(200).json({
        message: 'Confirmation successful! Your account has been activated.',
        user
    })
})

export const loginUserLocal = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    passport.authenticate('local', (err: Error, user: Express.User, info: { message: string }) => {
        if (err) {
            return res.status(500).json({ auth: false, error: err.message })
        }
        if (!user) {
            return res.status(401).json({ auth: false, error: info.message })
        }
        req.logIn(user, loginErr => {
            if (loginErr) {
                return res.status(500).json({ auth: false, error: loginErr.message })
            }

            // Set maxAge for persistent sessions if requested
            if (req.body.stayLoggedIn === 'true') {
                req.session.cookie.maxAge = sessionExpiry
            }

            return res.status(200).json({ auth: true, user })
        })
    })(req, res, next)
})

export const logoutUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    req.logout(function (err) {
        if (err) {
            next(err)
            return
        }

        req.session.destroy(function (sessionErr) {
            if (sessionErr) {
                next(sessionErr)
                return
            }
            res.status(200).json({ message: 'Logged out successfully' })
        })
    })
})

export const getEvents = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('events')
    res.status(200).json(populatedUser.events)
})

export const newCode = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    // Generate a new userCode
    await user.generateNewUserCode()
    await user.save()
    res.status(200).json({ user })
})

export const followUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const candidateUserId = req.params.userId
    const candidateUser = await UserModel.findById(candidateUserId).exec()
    const user = req.user as IUser

    if (candidateUser === null || candidateUser === undefined) {
        next(new UserNotFoundError('The user to be followed could not be found'))
        return
    }

    if (candidateUser.id === user.id) {
        next(new UserNotFoundError('User cannot follow themselves'))
        return
    }

    const followingArray = user.following as Array<{ _id: Types.ObjectId }>
    const isFollowing = followingArray.find(u => u._id.toString() === candidateUser._id.toString()) !== undefined

    if (isFollowing) {
        res.status(200).json({ message: 'User is already followed' })
        return
    }

    await user.follows(candidateUser)

    res.status(200).json({ user })
})

export const unfollowUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const candidateUserId = req.params.userId
    const user = req.user as IUser

    const candidateUser = await UserModel.findById(candidateUserId).exec()
    if (candidateUser === null || candidateUser === undefined) {
        next(new UserNotFoundError('The user to be un-followed could not be found'))
        return
    }

    if (candidateUserId === user.id) {
        next(new UserNotFoundError('User cannot un-follow themselves'))
        return
    }

    const followingArray = user.following as Array<{ _id: Types.ObjectId }>
    const isNotFollowing = followingArray.find(u => u._id.toString() === candidateUser._id.toString()) === undefined

    if (isNotFollowing) {
        res.status(400).json({ error: 'User is not followed' })
        return
    }

    await user.unFollows(candidateUser)

    res.status(200).json({ user })
})

export const getFollowers = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('followers') as IUserPopulated
    const followerNames = populatedUser.followers.map(follower => follower.username)

    res.status(200).json(followerNames)
})

export const getFollowing = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('following') as IUserPopulated
    const followingNames = populatedUser.following.map(following => following.username)

    res.status(200).json(followingNames)
})

export const getCommonEvents = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const candidateUserId = req.params.userId

    if (!mongoose.Types.ObjectId.isValid(candidateUserId)) {
        res.status(400).json({ error: 'Invalid user ID format' })
        return
    }

    const candidateUser = await UserModel.findById(candidateUserId).exec()

    if (candidateUser === null || candidateUser === undefined) {
        next(new UserNotFoundError('The user to be found events in common with could not be found'))
        return
    }

    const userEvents = user.events as Types.ObjectId[]
    const candidateUserEvents = candidateUser.events as Types.ObjectId[]

    const commonEvents = userEvents.filter(userEvent => candidateUserEvents.includes(userEvent))

    res.status(200).json(commonEvents)
})

export const updatePassword = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser

    const {
        newPassword,
        confirmNewPassword,
        currentPassword
    } = req.body

    const requiredFields = ['newPassword', 'confirmNewPassword', 'currentPassword']
    ensureFieldsPresent(req.body, requiredFields, next)

    if (newPassword !== confirmNewPassword) {
        next(new InvalidCredentialsError('newPassword and confirmNewPassword does not match'))
        return
    }
    const passwordsMatch = await compare(currentPassword, user.password)
    if (passwordsMatch) {
        user.password = newPassword
    } else {
        next(new InvalidCredentialsError('currentPassword does not match with user password'))
        return
    }

    await user.save()

    res.status(200).json({ user })
})

export const resetPassword = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
        newPassword,
        confirmNewPassword
    } = req.body
    const { email, passwordResetCode } = req.params

    const requiredFields = ['newPassword', 'confirmNewPassword']
    ensureFieldsPresent(req.body, requiredFields, next)

    if (newPassword !== confirmNewPassword) {
        next(new InvalidCredentialsError('newPassword and confirmNewPassword does not match'))
        return
    }

    const user = await UserModel.findOne({ email }).exec()

    if (user === undefined || user === null) {
        res.status(404).json({ error: 'The email could not be found' })
        return
    }

    const correctPasswordResetCode = (user.passwordResetCode === passwordResetCode)
    if (!correctPasswordResetCode) {
        next(new InvalidCredentialsError('The password reset code is not correct'))
        return
    }

    user.password = newPassword
    user.passwordResetCode = undefined

    await user.save()

    res.status(201).json({ user })
})

export const updateUsername = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser

    const newUsername = req.body.newUsername

    const requiredFields = ['newUsername']
    ensureFieldsPresent(req.body, requiredFields, next)

    user.username = newUsername

    await user.save()

    res.status(200).json({ user })
})

export const deleteUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser

    await user.deleteOne()

    res.status(200).json({ user })
})
