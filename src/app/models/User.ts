import bcrypt from 'bcrypt'
import { type Document, model, Schema } from 'mongoose'

export interface IUser extends Document {
	id: string
	username: string
	email: string
	password: string
	confirmed: boolean
	createdAt: Date
	updatedAt: Date
	comparePassword(candidatePassword: string): Promise<boolean>
}

declare global {
	namespace Express {
		interface User extends IUser {}
	}
}

const userSchema = new Schema({
	username: {
		type: String,
		required: true,
		trim: true,
		maxlength: [50, 'Username must be at most 50 characters']
	},
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true
	},
	password: {
		type: String,
		required: true
	},
	confirmed: {
		type: Boolean,
		default: false
	}
}, { timestamps: true })

userSchema.pre('save', async function () {
	if (this.isModified('password')) {
		this.password = await bcrypt.hash(this.password as string, 12)
	}
})

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
	return bcrypt.compare(candidatePassword, this.password)
}

const UserModel = model<IUser>('User', userSchema)

export default UserModel
