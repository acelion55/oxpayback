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

    try {
      dbUsers = await User.find({}, 'phone password otp role createdAt').sort({ createdAt: -1 });
    } catch (err) {
      console.error('Atlas fetch error:', err.message);
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

    // Sort users by createdAt descending (newest users first at the top)
    allUsers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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

// DELETE /api/admin/users/:identifier - Delete user by ID or Phone number
router.delete('/users/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ error: 'User identifier is required.' });
    }

    const authRoutes = require(path.join(__dirname, 'authRoutes'));
    const memoryUsers = authRoutes.memoryUsers || new Map();

    let deletedCount = 0;

    // Delete from MongoDB Atlas
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
      const query = isObjectId ? { _id: identifier } : { phone: identifier };

      const targetUser = await User.findOne(query);
      if (targetUser && memoryUsers.has(targetUser.phone)) {
        memoryUsers.delete(targetUser.phone);
      }

      const dbRes = await User.deleteOne(query);
      deletedCount += dbRes.deletedCount || 0;
    } catch (dbErr) {
      console.error('Atlas delete error:', dbErr.message);
    }

    // Delete from memoryUsers map if present by phone or ID
    if (memoryUsers.has(identifier)) {
      memoryUsers.delete(identifier);
      deletedCount++;
    } else {
      for (const [phoneKey, u] of memoryUsers.entries()) {
        if (u.id === identifier || u._id === identifier || String(u.id) === String(identifier)) {
          memoryUsers.delete(phoneKey);
          deletedCount++;
        }
      }
    }

    return res.json({
      success: true,
      message: `User deleted successfully.`,
      deletedCount,
    });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
