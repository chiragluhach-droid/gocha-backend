const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: false },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true },
  modifiers: { type: Array, default: [] },
});

const OrderSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items: { type: [OrderItemSchema], required: true },
  subtotal: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  pickupType: { type: String, enum: ['ASAP', 'SCHEDULE'], default: 'ASAP' },
  scheduledAt: { type: Date },
  notes: { type: String },
  customer: {
    name: String,
    phone: String,
  },
  status: { type: String, default: 'pending' },
  // deliveryCodeHash removed (QR verification disabled)
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
