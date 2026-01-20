const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Lấy token từ header
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1]; // Bearer <token>
  
  if (!token) {
    return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Thêm thông tin user vào request
    next();
  } catch (err) {
    res.status(403).json({ message: 'Token không hợp lệ' });
  }
};