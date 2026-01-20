const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { sql, getConnection } = require('../config/database');

// Cấu hình nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Đăng ký
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    const pool = await getConnection();
    
    // Kiểm tra user đã tồn tại
    const checkResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email || '')
      .query('SELECT id FROM Users WHERE username = @username OR (email = @email AND @email != \'\')');
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ message: 'Tên đăng nhập hoặc email đã tồn tại' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Tạo user mới
    const insertResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email || null)
      .input('password', sql.NVarChar, hashedPassword)
      .query(`
        INSERT INTO Users (username, email, password) 
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.email
        VALUES (@username, @email, @password)
      `);
    
    const newUser = insertResult.recordset[0];
    
    res.status(201).json({ 
      message: 'Đăng ký thành công',
      user: { id: newUser.id, username: newUser.username, email: newUser.email }
    });
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const pool = await getConnection();
    
    // Tìm user theo username hoặc email
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT id, username, email, password FROM Users WHERE username = @username OR email = @username');
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    
    const user = result.recordset[0];
    
    // So sánh password (hỗ trợ cả password cũ chưa hash và mới đã hash)
    let isValidPassword = false;
    if (user.password.startsWith('$2')) {
      // Password đã được hash bằng bcrypt
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Password cũ chưa hash (plain text)
      isValidPassword = user.password === password;
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    
    // Tạo JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      userId: user.id, 
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Google OAuth - Xử lý callback từ Google
exports.googleCallback = async (req, res) => {
  try {
    const { credential } = req.body;
    
    // Decode Google ID token
    const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
    
    const { sub: googleId, email, name, picture } = payload;
    
    const pool = await getConnection();
    
    // Tìm user theo googleId hoặc email
    let result = await pool.request()
      .input('googleId', sql.NVarChar, googleId)
      .input('email', sql.NVarChar, email)
      .query('SELECT id, username, email, googleId FROM Users WHERE googleId = @googleId OR email = @email');
    
    let user;
    
    if (result.recordset.length === 0) {
      // Tạo user mới
      const username = name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now().toString().slice(-4);
      
      const insertResult = await pool.request()
        .input('username', sql.NVarChar, username)
        .input('email', sql.NVarChar, email)
        .input('googleId', sql.NVarChar, googleId)
        .input('password', sql.NVarChar, await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10))
        .query(`
          INSERT INTO Users (username, email, googleId, password) 
          OUTPUT INSERTED.id, INSERTED.username, INSERTED.email
          VALUES (@username, @email, @googleId, @password)
        `);
      
      user = insertResult.recordset[0];
    } else {
      user = result.recordset[0];
      
      // Cập nhật googleId nếu chưa có
      if (!user.googleId) {
        await pool.request()
          .input('userId', sql.Int, user.id)
          .input('googleId', sql.NVarChar, googleId)
          .query('UPDATE Users SET googleId = @googleId WHERE id = @userId');
      }
    }
    
    // Tạo JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      userId: user.id, 
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error('Lỗi Google login:', err);
    res.status(500).json({ message: 'Lỗi đăng nhập Google', error: err.message });
  }
};

// Quên mật khẩu - Gửi email
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  try {
    const pool = await getConnection();
    
    // Tìm user theo email
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, username, email FROM Users WHERE email = @email');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }
    
    const user = result.recordset[0];
    
    // Tạo reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 giờ
    
    // Lưu token vào database
    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('resetToken', sql.NVarChar, resetToken)
      .input('resetExpires', sql.DateTime, resetExpires)
      .query('UPDATE Users SET resetPasswordToken = @resetToken, resetPasswordExpires = @resetExpires WHERE id = @userId');
    
    // Tạo link reset password
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    // Gửi email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🔐 FindUrPal - Đặt lại mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FindUrPal</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2>Xin chào ${user.username}!</h2>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào nút bên dưới để tiếp tục:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Đặt lại mật khẩu</a>
            </div>
            <p style="color: #666; font-size: 14px;">Link này sẽ hết hạn sau 1 giờ.</p>
            <p style="color: #666; font-size: 14px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'Email đặt lại mật khẩu đã được gửi' });
  } catch (err) {
    console.error('Lỗi quên mật khẩu:', err);
    res.status(500).json({ message: 'Lỗi gửi email', error: err.message });
  }
};

// Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  
  try {
    const pool = await getConnection();
    
    // Tìm user theo token và kiểm tra hạn
    const result = await pool.request()
      .input('token', sql.NVarChar, token)
      .query('SELECT id, username FROM Users WHERE resetPasswordToken = @token AND resetPasswordExpires > GETDATE()');
    
    if (result.recordset.length === 0) {
      return res.status(400).json({ message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });
    }
    
    const user = result.recordset[0];
    
    // Hash password mới
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Cập nhật password và xóa token
    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('password', sql.NVarChar, hashedPassword)
      .query('UPDATE Users SET password = @password, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = @userId');
    
    res.json({ message: 'Mật khẩu đã được đặt lại thành công' });
  } catch (err) {
    console.error('Lỗi đặt lại mật khẩu:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Kiểm tra token reset password có hợp lệ không
exports.verifyResetToken = async (req, res) => {
  const { token } = req.query;
  
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('token', sql.NVarChar, token)
      .query('SELECT id FROM Users WHERE resetPasswordToken = @token AND resetPasswordExpires > GETDATE()');
    
    if (result.recordset.length === 0) {
      return res.status(400).json({ valid: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
    
    res.json({ valid: true });
  } catch (err) {
    console.error('Lỗi kiểm tra token:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};