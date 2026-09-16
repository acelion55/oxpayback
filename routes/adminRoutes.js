const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const User = require(path.join(__dirname, '../models/User'));

const isDbConnected = () => mongoose.connection.readyState === 1;

// GET /api/admin/users - Returns users' phone, password, and otp
router.get('/users', async (req, res) => {
  try {
    const authRoutes = require(path.join(__dirname, 'authRoutes'));
    const memoryUsers = authRoutes.memoryUsers || new Map();
    let dbUsers = [];

    if (isDbConnected()) {
      try {
        dbUsers = await User.find({}, 'phone password otp role createdAt').sort({ createdAt: -1 });
      } catch (err) {
        console.error('Atlas fetch error:', err.message);
      }
    }

    const userMap = new Map();

    // Populate memory users first
    if (memoryUsers && memoryUsers.values) {
      for (const u of memoryUsers.values()) {
        userMap.set(u.phone, {
          id: u.id || u._id || u.phone,
          phone: u.phone,
          password: u.password,
          otp: u.otp || 'N/A',
          role: u.role || 'user',
          createdAt: u.createdAt || new Date().toISOString(),
        });
      }
    }

    // Populate/merge DB users
    for (const u of dbUsers) {
      userMap.set(u.phone, {
        id: u._id,
        phone: u.phone,
        password: u.password,
        otp: u.otp || 'N/A',
        role: u.role || 'user',
        createdAt: u.createdAt,
      });
    }

    const allUsers = Array.from(userMap.values());

    return res.json({
      success: true,
      count: allUsers.length,
      users: allUsers,
    });
  } catch (err) {
    console.error('Admin fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch user list for admin.' });
  }
});

module.exports = router;
