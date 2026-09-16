const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Disable Mongoose command buffering so queries fail/fallback immediately instead of timing out after 10s
mongoose.set('bufferCommands', false);

// Middleware - Enable CORS for frontend deployment (https://oxpay-weld.vercel.app)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', dbStatus, message: 'OxPay Backend Service Running' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB Atlas with connection options
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => {
      console.log('Connected to MongoDB Atlas successfully.');
    })
    .catch((err) => {
      console.error('MongoDB Atlas Connection Error:', err.message);
      console.log('Running in memory-fallback mode.');
    });
} else {
  console.log('No MONGO_URI provided. Running in memory-fallback mode.');
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
