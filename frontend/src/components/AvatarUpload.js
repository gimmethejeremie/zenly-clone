import React, { useState, useRef } from 'react';
import { Camera, User } from 'lucide-react';
import { useToast } from './Toast';

const AvatarUpload = ({ currentAvatar, token, onAvatarChange }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh phải nhỏ hơn 5MB!');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload
    uploadAvatar(file);
  };

  const uploadAvatar = async (file) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_URL}/users/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        onAvatarChange && onAvatarChange(data.avatar);
        setPreview(null);
        toast.success('Đã cập nhật ảnh đại diện!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Lỗi upload ảnh');
        setPreview(null);
      }
    } catch (err) {
      console.error('Lỗi upload:', err);
      toast.error('Không thể upload ảnh');
      setPreview(null);
    }

    setUploading(false);
  };

  const avatarUrl = preview || (currentAvatar ? `${API_URL}${currentAvatar}` : null);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar Display */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: avatarUrl 
            ? `url(${avatarUrl}) center/cover`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '3px solid white',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {!avatarUrl && <User size={36} color="white" />}
        
        {/* Overlay when uploading */}
        {uploading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}
      </div>

      {/* Camera Icon */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: '#8B5CF6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '2px solid white'
        }}
      >
        <Camera size={14} color="white" />
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* CSS */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AvatarUpload;
