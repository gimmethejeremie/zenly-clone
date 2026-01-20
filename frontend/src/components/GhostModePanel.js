import React, { useState } from 'react';
import { Ghost, Clock, X, Check } from 'lucide-react';

const GhostModePanel = ({ isOpen, onClose, token, currentStatus, onStatusChange }) => {
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const durations = [
    { value: '1', label: '1 giờ' },
    { value: '8', label: '8 giờ' },
    { value: '24', label: '24 giờ' },
    { value: 'forever', label: 'Đến khi tôi bật lại' }
  ];

  const setGhostMode = async (duration) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/ghost-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: true, duration })
      });

      if (response.ok) {
        const data = await response.json();
        onStatusChange && onStatusChange({
          ghostMode: true,
          ghostModeUntil: data.ghostModeUntil
        });
        onClose();
      }
    } catch (err) {
      console.error('Lỗi:', err);
    }
    setLoading(false);
  };

  const disableGhostMode = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/ghost-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: false })
      });

      if (response.ok) {
        onStatusChange && onStatusChange({
          ghostMode: false,
          ghostModeUntil: null
        });
        onClose();
      }
    } catch (err) {
      console.error('Lỗi:', err);
    }
    setLoading(false);
  };

  const getRemainingTime = () => {
    if (!currentStatus?.ghostModeUntil) return 'Mãi mãi';
    const remaining = new Date(currentStatus.ghostModeUntil) - new Date();
    if (remaining <= 0) return 'Đã hết hạn';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
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
        maxWidth: '360px',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
          padding: '24px',
          textAlign: 'center',
          color: 'white'
        }}>
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
            <Ghost size={30} />
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Chế độ ẩn danh
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', opacity: 0.8 }}>
            Bạn bè sẽ không thấy vị trí của bạn
          </p>
        </div>

        {/* Current Status */}
        {currentStatus?.ghostMode && (
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#FEF3C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#D97706" />
              <span style={{ fontSize: '14px', color: '#92400E' }}>
                Đang bật - Còn {getRemainingTime()}
              </span>
            </div>
            <button
              onClick={disableGhostMode}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Tắt
            </button>
          </div>
        )}

        {/* Duration Options */}
        <div style={{ padding: '20px' }}>
          <p style={{ 
            fontSize: '13px', 
            color: '#6B7280', 
            margin: '0 0 16px',
            textAlign: 'center'
          }}>
            Chọn thời gian ẩn vị trí:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {durations.map(d => (
              <button
                key={d.value}
                onClick={() => setGhostMode(d.value)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Clock size={18} />
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div style={{ padding: '0 20px 20px' }}>
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

export default GhostModePanel;
