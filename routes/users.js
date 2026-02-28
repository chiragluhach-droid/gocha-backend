const express = require('express');
const User = require('../models/User');

const router = express.Router();

// POST /api/users/push-token
// body: { phone, token }
router.post('/push-token', async (req, res) => {
  try {
    const { phone, token } = req.body;
    if (!phone || !token) return res.status(400).json({ message: 'Missing phone or token' });
    const user = await User.findOneAndUpdate({ phone }, { pushToken: token }, { new: true, upsert: false }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Failed to register push token', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users - list users (for admin)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error('Failed to fetch users', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id - single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Failed to fetch user', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
