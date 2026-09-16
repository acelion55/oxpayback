const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

const isDbConnected = () => mongoose.connection.readyState === 1;

// GET /api/admin/users - Returns users' phone, password, and otp
router.get('/users', async (req, res) => {
  try {
    if (isDbConnected()) {
      const users = await User.find({}, 'phone password otp role createdAt').sort({ createdAt: -1 });
      return res.json({
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
    } else {
      // Memory Store Fallback
      const { memoryUsers } = require('./authRoutes');
      const userList = Array.from(memoryUsers.values()).map((u) => ({
        id: u.id,
        phone: u.phone,
        password: u.password,
        otp: u.otp || 'N/A',
        role: u.role,
        createdAt: u.createdAt,
      }));

      return res.json({
        success: true,
        count: userList.length,
        users: userList.length > 0 ? userList : [
          {
            id: '1',
            phone: '9371235282',
            password: 'Password123!',
            otp: '5282',
            role: 'user',
            createdAt: new Date().toISOString(),
          }
        ],
      });
    }
  } catch (err) {
    console.error('Admin fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch user list for admin.' });
  }
});

module.exports = router;
