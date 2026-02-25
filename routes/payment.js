const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const router = express.Router();

// Ensure these are set in your .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

const razorpay = new Razorpay({ key_id: key_id, key_secret: key_secret });

// Create an order on Razorpay
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount) return res.status(400).json({ message: 'Amount is required' });

    // Razorpay expects amount in the smallest currency unit (paise)
    const options = {
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    return res.json({ order, key: key_id });
  } catch (err) {
    console.error('Create order error', err);
    return res.status(500).json({ message: 'Could not create order', error: err.message || err });
  }
});

// Verify payment signature
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ verified: false, message: 'Missing required fields' });
    }

    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    const verified = generated_signature === razorpay_signature;

    if (verified) {
      return res.json({ verified: true });
    }

    return res.status(400).json({ verified: false, message: 'Signature mismatch' });
  } catch (err) {
    console.error('Verify payment error', err);
    return res.status(500).json({ verified: false, message: err.message || err });
  }
});

module.exports = router;
