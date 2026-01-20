import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Send, X, ArrowLeft } from 'lucide-react';

const Chat = ({ friend, token, currentUserId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Scroll xuống cuối khi có tin mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Lấy tin nhắn cũ
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/chat/${friend.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Lỗi lấy tin nhắn:', err);
      }
      setLoading(false);
    };

    fetchMessages();

    // Đánh dấu đã đọc
    fetch(`${API_URL}/chat/read/${friend.id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }, [friend.id, token, API_URL]);

  // Scroll khi có tin mới
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Lắng nghe tin nhắn mới từ socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.senderId === friend.id || data.receiverId === friend.id) {
        setMessages(prev => [...prev, data]);
        
        // Đánh dấu đã đọc nếu tin từ bạn
        if (data.senderId === friend.id) {
          fetch(`${API_URL}/chat/read/${friend.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
      }
    };

    // Lắng nghe tin nhắn từ bạn
    socket.on('newMessage', handleNewMessage);
    
    // Lắng nghe xác nhận tin đã gửi (từ mình)
    socket.on('messageSent', (data) => {
      if (data.receiverId === friend.id) {
        setMessages(prev => [...prev, data]);
      }
    });

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageSent');
    };
  }, [socket, friend.id, token, API_URL]);

  // Gửi tin nhắn
  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit('sendMessage', {
      senderId: currentUserId,
      receiverId: friend.id,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  // Xử lý khi nhấn Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        gap: '12px'
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        
        {/* Avatar */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: friend.avatar 
            ? `url(${API_URL}${friend.avatar}) center/cover`
            : 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          {!friend.avatar && friend.username[0].toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '16px' }}>{friend.username}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {friend.isOnline ? '🟢 Đang online' : 'Offline'}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#F9FAFB'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
            Đang tải...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
            Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id || index}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: '8px'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  backgroundColor: isMe ? '#8B5CF6' : 'white',
                  color: isMe ? 'white' : '#1F2937',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                    {msg.message}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    opacity: 0.7,
                    marginTop: '4px',
                    textAlign: 'right'
                  }}>
                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: 'white',
        borderTop: '1px solid #E5E7EB',
        gap: '12px'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập tin nhắn..."
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #E5E7EB',
            borderRadius: '25px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: newMessage.trim() 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#E5E7EB',
            color: 'white',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default Chat;
