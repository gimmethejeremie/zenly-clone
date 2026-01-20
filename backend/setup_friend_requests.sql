-- =============================================
-- Script thêm bảng Friend Requests
-- Chạy script này trong SSMS
-- =============================================

USE ZenlyClone;
GO

-- Tạo bảng FriendRequests
CREATE TABLE FriendRequests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    senderId INT NOT NULL,
    receiverId INT NOT NULL,
    status NVARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    createdAt DATETIME DEFAULT GETDATE(),
    updatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (senderId) REFERENCES Users(id),
    FOREIGN KEY (receiverId) REFERENCES Users(id),
    UNIQUE(senderId, receiverId)
);

-- Index để tìm kiếm nhanh
CREATE INDEX IX_FriendRequests_Receiver ON FriendRequests(receiverId, status);
CREATE INDEX IX_FriendRequests_Sender ON FriendRequests(senderId, status);

-- Kiểm tra
SELECT * FROM FriendRequests;
