-- =============================================
-- Script tạo Database cho Zenly Clone
-- Chạy script này trong SSMS
-- =============================================

-- Tạo database
CREATE DATABASE ZenlyClone;
GO

USE ZenlyClone;
GO

-- Bảng Users
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    latitude FLOAT NULL,
    longitude FLOAT NULL,
    lastUpdate DATETIME NULL,
    createdAt DATETIME DEFAULT GETDATE()
);

-- Bảng Friends (quan hệ nhiều-nhiều)
CREATE TABLE Friends (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    friendId INT NOT NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id),
    FOREIGN KEY (friendId) REFERENCES Users(id),
    UNIQUE(userId, friendId)
);

-- Thêm users demo
INSERT INTO Users (username, password, latitude, longitude, lastUpdate)
VALUES 
    ('alice', 'pass1', NULL, NULL, NULL),
    ('bob', 'pass2', 10.771000, 106.670000, GETDATE()),
    ('charlie', 'pass3', 10.782000, 106.695000, GETDATE());

-- Thêm quan hệ bạn bè (two-way)
INSERT INTO Friends (userId, friendId) VALUES 
    (1, 2),  -- alice -> bob
    (1, 3),  -- alice -> charlie
    (2, 1),  -- bob -> alice
    (3, 1);  -- charlie -> alice

-- Kiểm tra dữ liệu
SELECT * FROM Users;
SELECT * FROM Friends;

USE ZenlyClone;

-- Xem tất cả users
SELECT * FROM Users;

-- Xem quan hệ bạn bè
SELECT 
    f.id,
    u1.username AS 'User',
    u2.username AS 'Friend'
FROM Friends f
JOIN Users u1 ON f.userId = u1.id
JOIN Users u2 ON f.friendId = u2.id;

