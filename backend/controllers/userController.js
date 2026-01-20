const axios = require('axios');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { sql, getConnection } = require('../config/database');

// Cấu hình multer cho upload avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (ext && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh!'));
    }
  }
}).single('avatar');

// Lấy thông tin profile của user hiện tại
exports.getProfile = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id, username, email, avatar, ghostMode, ghostModeUntil, isOnline, lastSeen
        FROM Users 
        WHERE id = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }
    
    const user = result.recordset[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      ghostMode: user.ghostMode,
      ghostModeUntil: user.ghostModeUntil,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    });
  } catch (err) {
    console.error('Lỗi lấy profile:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Lấy danh sách bạn bè
exports.getFriends = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          u.id,
          u.username,
          u.avatar,
          u.latitude,
          u.longitude,
          u.lastUpdate,
          u.ghostMode,
          u.ghostModeUntil,
          u.isOnline,
          u.lastSeen
        FROM Friends f
        INNER JOIN Users u ON f.friendId = u.id
        WHERE f.userId = @userId
      `);
    
    // Format dữ liệu trả về
    const friendsData = result.recordset.map(friend => {
      // Kiểm tra ghost mode còn hiệu lực không
      let isGhostMode = friend.ghostMode;
      if (isGhostMode && friend.ghostModeUntil && new Date(friend.ghostModeUntil) < new Date()) {
        isGhostMode = false;
      }

      return {
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar,
        location: (!isGhostMode && friend.latitude && friend.longitude)
          ? { lat: friend.latitude, lng: friend.longitude }
          : null,
        lastUpdate: friend.lastUpdate,
        isGhostMode,
        isOnline: friend.isOnline,
        lastSeen: friend.lastSeen
      };
    });
    
    res.json(friendsData);
  } catch (err) {
    console.error('Lỗi lấy danh sách bạn bè:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Cập nhật vị trí
exports.updateLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('latitude', sql.Float, lat)
      .input('longitude', sql.Float, lng)
      .input('lastUpdate', sql.DateTime, new Date())
      .query(`
        UPDATE Users 
        SET latitude = @latitude, longitude = @longitude, lastUpdate = @lastUpdate
        WHERE id = @userId
      `);
    
    res.json({ 
      message: 'Cập nhật vị trí thành công',
      location: { lat, lng }
    });
  } catch (err) {
    console.error('Lỗi cập nhật vị trí:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Tính chỉ đường đến bạn bè
exports.getDirections = async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.friendId);
  
  try {
    const pool = await getConnection();
    
    // Lấy vị trí user và friend
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('friendId', sql.Int, friendId)
      .query(`
        SELECT id, latitude, longitude FROM Users WHERE id IN (@userId, @friendId)
      `);
    
    const users = result.recordset;
    const user = users.find(u => u.id === userId);
    const friend = users.find(u => u.id === friendId);
    
    if (!user || !friend) {
      return res.status(404).json({ message: 'Không tìm thấy user hoặc bạn bè' });
    }
    
    if (!user.latitude || !user.longitude || !friend.latitude || !friend.longitude) {
      return res.status(400).json({ 
        message: 'Cả hai phải chia sẻ vị trí mới tính được đường đi' 
      });
    }
    
    // Gọi Google Directions API
    const origin = `${user.latitude},${user.longitude}`;
    const destination = `${friend.latitude},${friend.longitude}`;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;
    
    if (data.status !== 'OK') {
      return res.status(500).json({ 
        message: 'Lỗi từ Google Directions API', 
        details: data.status 
      });
    }
    
    // Lấy thông tin đường đi
    const leg = data.routes[0].legs[0];
    
    res.json({
      duration: leg.duration.text,
      distance: leg.distance.text,
      steps: leg.steps.length
    });
  } catch (err) {
    console.error('Lỗi lấy chỉ đường:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Gửi lời mời kết bạn
exports.sendFriendRequest = async (req, res) => {
  const { friendUsername, receiverId } = req.body;
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    
    let friend;
    
    // Tìm friend theo username hoặc id
    if (receiverId) {
      const findResult = await pool.request()
        .input('receiverId', sql.Int, receiverId)
        .query('SELECT id, username FROM Users WHERE id = @receiverId');
      
      if (findResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng này' });
      }
      friend = findResult.recordset[0];
    } else if (friendUsername) {
      const findResult = await pool.request()
        .input('friendUsername', sql.NVarChar, friendUsername)
        .query('SELECT id, username FROM Users WHERE username = @friendUsername');
      
      if (findResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng này' });
      }
      friend = findResult.recordset[0];
    } else {
      return res.status(400).json({ message: 'Vui lòng cung cấp tên người dùng hoặc ID' });
    }
    
    if (friend.id === userId) {
      return res.status(400).json({ message: 'Không thể kết bạn với chính mình' });
    }
    
    // Kiểm tra đã là bạn chưa
    const checkFriend = await pool.request()
      .input('userId', sql.Int, userId)
      .input('friendId', sql.Int, friend.id)
      .query('SELECT id FROM Friends WHERE userId = @userId AND friendId = @friendId');
    
    if (checkFriend.recordset.length > 0) {
      return res.status(400).json({ message: 'Đã là bạn bè rồi' });
    }
    
    // Kiểm tra đã gửi request chưa
    const checkRequest = await pool.request()
      .input('senderId', sql.Int, userId)
      .input('receiverId', sql.Int, friend.id)
      .query(`SELECT id, status, senderId FROM FriendRequests 
              WHERE (senderId = @senderId AND receiverId = @receiverId)
              OR (senderId = @receiverId AND receiverId = @senderId)`);
    
    if (checkRequest.recordset.length > 0) {
      const existing = checkRequest.recordset[0];
      if (existing.status === 'pending') {
        return res.status(400).json({ message: 'Đã có lời mời kết bạn đang chờ xử lý' });
      }
      
      // Nếu request cũ đã rejected/accepted, update lại thành pending
      await pool.request()
        .input('requestId', sql.Int, existing.id)
        .input('newSenderId', sql.Int, userId)
        .input('newReceiverId', sql.Int, friend.id)
        .query(`UPDATE FriendRequests 
                SET senderId = @newSenderId, receiverId = @newReceiverId, 
                    status = 'pending', createdAt = GETDATE()
                WHERE id = @requestId`);
      
      return res.json({ 
        message: `Đã gửi lời mời kết bạn đến ${friend.username}`,
        receiver: {
          id: friend.id,
          username: friend.username
        }
      });
    }
    
    // Tạo friend request mới
    await pool.request()
      .input('senderId', sql.Int, userId)
      .input('receiverId', sql.Int, friend.id)
      .query(`INSERT INTO FriendRequests (senderId, receiverId, status) 
              VALUES (@senderId, @receiverId, 'pending')`);
    
    res.json({ 
      message: `Đã gửi lời mời kết bạn đến ${friend.username}`,
      receiver: {
        id: friend.id,
        username: friend.username
      }
    });
  } catch (err) {
    console.error('Lỗi gửi lời mời kết bạn:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Lấy danh sách lời mời kết bạn
exports.getFriendRequests = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    
    // Lấy requests nhận được (pending)
    const received = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT fr.id, fr.senderId, fr.createdAt, u.username as senderUsername
              FROM FriendRequests fr
              JOIN Users u ON fr.senderId = u.id
              WHERE fr.receiverId = @userId AND fr.status = 'pending'
              ORDER BY fr.createdAt DESC`);
    
    // Lấy requests đã gửi (pending)
    const sent = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT fr.id, fr.receiverId, fr.createdAt, u.username as receiverUsername
              FROM FriendRequests fr
              JOIN Users u ON fr.receiverId = u.id
              WHERE fr.senderId = @userId AND fr.status = 'pending'
              ORDER BY fr.createdAt DESC`);
    
    res.json({
      received: received.recordset,
      sent: sent.recordset
    });
  } catch (err) {
    console.error('Lỗi lấy lời mời kết bạn:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Chấp nhận lời mời kết bạn
exports.acceptFriendRequest = async (req, res) => {
  const requestId = parseInt(req.params.requestId);
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    
    // Tìm request
    const findRequest = await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('userId', sql.Int, userId)
      .query(`SELECT fr.*, u.username as senderUsername 
              FROM FriendRequests fr
              JOIN Users u ON fr.senderId = u.id
              WHERE fr.id = @requestId AND fr.receiverId = @userId AND fr.status = 'pending'`);
    
    if (findRequest.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
    }
    
    const request = findRequest.recordset[0];
    
    // Transaction: cập nhật request + thêm bạn bè
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Cập nhật status
      const req1 = new sql.Request(transaction);
      await req1
        .input('requestId', sql.Int, requestId)
        .query(`UPDATE FriendRequests SET status = 'accepted', updatedAt = GETDATE() WHERE id = @requestId`);
      
      // Thêm bạn: sender -> receiver
      const req2 = new sql.Request(transaction);
      await req2
        .input('userId1', sql.Int, request.senderId)
        .input('friendId1', sql.Int, userId)
        .query('INSERT INTO Friends (userId, friendId) VALUES (@userId1, @friendId1)');
      
      // Thêm bạn: receiver -> sender
      const req3 = new sql.Request(transaction);
      await req3
        .input('userId2', sql.Int, userId)
        .input('friendId2', sql.Int, request.senderId)
        .query('INSERT INTO Friends (userId, friendId) VALUES (@userId2, @friendId2)');
      
      await transaction.commit();
      
      res.json({ 
        message: `Đã chấp nhận lời mời kết bạn từ ${request.senderUsername}`,
        friend: {
          id: request.senderId,
          username: request.senderUsername
        }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Lỗi chấp nhận lời mời:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Từ chối lời mời kết bạn
exports.rejectFriendRequest = async (req, res) => {
  const requestId = parseInt(req.params.requestId);
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    
    // Tìm và xóa request (có thể là receiver reject hoặc sender cancel)
    const result = await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('userId', sql.Int, userId)
      .query(`DELETE FROM FriendRequests 
              WHERE id = @requestId 
              AND (receiverId = @userId OR senderId = @userId)
              AND status = 'pending'`);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
    }
    
    res.json({ message: 'Đã hủy lời mời kết bạn' });
  } catch (err) {
    console.error('Lỗi từ chối lời mời:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Hủy kết bạn
exports.removeFriend = async (req, res) => {
  const friendId = parseInt(req.params.friendId);
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    
    // Xóa quan hệ bạn bè hai chiều
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      const req1 = new sql.Request(transaction);
      await req1
        .input('userId', sql.Int, userId)
        .input('friendId', sql.Int, friendId)
        .query('DELETE FROM Friends WHERE userId = @userId AND friendId = @friendId');
      
      const req2 = new sql.Request(transaction);
      await req2
        .input('userId2', sql.Int, friendId)
        .input('friendId2', sql.Int, userId)
        .query('DELETE FROM Friends WHERE userId = @userId2 AND friendId = @friendId2');
      
      await transaction.commit();
      
      res.json({ message: 'Đã hủy kết bạn' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Lỗi hủy kết bạn:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Đại học Bách Khoa Hà Nội (Cổng chính - Số 1 Đại Cồ Việt)
const BACH_KHOA_LOCATION = {
  lat: 21.0065,
  lng: 105.8431,
  name: 'Đại học Bách Khoa Hà Nội'
};

// Tính khoảng cách và thời gian với nhiều phương tiện
exports.getDistanceMultiMode = async (req, res) => {
  const { originLat, originLng, destLat, destLng, destName } = req.body;
  
  // Nếu không có destination, dùng Bách Khoa
  const destination = destLat && destLng 
    ? { lat: destLat, lng: destLng, name: destName || 'Điểm đến' }
    : BACH_KHOA_LOCATION;
  
  const origin = `${originLat},${originLng}`;
  const dest = `${destination.lat},${destination.lng}`;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  // Các phương tiện cần tính
  const modes = ['driving', 'walking', 'bicycling', 'transit'];
  const modeNames = {
    driving: 'Ô tô',
    walking: 'Đi bộ',
    bicycling: 'Xe đạp',
    transit: 'Phương tiện công cộng'
  };
  
  try {
    const results = await Promise.all(
      modes.map(async (mode) => {
        try {
          const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=${mode}&key=${apiKey}`;
          const response = await axios.get(url);
          const data = response.data;
          
          if (data.status === 'OK') {
            const leg = data.routes[0].legs[0];
            return {
              mode,
              modeName: modeNames[mode],
              duration: leg.duration.text,
              durationValue: leg.duration.value,
              distance: leg.distance.text,
              distanceValue: leg.distance.value
            };
          }
          return null;
        } catch (err) {
          console.error(`Lỗi tính ${mode}:`, err.message);
          return null;
        }
      })
    );
    
    res.json({
      destination: {
        name: destination.name,
        lat: destination.lat,
        lng: destination.lng
      },
      modes: results.filter(Boolean)
    });
  } catch (err) {
    console.error('Lỗi tính khoảng cách:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==================== SEARCH USERS ====================
exports.searchUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('search', sql.NVarChar, `%${q}%`)
      .query(`
        SELECT TOP 10
          u.id,
          u.username,
          u.avatar,
          CASE 
            WHEN f.id IS NOT NULL THEN 'friend'
            WHEN fr.id IS NOT NULL AND fr.status = 'pending' AND fr.senderId = @userId THEN 'request_sent'
            WHEN fr.id IS NOT NULL AND fr.status = 'pending' AND fr.receiverId = @userId THEN 'request_received'
            ELSE 'none'
          END as friendStatus
        FROM Users u
        LEFT JOIN Friends f ON (f.userId = @userId AND f.friendId = u.id)
        LEFT JOIN FriendRequests fr ON 
          ((fr.senderId = @userId AND fr.receiverId = u.id) OR 
           (fr.senderId = u.id AND fr.receiverId = @userId))
          AND fr.status = 'pending'
        WHERE u.id != @userId AND u.username LIKE @search
        ORDER BY u.username
      `);

    res.json({ users: result.recordset });
  } catch (err) {
    console.error('Lỗi tìm kiếm:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==================== AVATAR ====================
exports.uploadAvatar = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh!' });
    }

    try {
      const userId = req.user.id;
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const pool = await getConnection();
      
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('avatar', sql.NVarChar, avatarUrl)
        .query('UPDATE Users SET avatar = @avatar WHERE id = @userId');

      res.json({ avatar: avatarUrl });
    } catch (error) {
      console.error('Lỗi upload avatar:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  });
};

exports.getAvatar = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT avatar FROM Users WHERE id = @userId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    res.json({ avatar: result.recordset[0].avatar });
  } catch (err) {
    console.error('Lỗi lấy avatar:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==================== GHOST MODE ====================
exports.setGhostMode = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled, duration } = req.body; // duration: '1h', '8h', '24h', 'forever'

    let ghostModeUntil = null;
    
    if (enabled && duration !== 'forever') {
      const hours = parseInt(duration);
      if (!isNaN(hours)) {
        ghostModeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      }
    }

    const pool = await getConnection();
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('ghostMode', sql.Bit, enabled ? 1 : 0)
      .input('ghostModeUntil', sql.DateTime, ghostModeUntil)
      .query(`
        UPDATE Users 
        SET ghostMode = @ghostMode, ghostModeUntil = @ghostModeUntil 
        WHERE id = @userId
      `);

    res.json({ 
      success: true,
      ghostMode: enabled,
      ghostModeUntil
    });
  } catch (err) {
    console.error('Lỗi đặt ghost mode:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getGhostModeStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT ghostMode, ghostModeUntil FROM Users WHERE id = @userId');

    const user = result.recordset[0];
    let isGhostMode = user?.ghostMode;

    // Kiểm tra xem đã hết hạn chưa
    if (isGhostMode && user.ghostModeUntil && new Date(user.ghostModeUntil) < new Date()) {
      // Tắt ghost mode nếu hết hạn
      await pool.request()
        .input('userId', sql.Int, userId)
        .query('UPDATE Users SET ghostMode = 0, ghostModeUntil = NULL WHERE id = @userId');
      isGhostMode = false;
    }

    res.json({ 
      ghostMode: isGhostMode,
      ghostModeUntil: user?.ghostModeUntil
    });
  } catch (err) {
    console.error('Lỗi lấy ghost mode:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==================== PARENTAL MODE ====================
exports.sendParentalRequest = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childUsername } = req.body;

    const pool = await getConnection();
    
    // Tìm child theo username
    const childResult = await pool.request()
      .input('username', sql.NVarChar, childUsername)
      .query('SELECT id FROM Users WHERE username = @username');

    if (childResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    const childId = childResult.recordset[0].id;

    if (childId === parentId) {
      return res.status(400).json({ message: 'Không thể tự thêm mình' });
    }

    // Kiểm tra đã có link chưa
    const existingLink = await pool.request()
      .input('parentId', sql.Int, parentId)
      .input('childId', sql.Int, childId)
      .query('SELECT id FROM ParentalLinks WHERE parentId = @parentId AND childId = @childId');

    if (existingLink.recordset.length > 0) {
      return res.status(400).json({ message: 'Đã gửi yêu cầu hoặc đã liên kết' });
    }

    // Tạo yêu cầu
    await pool.request()
      .input('parentId', sql.Int, parentId)
      .input('childId', sql.Int, childId)
      .query('INSERT INTO ParentalLinks (parentId, childId) VALUES (@parentId, @childId)');

    // Đánh dấu user là parent
    await pool.request()
      .input('parentId', sql.Int, parentId)
      .query('UPDATE Users SET isParent = 1 WHERE id = @parentId');

    res.json({ success: true, message: 'Đã gửi yêu cầu phụ huynh' });
  } catch (err) {
    console.error('Lỗi gửi yêu cầu phụ huynh:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getChildren = async (req, res) => {
  try {
    const parentId = req.user.id;

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('parentId', sql.Int, parentId)
      .query(`
        SELECT 
          u.id,
          u.username,
          u.avatar,
          u.latitude,
          u.longitude,
          u.lastUpdate,
          u.isOnline,
          u.lastSeen,
          pl.status
        FROM ParentalLinks pl
        INNER JOIN Users u ON pl.childId = u.id
        WHERE pl.parentId = @parentId AND pl.status = 'accepted'
      `);

    const children = result.recordset.map(child => ({
      id: child.id,
      username: child.username,
      avatar: child.avatar,
      location: child.latitude && child.longitude
        ? { lat: child.latitude, lng: child.longitude }
        : null,
      lastUpdate: child.lastUpdate,
      isOnline: child.isOnline,
      lastSeen: child.lastSeen
    }));

    res.json({ children });
  } catch (err) {
    console.error('Lỗi lấy danh sách con:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getParentalRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          pl.id,
          pl.createdAt,
          u.id as parentId,
          u.username as parentUsername,
          u.avatar as parentAvatar
        FROM ParentalLinks pl
        INNER JOIN Users u ON pl.parentId = u.id
        WHERE pl.childId = @userId AND pl.status = 'pending'
      `);

    res.json({ requests: result.recordset });
  } catch (err) {
    console.error('Lỗi lấy yêu cầu phụ huynh:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.acceptParentalRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;

    const pool = await getConnection();
    
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE ParentalLinks 
        SET status = 'accepted' 
        WHERE id = @requestId AND childId = @userId
      `);

    // Cập nhật parentId cho child
    const linkResult = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query('SELECT parentId FROM ParentalLinks WHERE id = @requestId');

    if (linkResult.recordset.length > 0) {
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('parentId', sql.Int, linkResult.recordset[0].parentId)
        .query('UPDATE Users SET parentId = @parentId WHERE id = @userId');
    }

    res.json({ success: true, message: 'Đã chấp nhận yêu cầu' });
  } catch (err) {
    console.error('Lỗi chấp nhận yêu cầu:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.rejectParentalRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;

    const pool = await getConnection();
    
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE ParentalLinks 
        SET status = 'rejected' 
        WHERE id = @requestId AND childId = @userId
      `);

    res.json({ success: true, message: 'Đã từ chối yêu cầu' });
  } catch (err) {
    console.error('Lỗi từ chối yêu cầu:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==================== SOS ====================
exports.sendSOS = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lat, lng, message } = req.body;

    const pool = await getConnection();
    
    // Lưu SOS alert
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('lat', sql.Float, lat)
      .input('lng', sql.Float, lng)
      .input('message', sql.NVarChar, message || 'Tôi cần giúp đỡ!')
      .query(`
        INSERT INTO SOSAlerts (userId, latitude, longitude, message)
        OUTPUT INSERTED.id
        VALUES (@userId, @lat, @lng, @message)
      `);

    const sosId = result.recordset[0].id;

    // Lấy thông tin user
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT username FROM Users WHERE id = @userId');
    const username = userResult.recordset[0]?.username;

    // Lấy danh sách bạn bè + phụ huynh
    const contactsResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT DISTINCT u.id FROM Users u
        LEFT JOIN Friends f ON (f.friendId = u.id AND f.userId = @userId) OR (f.userId = u.id AND f.friendId = @userId)
        LEFT JOIN ParentalLinks pl ON pl.parentId = u.id AND pl.childId = @userId AND pl.status = 'accepted'
        WHERE u.id != @userId AND (f.id IS NOT NULL OR pl.id IS NOT NULL)
      `);

    // Tạo notification cho tất cả
    for (const contact of contactsResult.recordset) {
      await pool.request()
        .input('userId', sql.Int, contact.id)
        .input('type', sql.NVarChar, 'sos')
        .input('title', sql.NVarChar, '🆘 SOS Khẩn cấp!')
        .input('message', sql.NVarChar, `${username} cần giúp đỡ! ${message || ''}`)
        .input('relatedUserId', sql.Int, userId)
        .query(`
          INSERT INTO Notifications (userId, type, title, message, relatedUserId)
          VALUES (@userId, @type, @title, @message, @relatedUserId)
        `);
    }

    const notifiedCount = contactsResult.recordset.length;
    console.log(`📢 SOS sent by ${username}, notified ${notifiedCount} friends`);

    res.json({ success: true, sosId, notifiedFriends: notifiedCount });
  } catch (err) {
    console.error('Lỗi gửi SOS:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.resolveSOS = async (req, res) => {
  try {
    const userId = req.user.id;
    const sosId = req.params.id;

    const pool = await getConnection();
    
    await pool.request()
      .input('sosId', sql.Int, sosId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE SOSAlerts 
        SET isActive = 0, resolvedAt = GETDATE() 
        WHERE id = @sosId AND userId = @userId
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi hủy SOS:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getActiveSOS = async (req, res) => {
  try {
    const userId = req.user.id;

    const pool = await getConnection();
    
    // Lấy SOS của bạn bè
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          s.id,
          s.userId,
          s.latitude,
          s.longitude,
          s.message,
          s.createdAt,
          u.username,
          u.avatar
        FROM SOSAlerts s
        INNER JOIN Users u ON s.userId = u.id
        INNER JOIN Friends f ON (f.friendId = s.userId AND f.userId = @userId) OR (f.userId = s.userId AND f.friendId = @userId)
        WHERE s.isActive = 1
        ORDER BY s.createdAt DESC
      `);

    res.json({ alerts: result.recordset });
  } catch (err) {
    console.error('Lỗi lấy SOS:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};