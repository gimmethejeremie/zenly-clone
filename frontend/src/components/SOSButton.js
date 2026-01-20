import React, { useState } from 'react';
import { AlertTriangle, X, Send, Phone } from 'lucide-react';

const SOSButton = ({ token, userLocation, currentUserId, socket }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [friendsNotified, setFriendsNotified] = useState(0);
  const [sosError, setSosError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const sendSOS = async () => {
    if (!userLocation) {
      setSosError('Không thể lấy vị trí của bạn!');
      return;
    }

    setSending(true);
    setSosError('');

    try {
      // Gửi qua API để lưu vào database và thông báo bạn bè
      const response = await fetch(`${API_URL}/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lat: userLocation.lat,
          lng: userLocation.lng,
          message: message.trim() || 'Tôi cần giúp đỡ!'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Cũng gửi qua Socket.io cho realtime nếu có socket
        if (socket && socket.connected) {
          socket.emit('sendSOS', {
            userId: currentUserId,
            lat: userLocation.lat,
            lng: userLocation.lng,
            message: message.trim() || 'Tôi cần giúp đỡ!'
          });
        }

        setFriendsNotified(data.notifiedFriends || 0);
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setIsOpen(false);
          setMessage('');
          setFriendsNotified(0);
        }, 4000);
      } else {
        setSosError(data.message || 'Không thể gửi SOS');
      }
    } catch (err) {
      console.error('Lỗi gửi SOS:', err);
      setSosError('Không thể gửi SOS. Vui lòng thử lại!');
    }

    setSending(false);
  };

  return (
    <>
      {/* SOS Button - Fixed position next to map zoom controls */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '180px',
          right: '10px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'pulse 2s infinite'
        }}
      >
        <AlertTriangle size={28} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '360px',
            overflow: 'hidden'
          }}>
            {sent ? (
              // Success State
              <div style={{
                padding: '40px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: '40px'
                }}>
                  ✓
                </div>
                <h2 style={{ margin: 0, fontSize: '22px' }}>Đã gửi SOS!</h2>
                <p style={{ margin: '12px 0 0', opacity: 0.9 }}>
                  {friendsNotified > 0 
                    ? `${friendsNotified} bạn bè đã nhận được thông báo khẩn cấp của bạn`
                    : 'Thông báo khẩn cấp đã được gửi đi'}
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  padding: '24px',
                  textAlign: 'center',
                  color: 'white',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white'
                    }}
                  >
                    <X size={18} />
                  </button>

                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <AlertTriangle size={36} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>
                    🆘 Gửi SOS
                  </h2>
                  <p style={{ margin: '8px 0 0', fontSize: '14px', opacity: 0.9 }}>
                    Thông báo khẩn cấp sẽ được gửi đến TẤT CẢ bạn bè
                  </p>
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                  {/* Error Message */}
                  {sosError && (
                    <div style={{
                      padding: '12px',
                      marginBottom: '12px',
                      backgroundColor: '#FEE2E2',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      color: '#DC2626',
                      fontSize: '14px'
                    }}>
                      ⚠️ {sosError}
                    </div>
                  )}

                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    color: '#6B7280',
                    marginBottom: '8px'
                  }}>
                    Tin nhắn (tùy chọn):
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tôi cần giúp đỡ!"
                    maxLength={200}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '12px',
                      fontSize: '14px',
                      resize: 'none',
                      height: '80px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* Location Info */}
                  {userLocation && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#6B7280'
                    }}>
                      📍 Vị trí: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      fontSize: '15px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={sendSOS}
                    disabled={sending}
                    style={{
                      flex: 2,
                      padding: '14px',
                      border: 'none',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {sending ? (
                      'Đang gửi...'
                    ) : (
                      <>
                        <Send size={18} /> Gửi SOS Ngay
                      </>
                    )}
                  </button>
                </div>

                {/* Emergency Call */}
                <div style={{
                  padding: '16px 20px',
                  backgroundColor: '#FEF2F2',
                  textAlign: 'center',
                  borderTop: '1px solid #FEE2E2'
                }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#991B1B' }}>
                    Trường hợp khẩn cấp thực sự, hãy gọi:
                  </p>
                  <a
                    href="tel:113"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#DC2626',
                      color: 'white',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    <Phone size={16} /> Gọi 113
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 4px 30px rgba(220, 38, 38, 0.6); }
            100% { transform: scale(1); box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4); }
          }
        `}
      </style>
    </>
  );
};

export default SOSButton;
