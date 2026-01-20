import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, X, Check, ChevronRight, MapPin, Clock } from 'lucide-react';

const ParentalModePanel = ({ isOpen, onClose, token, onSelectChild }) => {
  const [activeTab, setActiveTab] = useState('children'); // 'children', 'requests', 'add'
  const [children, setChildren] = useState([]);
  const [requests, setRequests] = useState([]);
  const [newChildUsername, setNewChildUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Lấy danh sách con
  const fetchChildren = async () => {
    try {
      const response = await fetch(`${API_URL}/parental/children`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children);
      }
    } catch (err) {
      console.error('Lỗi:', err);
    }
  };

  // Lấy yêu cầu đang chờ (cho con)
  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/parental/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('Lỗi:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChildren();
      fetchRequests();
    }
  }, [isOpen]);

  // Gửi yêu cầu phụ huynh
  const sendRequest = async () => {
    if (!newChildUsername.trim()) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${API_URL}/parental/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ childUsername: newChildUsername.trim() })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('✅ Đã gửi yêu cầu!');
        setNewChildUsername('');
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (err) {
      setMessage('❌ Lỗi kết nối');
    }
    setLoading(false);
  };

  // Chấp nhận yêu cầu
  const acceptRequest = async (requestId) => {
    try {
      await fetch(`${API_URL}/parental/accept/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRequests();
    } catch (err) {
      console.error('Lỗi:', err);
    }
  };

  // Từ chối yêu cầu
  const rejectRequest = async (requestId) => {
    try {
      await fetch(`${API_URL}/parental/reject/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRequests();
    } catch (err) {
      console.error('Lỗi:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
          padding: '24px',
          textAlign: 'center',
          color: 'white'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
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
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Shield size={30} />
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Chế độ Phụ huynh
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', opacity: 0.8 }}>
            Theo dõi vị trí con cái an toàn
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <button
            onClick={() => setActiveTab('children')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              backgroundColor: activeTab === 'children' ? '#F0FDF4' : 'white',
              color: activeTab === 'children' ? '#059669' : '#6B7280',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              borderBottom: activeTab === 'children' ? '2px solid #059669' : 'none'
            }}
          >
            Danh sách ({children.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              backgroundColor: activeTab === 'requests' ? '#F0FDF4' : 'white',
              color: activeTab === 'requests' ? '#059669' : '#6B7280',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              borderBottom: activeTab === 'requests' ? '2px solid #059669' : 'none',
              position: 'relative'
            }}
          >
            Yêu cầu
            {requests.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '20px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                color: 'white',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              backgroundColor: activeTab === 'add' ? '#F0FDF4' : 'white',
              color: activeTab === 'add' ? '#059669' : '#6B7280',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              borderBottom: activeTab === 'add' ? '2px solid #059669' : 'none'
            }}
          >
            Thêm
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Tab Children */}
          {activeTab === 'children' && (
            <>
              {children.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
                  Chưa có ai trong danh sách
                </div>
              ) : (
                children.map(child => (
                  <div
                    key={child.id}
                    onClick={() => {
                      onSelectChild && onSelectChild(child);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '12px',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      gap: '12px'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: child.avatar 
                        ? `url(${API_URL}${child.avatar}) center/cover`
                        : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>
                      {!child.avatar && child.username[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>
                        {child.username}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: child.location ? '#059669' : '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px'
                      }}>
                        {child.location ? (
                          <>
                            <MapPin size={12} /> Đang chia sẻ vị trí
                          </>
                        ) : (
                          <>
                            <Clock size={12} /> Không có vị trí
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={20} color="#9CA3AF" />
                  </div>
                ))
              )}
            </>
          )}

          {/* Tab Requests */}
          {activeTab === 'requests' && (
            <>
              {requests.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
                  Không có yêu cầu nào
                </div>
              ) : (
                requests.map(req => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: '#FEF3C7',
                      borderRadius: '12px',
                      marginBottom: '10px',
                      gap: '12px'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>
                      {req.parentUsername[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {req.parentUsername}
                      </div>
                      <div style={{ fontSize: '12px', color: '#92400E' }}>
                        muốn theo dõi vị trí của bạn
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => acceptRequest(req.id)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#10B981',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => rejectRequest(req.id)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#EF4444',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Tab Add */}
          {activeTab === 'add' && (
            <div>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
                Nhập username của con bạn để gửi yêu cầu theo dõi:
              </p>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={newChildUsername}
                  onChange={(e) => setNewChildUsername(e.target.value)}
                  placeholder="Username..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={sendRequest}
                  disabled={loading || !newChildUsername.trim()}
                  style={{
                    padding: '12px 20px',
                    border: 'none',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UserPlus size={18} />
                </button>
              </div>

              {message && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: message.startsWith('✅') ? '#D1FAE5' : '#FEE2E2',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  {message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '12px',
              backgroundColor: '#F3F4F6',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParentalModePanel;
