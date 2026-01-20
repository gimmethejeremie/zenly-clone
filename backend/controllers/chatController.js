const { sql, getConnection } = require('../config/database');

// Lấy tin nhắn với một người bạn
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    console.log(`📨 Get messages: userId=${userId}, friendId=${friendId}`);

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('friendId', sql.Int, friendId)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT 
          m.id,
          m.senderId,
          m.receiverId,
          m.message,
          m.isRead,
          m.createdAt,
          sender.username as senderName,
          sender.avatar as senderAvatar
        FROM Messages m
        INNER JOIN Users sender ON m.senderId = sender.id
        WHERE (m.senderId = @userId AND m.receiverId = @friendId)
           OR (m.senderId = @friendId AND m.receiverId = @userId)
        ORDER BY m.createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    // Đảo ngược để tin mới nhất ở cuối
    const messages = result.recordset.reverse();
    
    console.log(`📨 Found ${messages.length} messages`);

    res.json({ messages });
  } catch (error) {
    console.error('Lỗi lấy tin nhắn:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Đánh dấu đã đọc tin nhắn từ một người
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId);

    const pool = await getConnection();
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('friendId', sql.Int, friendId)
      .query(`
        UPDATE Messages 
        SET isRead = 1 
        WHERE senderId = @friendId AND receiverId = @userId AND isRead = 0
      `);

    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi đánh dấu đã đọc:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Đếm tin nhắn chưa đọc
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          senderId,
          COUNT(*) as unreadCount
        FROM Messages 
        WHERE receiverId = @userId AND isRead = 0
        GROUP BY senderId
      `);

    // Tổng số tin chưa đọc
    const totalUnread = result.recordset.reduce((sum, r) => sum + r.unreadCount, 0);

    res.json({ 
      totalUnread,
      byUser: result.recordset 
    });
  } catch (error) {
    console.error('Lỗi đếm tin nhắn:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
