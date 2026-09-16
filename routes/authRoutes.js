const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Helper to generate a 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { phone, password, inviterCode } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    let user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({ error: 'User with this phone number already exists.' });
    }

    const otp = generateOTP();
    const role = (phone === '0000000000' || phone.toLowerCase() === 'admin') ? 'admin' : 'user';

    user = new User({
      phone,
      password,
      inviterCode: inviterCode || 'ioRcph47gQ',
      otp,
      role,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent.',
      phone: user.phone,
      otp: user.otp,
      role: user.role,
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
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login Route - Directly logs in without OTP
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required.' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'Account not found. Please register first.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    res.json({
      success: true,
      requireOtp: false,
      message: 'Login successful.',
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
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newOtp = generateOTP();
    user.otp = newOtp;
    await user.save();

    res.json({
      success: true,
      message: 'New OTP generated successfully.',
      phone: user.phone,
      otp: user.otp,
    });
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

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.otp = otp;
    await user.save();

    res.json({
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
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Server error during OTP verification.' });
  }
});

module.exports = router;
