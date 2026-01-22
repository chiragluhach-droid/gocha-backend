const express = require('express');
const User = require('../models/User');

const router = express.Router();

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
