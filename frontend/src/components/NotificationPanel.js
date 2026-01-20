import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Bell, X, MapPin, MessageCircle, UserPlus, AlertTriangle, Check } from 'lucide-react';

const NotificationPanel = ({ token, onSelectUser, onOpenChat }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Lấy thông báo
  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Lỗi lấy thông báo:', err);
    }
  };

  // Lấy số chưa đọc
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications/unread/count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error('Lỗi đếm thông báo:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [token]);

  // Lắng nghe sự kiện realtime
  useEffect(() => {
    if (!socket) return;

    const handleSOS = (data) => {
      // Thêm thông báo SOS mới
      const newNotification = {
        id: Date.now(),
        type: 'sos',
        title: '🆘 SOS Khẩn cấp!',
        message: `${data.fromUsername} cần giúp đỡ!`,
        relatedUserId: data.fromUserId,
        relatedUsername: data.fromUsername,
        isRead: false,
        createdAt: data.timestamp
      };
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleFriendNearby = (data) => {
      const newNotification = {
        id: Date.now(),
        type: 'friend_nearby',
        title: '📍 Bạn bè ở gần!',
        message: `${data.friendName} đang ở gần bạn (${data.distance})`,
        relatedUserId: data.friendId,
        relatedUsername: data.friendName,
        isRead: false,
        createdAt: new Date()
      };
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    socket.on('sosAlert', handleSOS);
    socket.on('friendNearby', handleFriendNearby);

    return () => {
      socket.off('sosAlert', handleSOS);
      socket.off('friendNearby', handleFriendNearby);
    };
  }, [socket]);

  // Đánh dấu đã đọc
  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/read/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Lỗi:', err);
    }
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Lỗi:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'sos':
        return <AlertTriangle size={20} color="#EF4444" />;
      case 'friend_nearby':
        return <MapPin size={20} color="#8B5CF6" />;
      case 'message':
        return <MessageCircle size={20} color="#3B82F6" />;
      case 'friend_request':
        return <UserPlus size={20} color="#10B981" />;
      default:
        return <Bell size={20} color="#6B7280" />;
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = (now - d) / 1000;

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px'
        }}
      >
        <Bell size={24} color="#6B7280" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: '#EF4444',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '340px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid #F3F4F6'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Thông báo
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8B5CF6',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Check size={14} /> Đọc tất cả
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <X size={20} color="#9CA3AF" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
              Không có thông báo
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => {
                  if (!notification.isRead) markAsRead(notification.id);
                  if (notification.type === 'sos' || notification.type === 'friend_nearby') {
                    onSelectUser && onSelectUser({ 
                      id: notification.relatedUserId, 
                      username: notification.relatedUsername 
                    });
                  }
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  padding: '12px 16px',
                  gap: '12px',
                  cursor: 'pointer',
                  backgroundColor: notification.isRead ? 'white' : '#F0EAFF',
                  borderBottom: '1px solid #F3F4F6',
                  transition: 'background-color 0.2s'
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getIcon(notification.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: notification.isRead ? '500' : '600', 
                    fontSize: '13px',
                    marginBottom: '2px'
                  }}>
                    {notification.title}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6B7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {notification.message}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                    {formatTime(notification.createdAt)}
                  </div>
                </div>

                {/* Unread dot */}
                {!notification.isRead && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#8B5CF6',
                    flexShrink: 0,
                    alignSelf: 'center'
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
