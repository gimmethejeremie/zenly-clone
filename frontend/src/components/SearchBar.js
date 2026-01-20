import React, { useState, useEffect, useRef } from 'react';
import { Search, X, UserPlus, Check, Clock, Users } from 'lucide-react';

const SearchBar = ({ token, onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tìm kiếm khi gõ
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setResults(data.users);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, token, API_URL]);

  // Gửi lời mời kết bạn
  const sendFriendRequest = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: userId })
      });

      if (response.ok) {
        // Cập nhật status trong results
        setResults(prev => prev.map(u => 
          u.id === userId ? { ...u, friendStatus: 'request_sent' } : u
        ));
      }
    } catch (err) {
      console.error('Lỗi gửi lời mời:', err);
    }
  };

  const getStatusButton = (user) => {
    switch (user.friendStatus) {
      case 'friend':
        return (
          <button
            onClick={() => onSelectUser && onSelectUser(user)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: '#D1FAE5',
              color: '#059669',
              border: 'none',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Users size={14} /> Bạn bè
          </button>
        );
      case 'request_sent':
        return (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            backgroundColor: '#FEF3C7',
            color: '#D97706',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            <Clock size={14} /> Đã gửi
          </span>
        );
      case 'request_received':
        return (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            backgroundColor: '#EDE9FE',
            color: '#7C3AED',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            <Check size={14} /> Chờ bạn
          </span>
        );
      default:
        return (
          <button
            onClick={() => sendFriendRequest(user.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <UserPlus size={14} /> Kết bạn
          </button>
        );
    }
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: '25px',
        padding: '10px 16px',
        gap: '10px'
      }}>
        <Search size={18} color="#9CA3AF" />
        <input
          type="text"
          placeholder="Tìm kiếm bạn bè..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          style={{
            flex: 1,
            border: 'none',
            backgroundColor: 'transparent',
            outline: 'none',
            fontSize: '14px'
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex'
            }}
          >
            <X size={18} color="#9CA3AF" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (query.length >= 2) && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
              Đang tìm...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
              Không tìm thấy người dùng
            </div>
          ) : (
            results.map(user => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  gap: '12px',
                  borderBottom: '1px solid #F3F4F6',
                  cursor: 'pointer'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: user.avatar 
                    ? `url(${API_URL}${user.avatar}) center/cover`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {!user.avatar && user.username[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {user.username}
                  </div>
                </div>

                {/* Action Button */}
                {getStatusButton(user)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
