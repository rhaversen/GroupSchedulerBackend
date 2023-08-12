// Node.js built-in modules

// Third-party libraries
import dotenv from 'dotenv';
import jsonwebtokenPkg from 'jsonwebtoken';
import bcryptjsPkg from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import mongoose, { model } from 'mongoose';

// Own modules
import errors from '../utils/errors.mjs';
import logger from '../utils/logger.mjs';

// Setup
dotenv.config();

// Destructuring and global variables
const { sign } = jsonwebtokenPkg;
const { compare, genSalt, hash } = bcryptjsPkg;
const { Schema } = mongoose;
const {
    HashingError,
    UserNotFoundError,
    EventNotFoundError
} = errors;

// Constants
const jwtExpiry = process.env.JWT_EXPIRY;
const jwtSecret = process.env.JWT_SECRET
const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS);
const nanoidAlphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoidLength = 10;
const nanoid = customAlphabet(nanoidAlphabet, nanoidLength);
const userExpiry = Number(process.env.UNCONFIRMED_USER_EXPIRY);

const userSchema = new Schema({
    username: { type: String, required: true }, // This is how other users will recognize you. It should reflect your name or nickname. Don't worry, only users in the same events as you can see your name.
    email: { type: String, required: true, unique: true }, // This is how you will log in, no users will be able to see this
    password: { type: String, required: true }, 
    events: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    availabilities: [{ type: Schema.Types.ObjectId, ref: 'Availability' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    userCode: { type: String, unique: true },
    confirmed: { type: Boolean, default: false },
    registrationDate: { type: Date, default: new Date() }, // Keep track of registration date
    expirationDate: { type: Date, default: new Date(Date.now() + userExpiry * 1000) }, // TTL index, document will expire in process.env.UNCONFIRMED_USER_EXPIRY seconds if not confirmed
});

userSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });

userSchema.methods.confirmUser = async function() {
    this.confirmed = true; // Update the user's status to confirmed
    this.expirationDate = undefined; // Remove the expiration date to cancel auto-deletion
};

// Method for comparing parameter to this users password. Returns true if passwords match
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await compare(candidatePassword, this.password);
};

userSchema.methods.generateNewUserCode = async function() {
    let userCode;
    let existingUser;
    
    do {
        userCode = nanoid();
        existingUser = await this.constructor.findOne({ userCode });
    } while (existingUser);
  
    this.userCode = userCode;
};

userSchema.methods.generateToken = function() {
    const payload = { id: this._id };
    const token = sign(payload, jwtSecret, { expiresIn: jwtExpiry })
    logger.info('JWT created')
    return token;
};

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (this.isNew) {
        await this.generateNewUserCode();
    }

    if (this.isModified('password')) {
        try {
            const salt = await genSalt(saltRounds); //genSalt and hash is already async
            this.password = await hash(this.password, salt);
            return next();
        } catch (err) {
            return next(new HashingError('Error generating a password hash'));
        }
    }

    logger.info('User saved')
});

userSchema.pre('remove', async function(next) {
    try {
        // Remove user from followers following array
        for (const followerId of this.followers) {
            // Get the user
            const user = await this.constructor.findById(followerId);
    
            if (!user) {
                throw new UserNotFoundError('User not found');
            }
    
            // Remove this user from the followers's following array
            user.following = user.following.filter(followerId => followerId.toString() !== this._id.toString());
    
            // Save the user
            await user.save();
            logger.info('User removed')
        }

        // Remove user from events
        for (const eventId of this.events) {
            // Get the user
            const event = await Event.findById(eventId);

            if (!event) {
                throw new EventNotFoundError('Event not found');
            }

            // Remove this user from the events participants array
            event.participants = event.participants.filter(userId => userId.toString() !== this._id.toString());

            // Save the event
            await event.save();
            logger.info('User removed')
        }
  
        next();
  
    } catch (error) {
      next(error);
    }
  });

export default model('User', userSchema);