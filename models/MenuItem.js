const mongoose = require('mongoose');

const ModifierOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priceDiff: { type: Number, default: 0 },
}, { _id: false });

const ModifierGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  required: { type: Boolean, default: false },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 1 },
  options: [ModifierOptionSchema],
}, { _id: false });

const MenuItemSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  // denormalized restaurant name for easier client display
  restaurantName: { type: String, required: false },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  image: { type: String },
  category: { type: String, default: 'Uncategorized' },
  isVeg: { type: Boolean, default: true },
  available: { type: Boolean, default: true },
  modifiers: [ModifierGroupSchema],
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', MenuItemSchema);
