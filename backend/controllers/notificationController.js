const { sql, getConnection } = require('../config/database');

// Lấy danh sách thông báo
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT 
          n.id,
          n.type,
          n.title,
          n.message,
          n.isRead,
          n.createdAt,
          n.relatedUserId,
          u.username as relatedUsername,
          u.avatar as relatedUserAvatar
        FROM Notifications n
        LEFT JOIN Users u ON n.relatedUserId = u.id
        WHERE n.userId = @userId
        ORDER BY n.createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    res.json({ notifications: result.recordset });
  } catch (error) {
    console.error('Lỗi lấy thông báo:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Đánh dấu một thông báo đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const pool = await getConnection();
    
    await pool.request()
      .input('id', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE Notifications 
        SET isRead = 1 
        WHERE id = @id AND userId = @userId
      `);

    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi đánh dấu đã đọc:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Đánh dấu tất cả đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const pool = await getConnection();
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE Notifications 
        SET isRead = 1 
        WHERE userId = @userId AND isRead = 0
      `);

    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi đánh dấu tất cả đã đọc:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Đếm thông báo chưa đọc
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT COUNT(*) as count
        FROM Notifications 
        WHERE userId = @userId AND isRead = 0
      `);

    res.json({ count: result.recordset[0].count });
  } catch (error) {
    console.error('Lỗi đếm thông báo:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Tạo thông báo mới (helper function cho các controller khác)
exports.createNotification = async (userId, type, title, message, relatedUserId = null) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('type', sql.NVarChar, type)
      .input('title', sql.NVarChar, title)
      .input('message', sql.NVarChar, message)
      .input('relatedUserId', sql.Int, relatedUserId)
      .query(`
        INSERT INTO Notifications (userId, type, title, message, relatedUserId)
        OUTPUT INSERTED.*
        VALUES (@userId, @type, @title, @message, @relatedUserId)
      `);

    return result.recordset[0];
  } catch (error) {
    console.error('Lỗi tạo thông báo:', error);
    throw error;
  }
};
