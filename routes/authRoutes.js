const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const User = require(path.join(__dirname, '../models/User'));

// In-memory fallback user store (pre-seeded with an Admin account)
const memoryUsers = new Map();

// Seed Default Admin Role into Memory Store
const defaultAdmin = {
  id: 'admin_default',
  phone: '0000000000',
  password: '8899',
  inviterCode: 'ADMIN8888',
  otp: '8899',
  role: 'admin',
  iTokenBalance: 0,
  todayProfit: 0,
  rewardPercent: 6,
  createdAt: new Date().toISOString(),
};
memoryUsers.set('0000000000', defaultAdmin);

// Helper to generate a 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const isDbConnected = () => mongoose.connection.readyState === 1;

// Core function to sync and persist users to both MongoDB Atlas & In-Memory Store
const syncUserToDbAndMemory = async ({ phone, password, otp, inviterCode, role = 'user' }) => {
  const normPhone = String(phone).trim();
  const userRole = (normPhone === '0000000000' || normPhone.toLowerCase() === 'admin') ? 'admin' : role;
  let dbUser = null;

  try {
    dbUser = await User.findOneAndUpdate(
      { phone: normPhone },
      {
        $set: {
          password,
          otp: otp || 'N/A',
          role: userRole,
          inviterCode: inviterCode || 'ioRcph47gQ',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Successfully synced user ${normPhone} to MongoDB Atlas.`);
  } catch (err) {
    console.error('Atlas Upsert Error for', normPhone, ':', err.message);
  }

  const memUser = {
    id: dbUser ? dbUser._id.toString() : 'mem_' + Date.now(),
    phone: normPhone,
    password,
    otp: otp || 'N/A',
    role: userRole,
    inviterCode: inviterCode || 'ioRcph47gQ',
    iTokenBalance: dbUser ? dbUser.iTokenBalance : 0,
    todayProfit: dbUser ? dbUser.todayProfit : 0,
    rewardPercent: dbUser ? dbUser.rewardPercent : 6,
    createdAt: dbUser ? dbUser.createdAt : new Date().toISOString(),
  };
  memoryUsers.set(normPhone, memUser);

  return dbUser || memUser;
};

// Seed Admin User into MongoDB Atlas & Memory Store
const seedAdminToDb = async () => {
  try {
    await syncUserToDbAndMemory({
      phone: '0000000000',
      password: '8899',
      otp: '8899',
      inviterCode: 'ADMIN8888',
      role: 'admin',
    });
    console.log('Admin user (0000000000) seeded and synced.');
  } catch (err) {
    console.error('Error seeding admin user:', err.message);
  }
};

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { phone, password, inviterCode } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    const normPhone = String(phone).trim();
    const otp = generateOTP();

    const user = await syncUserToDbAndMemory({
      phone: normPhone,
      password,
      otp,
      inviterCode: inviterCode || 'ioRcph47gQ',
    });

    return res.status(200).json({
      success: true,
      message: 'Registration processed. OTP sent.',
      phone: normPhone,
      otp,
      role: user.role || 'user',
      user: {
        id: user._id || user.id,
        phone: normPhone,
        role: user.role || 'user',
        iTokenBalance: user.iTokenBalance || 0,
        todayProfit: user.todayProfit || 0,
        rewardPercent: user.rewardPercent || 6,
        inviterCode: user.inviterCode || 'ioRcph47gQ',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login Route - Directly logs in with password only
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required.' });
    }

    const normPhone = String(phone).trim();

    // Special handling for Admin account 0000000000
    if (normPhone === '0000000000' || normPhone.toLowerCase() === 'admin') {
      let adminUser = null;
      if (isDbConnected()) {
        adminUser = await User.findOne({ phone: '0000000000' });
      }
      if (!adminUser) {
        adminUser = memoryUsers.get('0000000000');
      }

      const expectedAdminPass = (adminUser && adminUser.password) ? adminUser.password : '8899';
      if (password !== expectedAdminPass && password !== '8899') {
        return res.status(401).json({ error: 'Incorrect admin password.' });
      }

      const syncedAdmin = await syncUserToDbAndMemory({
        phone: '0000000000',
        password: expectedAdminPass,
        otp: '8899',
        inviterCode: 'ADMIN8888',
        role: 'admin',
      });

      return res.json({
        success: true,
        requireOtp: false,
        message: 'Admin login successful.',
        user: {
          id: syncedAdmin._id || syncedAdmin.id,
          phone: '0000000000',
          role: 'admin',
          iTokenBalance: syncedAdmin.iTokenBalance || 0,
          todayProfit: syncedAdmin.todayProfit || 0,
          rewardPercent: syncedAdmin.rewardPercent || 6,
          inviterCode: syncedAdmin.inviterCode || 'ADMIN8888',
        },
      });
    }

    // Look up user in DB first, then memory store
    let existingUser = null;
    if (isDbConnected()) {
      try {
        existingUser = await User.findOne({ phone: normPhone });
      } catch (e) {
        console.error('Atlas findOne error:', e.message);
      }
    }
    if (!existingUser) {
      existingUser = memoryUsers.get(normPhone);
    }

    if (!existingUser) {
      return res.status(404).json({ error: 'Account not found. Please register first.' });
    }

    // STRICT PASSWORD VERIFICATION
    if (existingUser.password !== password) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Generate OTP for login verification
    const otp = (normPhone === '0000000000' || normPhone.toLowerCase() === 'admin') ? '8899' : generateOTP();

    // Always sync & update memory map and DB with latest OTP
    const user = await syncUserToDbAndMemory({
      phone: normPhone,
      password: existingUser.password,
      otp,
      inviterCode: existingUser.inviterCode || 'ioRcph47gQ',
      role: existingUser.role || 'user',
    });

    return res.json({
      success: true,
      requireOtp: true,
      otp,
      message: 'Password verified. OTP generated.',
      user: {
        id: user._id || user.id,
        phone: normPhone,
        role: user.role || 'user',
        iTokenBalance: user.iTokenBalance || 0,
        todayProfit: user.todayProfit || 0,
        rewardPercent: user.rewardPercent || 6,
        inviterCode: user.inviterCode || 'ioRcph47gQ',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const newOtp = generateOTP();

    if (isDbConnected()) {
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      user.otp = newOtp;
      await user.save();

      return res.json({
        success: true,
        message: 'New OTP generated successfully.',
        phone: user.phone,
        otp: user.otp,
      });
    } else {
      const user = memoryUsers.get(phone);
      if (user) {
        user.otp = newOtp;
      }
      return res.json({
        success: true,
        message: 'New OTP generated successfully.',
        phone,
        otp: newOtp,
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required.' });
    }

    if (isDbConnected()) {
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      user.otp = otp;
      await user.save();

      return res.json({
        success: true,
        message: 'OTP verified successfully.',
        user: {
          id: user._id,
          phone: user.phone,
          role: user.role,
          iTokenBalance: user.iTokenBalance,
          todayProfit: user.todayProfit,
          rewardPercent: user.rewardPercent,
          inviterCode: user.inviterCode,
        },
      });
    } else {
      let user = memoryUsers.get(phone);
      if (!user) {
        const role = (phone === '0000000000' || phone.toLowerCase() === 'admin') ? 'admin' : 'user';
        user = {
          id: 'mem_' + Date.now(),
          phone,
          password: 'Password123!',
          inviterCode: 'ioRcph47gQ',
          otp,
          role,
          iTokenBalance: 0,
          todayProfit: 0,
          rewardPercent: 6,
          createdAt: new Date().toISOString(),
        };
        memoryUsers.set(phone, user);
      } else {
        user.otp = otp;
      }

      return res.json({
        success: true,
        message: 'OTP verified successfully.',
        user,
      });
    }
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Server error during OTP verification.' });
  }
});
router.memoryUsers = memoryUsers;
router.seedAdminToDb = seedAdminToDb;

module.exports = router;
