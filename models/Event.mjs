import mongoose, { model } from 'mongoose';
import User from './User.mjs';
import { info } from '../utils/logger.js';

import { UserNotFoundError } from '../utils/errors.mjs';

const { Schema } = mongoose;

const nanoidAlphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoidLength = 10;

import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet(nanoidAlphabet, nanoidLength);


const eventSchema = new Schema({
  eventName: { type: String, required: true },
  eventDescription: { type: String },
  startDate: { type: Date, required: true, validate: { validator: function(value) { return value < this.endDate; }, message: 'Start date must be before end date' } },
  endDate: { type: Date, required: true, validate: { validator: function(value) { return value > this.startDate; }, message: 'End date must be after start date' } },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }], //If admins is empty, the event is concidered to be editable by all participants
  eventCode: {type: String, unique: true, required: true}
});

eventSchema.methods.generateNewEventCode = async function() {
  let eventCode;
  let existingEvent;
  
  do {
    eventCode = nanoid();
    existingEvent = await this.constructor.findOne({ eventCode });
  } while (existingEvent);

  this.eventCode = eventCode;
  await this.save();
};

eventSchema.methods.isAdmin = function(userId) {
  return this.admins.some(admin => admin.equals(userId));
};

eventSchema.methods.isLocked = function() {
  return !(this.admins.length === 0);
};

eventSchema.pre('save', async function(next) {
  if (this.isNew) {
    let eventCode;
    let existingEvent;
    
    do {
      eventCode = nanoid();
      existingEvent = await this.constructor.findOne({ eventCode });
    } while (existingEvent);

    this.eventCode = eventCode;
  }

  //Delete event if empty
  if(this.$isEmpty('participants')){
    try {
      await this.remove();
    } catch (err) {
      next(err);
      return;
    }
  }

  info('Event saved')
  next();
  }
);

//Remove event from users
eventSchema.pre('remove', async function(next) {
  try {
    // Go through all participants
    for (const participantId of this.participants) {
        // Get the user
        const user = await User.findById(participantId);

        if (!user) {
            throw new UserNotFoundError('User not found');
        }

        // Remove the event from the user's events array
        user.events = user.events.filter(eventId => eventId.toString() !== this._id.toString());

        // Save the user
        await user.save();
        info('Event removed')
    }

    next();

  } catch (error) {
    next(error);
  }
});

export default model('Event', eventSchema);