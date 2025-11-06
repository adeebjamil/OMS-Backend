// Helper script to create sample notifications for testing
const Notification = require('./models/Notification');
const User = require('./models/User');
const connectDB = require('./config/db');
require('dotenv').config();

async function createSampleNotifications() {
  try {
    await connectDB();

    // Get all users
    const users = await User.find();
    if (users.length === 0) {
      console.log('No users found!');
      return;
    }

    const notifications = [];

    // Create notifications for each user
    for (const user of users) {
      // Task notification
      notifications.push({
        userId: user._id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned a new task: Complete project documentation',
        link: '/dashboard/tasks',
        priority: 'high',
        isRead: false
      });

      // Message notification
      notifications.push({
        userId: user._id,
        type: 'message_received',
        title: 'New Message',
        message: 'You have received a new message from Admin',
        link: '/dashboard/messages',
        priority: 'normal',
        isRead: false
      });

      // Document notification
      notifications.push({
        userId: user._id,
        type: 'document_shared',
        title: 'Document Shared',
        message: 'A new document "Company Policy 2025" has been shared with you',
        link: '/dashboard/documents',
        priority: 'normal',
        isRead: false
      });

      // Evaluation notification (for interns)
      if (user.role === 'intern') {
        notifications.push({
          userId: user._id,
          type: 'evaluation_created',
          title: 'New Evaluation',
          message: 'Your weekly evaluation has been completed',
          link: '/dashboard/evaluations',
          priority: 'high',
          isRead: false
        });
      }

      // Attendance reminder
      notifications.push({
        userId: user._id,
        type: 'attendance_reminder',
        title: 'Attendance Reminder',
        message: 'Don\'t forget to check in for today',
        link: '/dashboard/attendance',
        priority: 'normal',
        isRead: true
      });

      // System notification
      notifications.push({
        userId: user._id,
        type: 'system',
        title: 'Welcome to OfficePro',
        message: 'Your account has been successfully set up',
        priority: 'low',
        isRead: true
      });
    }

    // Insert all notifications
    await Notification.insertMany(notifications);

    console.log(`✅ Created ${notifications.length} sample notifications for ${users.length} users`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createSampleNotifications();
