const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/admin/users - Returns users' phone, password, and otp
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'phone password otp role createdAt').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      users: users.map((u) => ({
        id: u._id,
        phone: u.phone,
        password: u.password,
        otp: u.otp || 'N/A',
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch user list for admin.' });
  }
});

module.exports = router;
