const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  // Expo push token for this user (optional)
  pushToken: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);