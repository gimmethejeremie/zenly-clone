-- =====================================================
-- FindUrPal - Database Schema Update
-- Thêm các tính năng: Ghost Mode, Chat, Avatar, 
-- Notifications, SOS, Parental Mode
-- =====================================================

USE ZenlyClone;
GO

-- 1. Cập nhật bảng Users - thêm các cột mới
-- Avatar
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'avatar')
BEGIN
    ALTER TABLE Users ADD avatar NVARCHAR(500) NULL;
END
GO

-- Ghost Mode
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'ghostMode')
BEGIN
    ALTER TABLE Users ADD ghostMode BIT DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'ghostModeUntil')
BEGIN
    ALTER TABLE Users ADD ghostModeUntil DATETIME NULL;
END
GO

-- Parental Mode
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'isParent')
BEGIN
    ALTER TABLE Users ADD isParent BIT DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'parentId')
BEGIN
    ALTER TABLE Users ADD parentId INT NULL;
END
GO

-- Online status
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'isOnline')
BEGIN
    ALTER TABLE Users ADD isOnline BIT DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'lastSeen')
BEGIN
    ALTER TABLE Users ADD lastSeen DATETIME NULL;
END
GO

-- 2. Tạo bảng Messages (Chat)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Messages')
BEGIN
    CREATE TABLE Messages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        senderId INT NOT NULL,
        receiverId INT NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        isRead BIT DEFAULT 0,
        createdAt DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (senderId) REFERENCES Users(id),
        FOREIGN KEY (receiverId) REFERENCES Users(id)
    );
    CREATE INDEX IX_Messages_Sender ON Messages(senderId);
    CREATE INDEX IX_Messages_Receiver ON Messages(receiverId);
    CREATE INDEX IX_Messages_CreatedAt ON Messages(createdAt);
END
GO

-- 3. Tạo bảng Notifications
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
BEGIN
    CREATE TABLE Notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        userId INT NOT NULL,
        type NVARCHAR(50) NOT NULL, -- 'friend_nearby', 'sos', 'friend_request', 'message'
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(500) NOT NULL,
        relatedUserId INT NULL, -- User liên quan (người gửi SOS, bạn ở gần, etc.)
        isRead BIT DEFAULT 0,
        createdAt DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (userId) REFERENCES Users(id),
        FOREIGN KEY (relatedUserId) REFERENCES Users(id)
    );
    CREATE INDEX IX_Notifications_User ON Notifications(userId);
    CREATE INDEX IX_Notifications_CreatedAt ON Notifications(createdAt DESC);
END
GO

-- 4. Tạo bảng SOS Alerts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SOSAlerts')
BEGIN
    CREATE TABLE SOSAlerts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        userId INT NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        message NVARCHAR(500) NULL,
        isActive BIT DEFAULT 1,
        createdAt DATETIME DEFAULT GETDATE(),
        resolvedAt DATETIME NULL,
        FOREIGN KEY (userId) REFERENCES Users(id)
    );
    CREATE INDEX IX_SOSAlerts_User ON SOSAlerts(userId);
    CREATE INDEX IX_SOSAlerts_Active ON SOSAlerts(isActive);
END
GO

-- 5. Tạo bảng ParentalLinks (liên kết phụ huynh - con)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ParentalLinks')
BEGIN
    CREATE TABLE ParentalLinks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        parentId INT NOT NULL,
        childId INT NOT NULL,
        status NVARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
        createdAt DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (parentId) REFERENCES Users(id),
        FOREIGN KEY (childId) REFERENCES Users(id),
        CONSTRAINT UQ_ParentalLink UNIQUE (parentId, childId)
    );
END
GO

PRINT 'Schema update completed successfully!';
