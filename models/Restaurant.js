const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  image: { type: String, required: true },
  isOpen: { type: Boolean, default: true },
  waitTime: { type: Number, default: 0 }, // in minutes
  description: { type: String, default: '' },
  // Optional vendor passkey for vendor dashboard access (hashed)
  // store hashed passkey and do not return by default
  vendorPasskey: { type: String, default: '', select: false },
  rating: { type: Number, default: 4.5 },
}, { timestamps: true });

// Virtual to populate menu items (MenuItem collection)
RestaurantSchema.virtual('menu', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'restaurant',
});

// Ensure virtuals are included when converting documents to JSON
RestaurantSchema.set('toObject', { virtuals: true });
RestaurantSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Restaurant', RestaurantSchema);
