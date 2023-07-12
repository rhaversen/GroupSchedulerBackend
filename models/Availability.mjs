import mongoose, { model } from 'mongoose';
const { Schema } = mongoose;

const availabilitySchema = new Schema({
  description: { type: String },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Free', 'Busy', 'Maybe'], required: true },
  preference: { type: Number, min: 1, max: 3, default: 2 }, // 1-3 scale for preference. 1: Free, but prefer not to. 2: Normal preference. 3: Strongly prefer. Strongly preferring every availability will have the same effect as normal preference, so be selective.
  user: { type: Schema.Types.ObjectId, ref: 'User' }
});

export default model('Availability', availabilitySchema);