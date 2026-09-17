const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DEFAULT_MONGO_URI = 'mongodb://danishali840wj_db_user:jp7yRc7fWyPgIJQ3@ac-26udp0r-shard-00-00.lcwftcr.mongodb.net:27017,ac-26udp0r-shard-00-01.lcwftcr.mongodb.net:27017,ac-26udp0r-shard-00-02.lcwftcr.mongodb.net:27017/oxpay?ssl=true&replicaSet=atlas-z50mpv-shard-0&authSource=admin&appName=Cluster0';
const MONGO_URI = process.env.MONGO_URI || DEFAULT_MONGO_URI;

// Connect to MongoDB Atlas immediately
mongoose
  .connect(MONGO_URI, {
    dbName: 'oxpay',
    serverSelectionTimeoutMS: 15000,
  })
  .then(async () => {
    console.log('Connected to MongoDB Atlas successfully.');
    if (authRoutes && authRoutes.seedAdminToDb) {
      await authRoutes.seedAdminToDb();
    }
  })
  .catch((err) => {
    console.error('MongoDB Atlas Connection Error:', err.message);
  });

mongoose.connection.on('connected', () => {
  console.log('Mongoose event: connected to Atlas MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('Mongoose event error:', err.message);
});

const authRoutes = require(path.join(__dirname, 'routes/authRoutes'));
const adminRoutes = require(path.join(__dirname, 'routes/adminRoutes'));

const app = express();

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

const https = require('https');

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', dbStatus, timestamp: new Date().toISOString(), message: 'OxPay Backend Service Running' });
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  // Self Keep-Alive service to prevent Render free-tier spin-down (Pings every 14 minutes)
  const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || 'https://oxpayback.onrender.com';
  const FOURTEEN_MINUTES = 14 * 60 * 1000;

  setInterval(() => {
    const healthUrl = `${RENDER_EXTERNAL_URL}/api/health`;
    https.get(healthUrl, (res) => {
      console.log(`[Keep-Alive Ping] ${new Date().toLocaleTimeString()} - Self ping to ${healthUrl} responded with status ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`[Keep-Alive Ping Error] ${err.message}`);
    });
  }, FOURTEEN_MINUTES);
});
