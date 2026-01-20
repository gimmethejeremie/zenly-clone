const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const authMiddleware = require('./middleware/auth');
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const chatController = require('./controllers/chatController');
const notificationController = require('./controllers/notificationController');
const { getConnection } = require('./config/database');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Lưu trữ socket connections theo userId
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  // User join với userId
  socket.on('join', (userId) => {
    userSockets.set(userId.toString(), socket.id);
    socket.userId = userId.toString();
    console.log(`👤 User ${userId} joined with socket ${socket.id}`);
  });

  // Gửi tin nhắn
  socket.on('sendMessage', async (data) => {
    const { senderId, receiverId, message } = data;
    
    // Lưu vào database
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('senderId', senderId)
        .input('receiverId', receiverId)
        .input('message', message)
        .query(`
          INSERT INTO Messages (senderId, receiverId, message) 
          OUTPUT INSERTED.id, INSERTED.createdAt
          VALUES (@senderId, @receiverId, @message)
        `);
      
      const messageData = {
        id: result.recordset[0].id,
        senderId,
        receiverId,
        message,
        createdAt: result.recordset[0].createdAt
      };

      // Gửi đến người nhận nếu online
      const receiverSocketId = userSockets.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newMessage', messageData);
      }

      // Xác nhận cho người gửi
      socket.emit('messageSent', messageData);
    } catch (err) {
      console.error('Error saving message:', err);
      socket.emit('messageError', { error: 'Không thể gửi tin nhắn' });
    }
  });

  // Cập nhật vị trí realtime
  socket.on('updateLocation', async (data) => {
    const { userId, lat, lng } = data;
    
    try {
      const pool = await getConnection();
      
      // Kiểm tra xem user có đang bật ghost mode không
      const userResult = await pool.request()
        .input('userId', userId)
        .query('SELECT ghostMode, ghostModeUntil FROM Users WHERE id = @userId');
      
      const user = userResult.recordset[0];
      let isGhostMode = user?.ghostMode;
      
      // Kiểm tra xem ghost mode đã hết hạn chưa
      if (isGhostMode && user.ghostModeUntil && new Date(user.ghostModeUntil) < new Date()) {
        // Tắt ghost mode nếu hết hạn
        await pool.request()
          .input('userId', userId)
          .query('UPDATE Users SET ghostMode = 0, ghostModeUntil = NULL WHERE id = @userId');
        isGhostMode = false;
      }

      // Cập nhật vị trí
      await pool.request()
        .input('userId', userId)
        .input('lat', lat)
        .input('lng', lng)
        .query('UPDATE Users SET latitude = @lat, longitude = @lng, lastUpdate = GETDATE() WHERE id = @userId');
      
      // Nếu không ở ghost mode, broadcast cho bạn bè
      if (!isGhostMode) {
        // Lấy danh sách bạn bè
        const friendsResult = await pool.request()
          .input('userId', userId)
          .query(`
            SELECT u.id FROM Users u
            INNER JOIN Friends f ON (f.friendId = u.id AND f.userId = @userId)
            OR (f.userId = u.id AND f.friendId = @userId)
            WHERE u.id != @userId
          `);
        
        // Gửi vị trí đến bạn bè online
        friendsResult.recordset.forEach(friend => {
          const friendSocketId = userSockets.get(friend.id.toString());
          if (friendSocketId) {
            io.to(friendSocketId).emit('friendLocationUpdate', {
              friendId: userId,
              lat,
              lng
            });
          }
        });
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  });

  // SOS Alert
  socket.on('sendSOS', async (data) => {
    const { userId, lat, lng, message } = data;
    
    try {
      const pool = await getConnection();
      
      // Lưu SOS alert
      await pool.request()
        .input('userId', userId)
        .input('lat', lat)
        .input('lng', lng)
        .input('message', message || 'Tôi cần giúp đỡ!')
        .query(`
          INSERT INTO SOSAlerts (userId, latitude, longitude, message)
          VALUES (@userId, @lat, @lng, @message)
        `);

      // Lấy thông tin user
      const userResult = await pool.request()
        .input('userId', userId)
        .query('SELECT username FROM Users WHERE id = @userId');
      const username = userResult.recordset[0]?.username;

      // Lấy danh sách bạn bè
      const friendsResult = await pool.request()
        .input('userId', userId)
        .query(`
          SELECT DISTINCT u.id FROM Users u
          INNER JOIN Friends f ON (f.friendId = u.id AND f.userId = @userId)
          OR (f.userId = u.id AND f.friendId = @userId)
          WHERE u.id != @userId
        `);

      // Tạo notification và gửi cho tất cả bạn bè
      for (const friend of friendsResult.recordset) {
        // Lưu notification
        await pool.request()
          .input('userId', friend.id)
          .input('type', 'sos')
          .input('title', '🆘 SOS Khẩn cấp!')
          .input('message', `${username} cần giúp đỡ! ${message || ''}`)
          .input('relatedUserId', userId)
          .query(`
            INSERT INTO Notifications (userId, type, title, message, relatedUserId)
            VALUES (@userId, @type, @title, @message, @relatedUserId)
          `);

        // Gửi realtime nếu online
        const friendSocketId = userSockets.get(friend.id.toString());
        if (friendSocketId) {
          io.to(friendSocketId).emit('sosAlert', {
            fromUserId: userId,
            fromUsername: username,
            lat,
            lng,
            message: message || 'Tôi cần giúp đỡ!',
            timestamp: new Date()
          });
        }
      }

      socket.emit('sosSent', { success: true });
    } catch (err) {
      console.error('Error sending SOS:', err);
      socket.emit('sosError', { error: 'Không thể gửi SOS' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      console.log(`👤 User ${socket.userId} disconnected`);
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Export io cho các controller sử dụng
app.set('io', io);
app.set('userSockets', userSockets);

// Routes Auth (không cần JWT)
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.post('/auth/google', authController.googleCallback);
app.post('/auth/forgot-password', authController.forgotPassword);
app.post('/auth/reset-password', authController.resetPassword);
app.get('/auth/verify-reset-token', authController.verifyResetToken);

// Routes protected (cần JWT)
app.get('/friends', authMiddleware, userController.getFriends);
app.post('/location', authMiddleware, userController.updateLocation);
app.get('/directions/:friendId', authMiddleware, userController.getDirections);
app.post('/distance', authMiddleware, userController.getDistanceMultiMode);

// Friend Requests
app.post('/friends/request', authMiddleware, userController.sendFriendRequest);
app.get('/friends/requests', authMiddleware, userController.getFriendRequests);
app.post('/friends/accept/:requestId', authMiddleware, userController.acceptFriendRequest);
app.post('/friends/reject/:requestId', authMiddleware, userController.rejectFriendRequest);
app.delete('/friends/:friendId', authMiddleware, userController.removeFriend);

// Search Users (cho thanh tìm kiếm)
app.get('/users/search', authMiddleware, userController.searchUsers);

// Profile
app.get('/users/profile', authMiddleware, userController.getProfile);

// Avatar
app.post('/users/avatar', authMiddleware, userController.uploadAvatar);
app.get('/users/:userId/avatar', userController.getAvatar);

// Ghost Mode
app.post('/users/ghost-mode', authMiddleware, userController.setGhostMode);
app.get('/users/ghost-mode', authMiddleware, userController.getGhostModeStatus);

// Parental Mode
app.post('/parental/request', authMiddleware, userController.sendParentalRequest);
app.get('/parental/children', authMiddleware, userController.getChildren);
app.get('/parental/requests', authMiddleware, userController.getParentalRequests);
app.post('/parental/accept/:requestId', authMiddleware, userController.acceptParentalRequest);
app.post('/parental/reject/:requestId', authMiddleware, userController.rejectParentalRequest);

// Chat
app.get('/chat/:friendId', authMiddleware, chatController.getMessages);
app.get('/chat/unread/count', authMiddleware, chatController.getUnreadCount);
app.post('/chat/read/:friendId', authMiddleware, chatController.markAsRead);

// Notifications
app.get('/notifications', authMiddleware, notificationController.getNotifications);
app.post('/notifications/read/:id', authMiddleware, notificationController.markAsRead);
app.post('/notifications/read-all', authMiddleware, notificationController.markAllAsRead);
app.get('/notifications/unread/count', authMiddleware, notificationController.getUnreadCount);

// SOS
app.post('/sos', authMiddleware, userController.sendSOS);
app.post('/sos/resolve/:id', authMiddleware, userController.resolveSOS);
app.get('/sos/active', authMiddleware, userController.getActiveSOS);

const PORT = process.env.PORT || 3001;

// Kết nối database trước khi start server
getConnection()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
      console.log(`🔌 Socket.io đang lắng nghe...`);
    });
  })
  .catch(err => {
    console.error('❌ Không thể kết nối database:', err);
    process.exit(1);
  });