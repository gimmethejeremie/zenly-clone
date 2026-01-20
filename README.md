# FindUrPal - Zenly Clone

Ứng dụng chia sẻ vị trí thời gian thực với bạn bè, được xây dựng bằng React.js và Node.js.

## 🌟 Tính năng

- 📍 **Chia sẻ vị trí realtime** - Xem vị trí bạn bè trên bản đồ
- 🗺️ **Chỉ đường đa phương tiện** - Ô tô, xe máy, xe đạp, đi bộ
- 💬 **Chat realtime** - Nhắn tin với bạn bè
- 🆘 **SOS khẩn cấp** - Gửi cảnh báo đến tất cả bạn bè
- 👻 **Ghost Mode** - Ẩn vị trí khi cần riêng tư
- 👨‍👩‍👧 **Parental Mode** - Phụ huynh theo dõi vị trí con
- 🔔 **Thông báo đẩy** - Nhận thông báo realtime
- 🔐 **Bảo mật** - JWT authentication, Google OAuth

## 🛠️ Công nghệ

### Frontend
- React.js 18
- Google Maps API
- Socket.io Client
- Lucide React Icons

### Backend
- Node.js + Express.js
- Socket.io
- Microsoft SQL Server
- JWT + Bcrypt
- Passport (Google OAuth)

## 📦 Cài đặt

### Yêu cầu
- Node.js 18+
- SQL Server 2019+
- Google Maps API Key

### 1. Clone repository
```bash
git clone https://github.com/YOUR_USERNAME/zenly-clone.git
cd zenly-clone
```

### 2. Cài đặt Database
- Mở SQL Server Management Studio
- Chạy file `backend/setup_database.sql`
- Chạy file `backend/scripts/update_schema.sql`

### 3. Cấu hình Backend
```bash
cd backend
npm install
```

Tạo file `.env`:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
DB_USER=sa
DB_PASSWORD=your_password
DB_SERVER=localhost
DB_NAME=ZenlyClone
JWT_SECRET=your_jwt_secret
GOOGLE_MAPS_API_KEY=your_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 4. Cấu hình Frontend
```bash
cd frontend
npm install
```

Tạo file `.env`:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key
```

### 5. Chạy ứng dụng

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm start
```

Truy cập: http://localhost:3000

## 📁 Cấu trúc dự án

```
zenly-clone/
├── backend/
│   ├── config/           # Cấu hình database
│   ├── controllers/      # Xử lý logic
│   ├── middleware/       # JWT auth
│   ├── scripts/          # SQL scripts
│   ├── uploads/          # Avatar storage
│   └── server.js         # Entry point
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/   # React components
│       ├── contexts/     # Socket context
│       ├── App.js
│       └── index.js
│
└── README.md
```

## 🔑 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /auth/register | Đăng ký |
| POST | /auth/login | Đăng nhập |
| POST | /auth/google | Google OAuth |
| GET | /friends | Danh sách bạn bè |
| POST | /friends/request | Gửi lời mời |
| POST | /location | Cập nhật vị trí |
| GET | /chat/:friendId | Lấy tin nhắn |
| POST | /sos | Gửi SOS |

## 📱 Screenshots

*Thêm screenshots ứng dụng tại đây*

## 👥 Tác giả

- [Your Name](https://github.com/YOUR_USERNAME)

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.
