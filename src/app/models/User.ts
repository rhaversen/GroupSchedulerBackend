import { compare, hash } from 'bcrypt'
import { type Document, model, Schema } from 'mongoose'
import { nanoid } from 'nanoid'
import validator from 'validator'

import config from '../utils/setupConfig.js'

const {
	bcryptSaltRounds,
	verificationExpiry,
	passwordResetExpiry
} = config

// Interfaces
export interface IUser extends Document {
	// Properties
	/** ID of the user */
	_id: Schema.Types.ObjectId
	id: string
	/** Username of the user */
	username: string
	/** Email of the user */
	email: string
	/** Hashed password of the user */
	password: string
	/** If the user has confirmed their email */
	confirmed: boolean

	/** Date when the user will be deleted if not confirmed */
	expirationDate?: Date
	/** Date when the password reset code will expire */
	passwordResetExpirationDate?: Date
	/** Date when the deletion code will expire */
	deletionCodeExpirationDate?: Date
	/** Code to confirm the user's email */
	confirmationCode?: string
	/** Code to reset the user's password */
	passwordResetCode?: string
	/** Code to confirm account deletion */
	deletionCode?: string

	// Methods
	/** Compare the password with the hashed password */
	comparePassword: (password: string) => Promise<boolean>
	/** Confirm the user's email */
	confirmUser: () => void
	/** Reset the user's password */
	resetPassword: (newPassword: string, passwordResetCode: string) => Promise<void>
	/** Generate a new confirmation code */
	generateNewConfirmationCode: () => Promise<string>
	/** Generate a new password reset code */
	generateNewPasswordResetCode: () => Promise<string>
	/** Generate a new deletion code */
	generateNewDeletionCode: () => Promise<string>
	/** Confirm account deletion with code */
	confirmDeletion: (deletionCode: string) => Promise<boolean>

	// Timestamps
	createdAt: Date
	updatedAt: Date
}

export interface IUserFrontend {
	/** ID of the user */
	_id: string
	/** Username of the user */
	username: string
	/** Email of the user, null if not the current user */
	email: string | null
	/** Expiration date for the user, null if not the current user */
	expirationDate: Date | null
	/** If the user has confirmed their email, null if not the current user */
	confirmed: boolean | null
	/** Created at timestamp */
	createdAt: Date
	/** Updated at timestamp */
	updatedAt: Date
}

const userSchema = new Schema<IUser>({
	username: {
		type: Schema.Types.String,
		trim: true,
		maxLength: [50, 'Username must be at most 50 characters long'],
		required: true
	},
	email: {
		type: Schema.Types.String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true,
		validate: {
			validator: (v: string) => {
				return validator.isEmail(v)
			},
			message: (props: { value: string }) => `${props.value} is not a valid email address`
		},
		// Email length validation
		minlength: [5, 'Email must be at least 5 characters long'],
		maxLength: [50, 'Email must be at most 50 characters long']
	},
	password: {
		type: Schema.Types.String,
		required: true,
		trim: true,
		minlength: [4, 'Password must be at least 4 characters long'],
		maxLength: [100, 'Password can be at most 100 characters long']
	},
	confirmed: {
		type: Schema.Types.Boolean,
		default: false
	},
	confirmationCode: {
		type: Schema.Types.String
	},
	expirationDate: {
		type: Schema.Types.Date
	},
	passwordResetCode: {
		type: Schema.Types.String
	},
	passwordResetExpirationDate: {
		type: Schema.Types.Date
	},
	deletionCode: {
		type: Schema.Types.String
	},
	deletionCodeExpirationDate: {
		type: Schema.Types.Date
	}
}, {
	timestamps: true
})

userSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 })

userSchema.methods.confirmUser = function () {
	this.confirmed = true // Update the user's status to confirmed
	this.expirationDate = undefined // Unset the expiration date to cancel auto-deletion
	this.confirmationCode = undefined // Unset the confirmation code
}

type CodeFields = 'confirmationCode' | 'passwordResetCode' | 'deletionCode'

async function generateUniqueCodeForField (field: CodeFields): Promise<string> {
	let generatedCode: string
	let existingUser: IUser | null

	do {
		generatedCode = nanoid()
		existingUser = await UserModel.findOne({ [ field ]: generatedCode })
	} while ((existingUser !== null))

	return generatedCode
}

userSchema.methods.generateNewConfirmationCode = async function (): Promise<string> {
	const newConfirmationCode = await generateUniqueCodeForField('confirmationCode')
	this.confirmationCode = newConfirmationCode
	this.expirationDate = new Date(Date.now() + verificationExpiry)
	return newConfirmationCode
}

userSchema.methods.generateNewPasswordResetCode = async function (): Promise<string> {
	const newPasswordResetCode = await generateUniqueCodeForField('passwordResetCode')
	this.passwordResetCode = newPasswordResetCode
	this.passwordResetExpirationDate = new Date(Date.now() + passwordResetExpiry)
	return newPasswordResetCode
}

userSchema.methods.generateNewDeletionCode = async function (): Promise<string> {
	const newDeletionCode = await generateUniqueCodeForField('deletionCode')
	this.deletionCode = newDeletionCode
	this.deletionCodeExpirationDate = new Date(Date.now() + passwordResetExpiry)
	return newDeletionCode
}

userSchema.methods.confirmDeletion = async function (deletionCode: string): Promise<boolean> {
	const hasDeletionCode = this.deletionCode !== undefined
	const isDeletionCodeValid = this.deletionCode === deletionCode
	const isDeletionCodeExpired = this.deletionCodeExpirationDate !== undefined && new Date() >= this.deletionCodeExpirationDate

	if (hasDeletionCode && isDeletionCodeValid && !isDeletionCodeExpired) {
		await this.deleteOne()
		return true
	}
	return false
}

userSchema.methods.resetPassword = async function (newPassword: string, passwordResetCode: string): Promise<void> {
	const hasPasswordResetCode = this.passwordResetCode !== undefined
	const isPasswordResetCodeValid = this.passwordResetCode === passwordResetCode
	const isPasswordResetCodeExpired = new Date() >= this.passwordResetExpirationDate
	if (hasPasswordResetCode && isPasswordResetCodeValid && !isPasswordResetCodeExpired) {
		this.password = newPassword
		this.passwordResetCode = undefined
		this.passwordResetExpirationDate = undefined
	}
}

userSchema.methods.comparePassword = async function (this: IUser, password: string): Promise<boolean> {
	const isPasswordCorrect = await compare(password, this.password)
	return isPasswordCorrect
}

userSchema.pre('save', async function (next) {
	if (this.isNew && (this.confirmationCode == null)) {
		await this.generateNewConfirmationCode()
	}

	// Password hashing
	if (this.isModified('password')) {
		this.password = await hash(this.password, bcryptSaltRounds) // Using a random salt for each user
		this.passwordResetCode = undefined
	}
	next()
})

const UserModel = model<IUser>('User', userSchema)

export default UserModel
