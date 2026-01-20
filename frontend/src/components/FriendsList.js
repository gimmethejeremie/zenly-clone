import React, { useState } from 'react';
import { Users, MapPin, Navigation, Bell, X, Check, UserMinus, Send, MessageCircle, Ghost, AlertTriangle } from 'lucide-react';

function FriendsList({ 
  friends, 
  selectedFriend, 
  onSelectFriend, 
  friendRequests,
  onAcceptRequest,
  onRejectRequest,
  onRemoveFriend,
  onOpenChat,
  token
}) {
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests
  const [confirmUnfriend, setConfirmUnfriend] = useState(null); // friend to unfriend
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  return (
    <div style={{
      width: '320px',
      backgroundColor: 'white',
      boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0
          }}>
            <Users style={{ width: '20px', height: '20px' }} />
            FindUrPal
          </h2>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('friends')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'friends' ? 'white' : 'rgba(255,255,255,0.2)',
              color: activeTab === 'friends' ? '#764ba2' : 'white',
              fontWeight: '600',
              fontSize: '13px'
            }}
          >
            Bạn bè ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'requests' ? 'white' : 'rgba(255,255,255,0.2)',
              color: activeTab === 'requests' ? '#764ba2' : 'white',
              fontWeight: '600',
              fontSize: '13px',
              position: 'relative'
            }}
          >
            Lời mời
            {friendRequests?.received?.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#EF4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {friendRequests.received.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {activeTab === 'friends' ? (
          /* Friends List */
          friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#999' }}>
              <Users style={{ 
                width: '48px', 
                height: '48px', 
                margin: '0 auto 16px', 
                opacity: 0.5 
              }} />
              <p style={{ marginBottom: '8px' }}>Chưa có bạn bè nào</p>
              <p style={{ fontSize: '13px', color: '#666' }}>
                Sử dụng thanh tìm kiếm ở trên để thêm bạn bè
              </p>
            </div>
          ) : (
            friends.map(friend => (
              <div
                key={friend.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '12px',
                  background: selectedFriend?.id === friend.id
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#f9fafb',
                  color: selectedFriend?.id === friend.id ? 'white' : '#333',
                  transition: 'all 0.2s'
                }}
              >
                <div 
                  onClick={() => onSelectFriend(friend)}
                  style={{ cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center' }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: friend.avatar 
                      ? `url(${API_URL}${friend.avatar}) center/cover`
                      : selectedFriend?.id === friend.id 
                        ? 'rgba(255,255,255,0.2)' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    {!friend.avatar && friend.username[0].toUpperCase()}
                    {/* Ghost mode indicator */}
                    {friend.isGhostMode && (
                      <div style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#1F2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white'
                      }}>
                        <Ghost size={10} color="white" />
                      </div>
                    )}
                    {/* Online indicator */}
                    {friend.isOnline && !friend.isGhostMode && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        border: '2px solid white'
                      }} />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontWeight: '600',
                      marginBottom: '4px',
                      fontSize: '15px'
                    }}>
                      {friend.username}
                    </h3>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px'
                    }}>
                      {friend.isGhostMode ? (
                        <>
                          <Ghost style={{
                            width: '12px',
                            height: '12px',
                            color: selectedFriend?.id === friend.id ? 'white' : '#6B7280'
                          }} />
                          <span style={{
                            color: selectedFriend?.id === friend.id ? 'white' : '#6B7280'
                          }}>
                            Đang ẩn danh
                          </span>
                        </>
                      ) : friend.location ? (
                        <>
                          <MapPin style={{
                            width: '12px',
                            height: '12px',
                            color: selectedFriend?.id === friend.id ? 'white' : '#10B981'
                          }} />
                          <span style={{
                            color: selectedFriend?.id === friend.id ? 'white' : '#10B981'
                          }}>
                            Đang chia sẻ vị trí
                          </span>
                        </>
                      ) : (
                        <>
                          <MapPin style={{
                            width: '12px',
                            height: '12px',
                            color: selectedFriend?.id === friend.id ? 'white' : '#999'
                          }} />
                          <span style={{
                            color: selectedFriend?.id === friend.id ? 'white' : '#999'
                          }}>
                            Không chia sẻ
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedFriend?.id === friend.id && (
                    <Navigation style={{ width: '18px', height: '18px' }} />
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {/* Chat button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChat && onOpenChat(friend);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: selectedFriend?.id === friend.id ? 'rgba(255,255,255,0.2)' : '#EFF6FF',
                      color: selectedFriend?.id === friend.id ? 'white' : '#3B82F6',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'center'
                    }}
                  >
                    <MessageCircle style={{ width: '14px', height: '14px' }} />
                    Nhắn tin
                  </button>

                  {/* Unfriend button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmUnfriend(friend);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: selectedFriend?.id === friend.id ? 'rgba(255,255,255,0.2)' : '#FEE2E2',
                      color: selectedFriend?.id === friend.id ? 'white' : '#DC2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'center'
                    }}
                  >
                    <UserMinus style={{ width: '14px', height: '14px' }} />
                    Hủy kết bạn
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          /* Requests Tab */
          <div>
            {/* Lời mời nhận được */}
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#666',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Bell style={{ width: '16px', height: '16px' }} />
              Lời mời nhận được
            </h3>
            
            {friendRequests?.received?.length === 0 ? (
              <p style={{ color: '#999', fontSize: '13px', marginBottom: '16px' }}>
                Không có lời mời nào
              </p>
            ) : (
              friendRequests?.received?.map(request => (
                <div
                  key={request.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '10px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE'
                  }}
                >
                  <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                    {request.senderUsername}
                  </p>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    muốn kết bạn với bạn
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onAcceptRequest(request.id)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '13px'
                      }}
                    >
                      <Check style={{ width: '16px', height: '16px' }} />
                      Chấp nhận
                    </button>
                    <button
                      onClick={() => onRejectRequest(request.id)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: '#EF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '13px'
                      }}
                    >
                      <X style={{ width: '16px', height: '16px' }} />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Lời mời đã gửi */}
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#666',
              marginTop: '16px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Send style={{ width: '16px', height: '16px' }} />
              Lời mời đã gửi
            </h3>
            
            {friendRequests?.sent?.length === 0 ? (
              <p style={{ color: '#999', fontSize: '13px' }}>
                Chưa gửi lời mời nào
              </p>
            ) : (
              friendRequests?.sent?.map(request => (
                <div
                  key={request.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '10px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ fontWeight: '600' }}>
                        {request.receiverUsername}
                      </p>
                      <p style={{ fontSize: '12px', color: '#666' }}>
                        Đang chờ phản hồi...
                      </p>
                    </div>
                    <button
                      onClick={() => onRejectRequest(request.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#EF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Confirm Unfriend Modal */}
      {confirmUnfriend && (
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
          zIndex: 5000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '360px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
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
                margin: '0 auto 12px'
              }}>
                <UserMinus size={28} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Hủy kết bạn
              </h3>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}>
                  {confirmUnfriend.username?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
                  {confirmUnfriend.username}
                </span>
              </div>
              
              <p style={{ 
                color: '#666', 
                fontSize: '14px', 
                margin: '0 0 8px',
                lineHeight: '1.5'
              }}>
                Bạn có chắc chắn muốn hủy kết bạn với <strong>{confirmUnfriend.username}</strong>?
              </p>
              <p style={{ 
                color: '#999', 
                fontSize: '13px', 
                margin: 0 
              }}>
                Bạn sẽ không thể thấy vị trí của nhau nữa.
              </p>
            </div>

            {/* Actions */}
            <div style={{ 
              padding: '0 24px 24px', 
              display: 'flex', 
              gap: '12px' 
            }}>
              <button
                onClick={() => setConfirmUnfriend(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  backgroundColor: 'white',
                  color: '#666',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onRemoveFriend(confirmUnfriend.id);
                  setConfirmUnfriend(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <UserMinus size={18} />
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FriendsList;