const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const Restaurant = require('./models/Restaurant');

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gocha';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node set-vendor-passkey.js <restaurantId> <passkey>');
    process.exit(1);
  }
  const [restaurantId, passkey] = args;

  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo');

  const hash = await bcrypt.hash(passkey, 10);
  const r = await Restaurant.findByIdAndUpdate(restaurantId, { vendorPasskey: hash }, { new: true });
  if (!r) {
    console.error('Restaurant not found:', restaurantId);
    process.exit(2);
  }
  console.log('Updated vendor passkey for', r.name);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(3);
});
