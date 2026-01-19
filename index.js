require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { supabase } = require('./config/supabase');
const errorHandler = require('./middleware/error');

// Import Supabase routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const taskRoutes = require('./routes/taskRoutes');
const workLogRoutes = require('./routes/workLogRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const documentRoutes = require('./routes/documentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Initialize express app
const app = express();

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Connected to Supabase PostgreSQL');
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
  }
}
testSupabaseConnection();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'https://oms-frontend-beta.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/worklogs', workLogRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🎓 Office Management System API',
    version: '2.0.0',
    database: 'Supabase PostgreSQL',
    storage: 'Supabase S3',
    status: 'Running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      attendance: '/api/attendance',
      tasks: '/api/tasks',
      workLogs: '/api/worklogs',
      evaluations: '/api/evaluations',
      messages: '/api/messages',
      announcements: '/api/announcements',
      documents: '/api/documents',
      dashboard: '/api/dashboard',
      notifications: '/api/notifications'
    }
  });
});

// Error handler (must be after routes)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`🚀 API available at http://localhost:${PORT}`);
  console.log(`📦 Database: Supabase PostgreSQL`);
  console.log(`🗄️  Storage: Supabase S3 Bucket`);
});