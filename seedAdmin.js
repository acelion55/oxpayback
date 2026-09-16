const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully to MongoDB Atlas.');

    const adminPhone = '0000000000';
    let admin = await User.findOne({ phone: adminPhone });

    if (admin) {
      admin.role = 'admin';
      admin.password = '8899';
      admin.otp = '8899';
      await admin.save();
      console.log('Admin user updated in DB:', admin);
    } else {
      admin = new User({
        phone: adminPhone,
        password: '8899',
        inviterCode: 'ADMIN8888',
        otp: '8899',
        role: 'admin',
        iTokenBalance: 0,
        todayProfit: 0,
        rewardPercent: 6,
      });
      await admin.save();
      console.log('New Admin user inserted into DB:', admin);
    }

    console.log('SUCCESS: Admin role user inserted into database.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin role to DB:', err);
    process.exit(1);
  }
};

seedAdmin();
