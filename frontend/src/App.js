import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import FriendsList from './components/FriendsList';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import Chat from './components/Chat';
import NotificationPanel from './components/NotificationPanel';
import GhostModePanel from './components/GhostModePanel';
import ParentalModePanel from './components/ParentalModePanel';
import SOSButton from './components/SOSButton';
import AvatarUpload from './components/AvatarUpload';
import { ToastProvider, useToast } from './components/Toast';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { LogOut, Ghost, Shield } from 'lucide-react';

function AppContent({ onAuthChange }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [] });
  
  // New states for new features
  const [chatFriend, setChatFriend] = useState(null);
  const [showGhostMode, setShowGhostMode] = useState(false);
  const [showParentalMode, setShowParentalMode] = useState(false);
  const [ghostModeStatus, setGhostModeStatus] = useState({ ghostMode: false, ghostModeUntil: null });
  const [userAvatar, setUserAvatar] = useState(null);
  
  const { socket, isConnected } = useSocket();
  const toast = useToast();

  const API_URL = process.env.REACT_APP_API_URL;

  // Lấy thông tin user từ server (bao gồm avatar)
  const fetchUserProfile = async (jwtToken) => {
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.avatar) {
          setUserAvatar(data.avatar);
          localStorage.setItem('avatar', data.avatar);
        }
      }
    } catch (err) {
      console.error('Lỗi lấy profile:', err);
    }
  };

  // Khôi phục trạng thái đăng nhập từ localStorage khi refresh
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedAvatar = localStorage.getItem('avatar');
    
    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setToken(savedToken);
        setCurrentUser(user);
        setUserAvatar(savedAvatar);
        setIsLoggedIn(true);
        
        if (onAuthChange) {
          onAuthChange({ userId: user.id, token: savedToken });
        }
        
        fetchGhostModeStatus(savedToken);
        // Lấy avatar mới nhất từ server
        fetchUserProfile(savedToken);
      } catch (err) {
        console.error('Lỗi khôi phục session:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('avatar');
      }
    }
  }, []);

  // Xử lý đăng nhập thành công
  const handleLoginSuccess = (jwtToken, username, userId, avatar) => {
    setToken(jwtToken);
    setCurrentUser({ username, id: userId });
    setUserAvatar(avatar);
    setIsLoggedIn(true);
    
    // Lưu vào localStorage để giữ đăng nhập khi refresh
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify({ username, id: userId }));
    if (avatar) localStorage.setItem('avatar', avatar);
    
    // Cập nhật auth data cho SocketProvider
    if (onAuthChange) {
      onAuthChange({ userId, token: jwtToken });
    }
    
    // Lấy ghost mode status
    fetchGhostModeStatus(jwtToken);
  };
  
  // Lấy trạng thái ghost mode
  const fetchGhostModeStatus = async (jwtToken) => {
    try {
      const response = await fetch(`${API_URL}/users/ghost-mode`, {
        headers: { 'Authorization': `Bearer ${jwtToken || token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGhostModeStatus(data);
      }
    } catch (err) {
      console.error('Lỗi lấy ghost mode:', err);
    }
  };

  // Đăng xuất
  const handleLogout = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
    
    // Xóa localStorage khi đăng xuất
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('avatar');
    
    setIsLoggedIn(false);
    setToken('');
    setCurrentUser(null);
    setFriends([]);
    setUserLocation(null);
    setSelectedFriend(null);
    setRouteInfo(null);
    setChatFriend(null);
    setGhostModeStatus({ ghostMode: false, ghostModeUntil: null });
    setUserAvatar(null);
    
    // Reset socket
    if (onAuthChange) {
      onAuthChange({ userId: null, token: null });
    }
  };

  // Lấy và theo dõi vị trí người dùng
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    if (navigator.geolocation) {
      // Lấy vị trí ban đầu
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          updateLocationToServer(loc);
          
          // Cập nhật qua Socket.io
          if (socket && currentUser) {
            socket.emit('updateLocation', {
              userId: currentUser.id,
              lat: loc.lat,
              lng: loc.lng
            });
          }
        },
        (error) => {
          console.error('Lỗi lấy vị trí:', error);
          toast.warning('Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí.');
        }
      );

      // Theo dõi vị trí real-time
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          updateLocationToServer(loc);
          
          // Cập nhật qua Socket.io
          if (socket && currentUser) {
            socket.emit('updateLocation', {
              userId: currentUser.id,
              lat: loc.lat,
              lng: loc.lng
            });
          }
        },
        (error) => {
          console.error('Lỗi theo dõi vị trí:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );

      setWatchId(id);

      return () => {
        navigator.geolocation.clearWatch(id);
      };
    }
  }, [isLoggedIn, token]);

  // Cập nhật vị trí lên server
  const updateLocationToServer = async (location) => {
    try {
      await fetch(`${API_URL}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat: location.lat, lng: location.lng })
      });
    } catch (error) {
      console.error('Lỗi cập nhật vị trí:', error);
    }
  };

  // Lấy danh sách bạn bè định kỳ
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const fetchFriends = async () => {
      try {
        const response = await fetch(`${API_URL}/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setFriends(data);
        }
      } catch (error) {
        console.error('Lỗi lấy danh sách bạn bè:', error);
      }
    };

    const fetchFriendRequests = async () => {
      try {
        const response = await fetch(`${API_URL}/friends/requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setFriendRequests(data);
        }
      } catch (error) {
        console.error('Lỗi lấy lời mời kết bạn:', error);
      }
    };

    fetchFriends();
    fetchFriendRequests();
    const interval = setInterval(() => {
      fetchFriends();
      fetchFriendRequests();
    }, 10000); // Cập nhật mỗi 10s

    return () => clearInterval(interval);
  }, [isLoggedIn, token, API_URL]);

  // Xử lý chọn bạn bè
  const handleSelectFriend = async (friend) => {
    setSelectedFriend(friend);

    if (!userLocation || !friend.location) {
      setRouteInfo(null);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/directions/${friend.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRouteInfo(data);
      }
    } catch (error) {
      console.error('Lỗi lấy chỉ đường:', error);
    }
  };

  // Chấp nhận lời mời kết bạn
  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await fetch(`${API_URL}/friends/accept/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        // Refresh cả friends và requests
        const [friendsRes, reqRes] = await Promise.all([
          fetch(`${API_URL}/friends`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/friends/requests`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        setFriends(await friendsRes.json());
        setFriendRequests(await reqRes.json());
      }
    } catch (error) {
      console.error('Lỗi chấp nhận lời mời:', error);
    }
  };

  // Từ chối/hủy lời mời kết bạn
  const handleRejectRequest = async (requestId) => {
    try {
      const response = await fetch(`${API_URL}/friends/reject/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        // Refresh requests
        const reqResponse = await fetch(`${API_URL}/friends/requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFriendRequests(await reqResponse.json());
      }
    } catch (error) {
      console.error('Lỗi từ chối lời mời:', error);
    }
  };

  // Hủy kết bạn
  const handleRemoveFriend = async (friendId) => {
    try {
      const response = await fetch(`${API_URL}/friends/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        // Refresh friends
        const friendsRes = await fetch(`${API_URL}/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFriends(await friendsRes.json());
        
        // Clear selection nếu đang chọn friend đó
        if (selectedFriend?.id === friendId) {
          setSelectedFriend(null);
          setRouteInfo(null);
        }
      }
    } catch (error) {
      console.error('Lỗi hủy kết bạn:', error);
    }
  };

  // Nếu chưa đăng nhập
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Giao diện chính
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Logo & User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AvatarUpload
            currentAvatar={userAvatar}
            token={token}
            onAvatarChange={setUserAvatar}
          />
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              FindUrPal
              {ghostModeStatus.ghostMode && (
                <span style={{ 
                  fontSize: '12px', 
                  backgroundColor: '#1F2937', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Ghost size={12} /> Ẩn danh
                </span>
              )}
            </h1>
            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
              {currentUser?.username}
              {isConnected && <span style={{ color: '#10B981' }}> • Online</span>}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <SearchBar
            token={token}
            onSelectUser={(user) => {
              if (user.friendStatus === 'friend') {
                handleSelectFriend(user);
              }
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Notifications */}
          <NotificationPanel
            token={token}
            onSelectUser={handleSelectFriend}
            onOpenChat={(friend) => setChatFriend(friend)}
          />
          
          {/* Ghost Mode */}
          <button
            onClick={() => setShowGhostMode(true)}
            title="Chế độ ẩn danh"
            style={{
              padding: '8px',
              background: ghostModeStatus.ghostMode ? '#1F2937' : 'none',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Ghost size={22} color={ghostModeStatus.ghostMode ? 'white' : '#6B7280'} />
          </button>

          {/* Parental Mode */}
          <button
            onClick={() => setShowParentalMode(true)}
            title="Chế độ phụ huynh"
            style={{
              padding: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Shield size={22} color="#6B7280" />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <FriendsList
          friends={friends}
          selectedFriend={selectedFriend}
          onSelectFriend={handleSelectFriend}
          friendRequests={friendRequests}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
          onRemoveFriend={handleRemoveFriend}
          onOpenChat={(friend) => setChatFriend(friend)}
          token={token}
        />
        <MapView
          userLocation={userLocation}
          friends={friends}
          selectedFriend={selectedFriend}
          routeInfo={routeInfo}
          token={token}
          onClearRoute={() => {
            setSelectedFriend(null);
            setRouteInfo(null);
          }}
        />
      </div>

      {/* SOS Button */}
      <SOSButton
        token={token}
        userLocation={userLocation}
        currentUserId={currentUser?.id}
        socket={socket}
      />

      {/* Chat Modal */}
      {chatFriend && (
        <Chat
          friend={chatFriend}
          token={token}
          currentUserId={currentUser?.id}
          onClose={() => setChatFriend(null)}
        />
      )}

      {/* Ghost Mode Panel */}
      <GhostModePanel
        isOpen={showGhostMode}
        onClose={() => setShowGhostMode(false)}
        token={token}
        currentStatus={ghostModeStatus}
        onStatusChange={setGhostModeStatus}
      />

      {/* Parental Mode Panel */}
      <ParentalModePanel
        isOpen={showParentalMode}
        onClose={() => setShowParentalMode(false)}
        token={token}
        onSelectChild={handleSelectFriend}
      />
    </div>
  );
}

// Wrap with SocketProvider and ToastProvider
function App() {
  const [authData, setAuthData] = useState({ userId: null, token: null });

  return (
    <ToastProvider>
      <SocketProvider userId={authData.userId} token={authData.token}>
        <AppContent onAuthChange={setAuthData} />
      </SocketProvider>
    </ToastProvider>
  );
}

export default App;