import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer
} from '@react-google-maps/api';
import { Navigation, Car, User } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

// Lăng Chủ tịch Hồ Chí Minh, Hà Nội
const defaultCenter = {
  lat: 21.036773,
  lng: 105.834160
};

// Đại học Bách Khoa Hà Nội
const BACH_KHOA_LOCATION = {
  lat: 21.0065,
  lng: 105.8431,
  name: 'Đại học Bách Khoa Hà Nội'
};

// Các loại phương tiện
const TRANSPORT_MODES = [
  { id: 'driving', label: 'Ô tô', googleMode: 'DRIVING', avoidHighways: false },
  { id: 'motorbike', label: 'Xe máy', googleMode: 'DRIVING', avoidHighways: true },
  { id: 'bicycling', label: 'Xe đạp', googleMode: 'WALKING', avoidHighways: false },
  { id: 'walking', label: 'Đi bộ', googleMode: 'WALKING', avoidHighways: false }
];

function MapView({ 
  userLocation, 
  friends, 
  selectedFriend, 
  routeInfo,
  onClearRoute,
  token
}) {
  const [directions, setDirections] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [loadingDistance, setLoadingDistance] = useState(false);
  const [selectedTransportMode, setSelectedTransportMode] = useState('driving');

  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const API_URL = process.env.REACT_APP_API_URL;

  // Sử dụng useJsApiLoader thay vì LoadScript để đảm bảo API đã load
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Icon cho từng phương tiện
  const getModeIcon = useCallback((mode) => {
    switch (mode) {
      case 'driving': return <Car style={{ width: '18px', height: '18px' }} />;
      case 'walking': return <User style={{ width: '18px', height: '18px' }} />;
      case 'bicycling': return <Navigation style={{ width: '18px', height: '18px' }} />;
      case 'transit': return <Navigation style={{ width: '18px', height: '18px' }} />;
      default: return <Navigation style={{ width: '18px', height: '18px' }} />;
    }
  }, []);

  // Màu cho từng phương tiện
  const getModeColor = useCallback((mode) => {
    switch (mode) {
      case 'driving': return { bg: '#EFF6FF', color: '#3B82F6' };
      case 'walking': return { bg: '#FEF3C7', color: '#D97706' };
      case 'bicycling': return { bg: '#D1FAE5', color: '#059669' };
      case 'transit': return { bg: '#EDE9FE', color: '#7C3AED' };
      default: return { bg: '#F3F4F6', color: '#6B7280' };
    }
  }, []);

  // Tính khoảng cách với nhiều phương tiện
  useEffect(() => {
    if (!userLocation || !token) return;

    const fetchDistance = async () => {
      setLoadingDistance(true);
      try {
        const body = {
          originLat: userLocation.lat,
          originLng: userLocation.lng
        };

        if (selectedFriend && selectedFriend.location) {
          body.destLat = selectedFriend.location.lat;
          body.destLng = selectedFriend.location.lng;
          body.destName = selectedFriend.username;
        }

        const response = await fetch(`${API_URL}/distance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();
          setDistanceInfo(data);
        }
      } catch (error) {
        console.error('Lỗi tính khoảng cách:', error);
      }
      setLoadingDistance(false);
    };

    fetchDistance();
  }, [userLocation, selectedFriend, token, API_URL]);

  // Tính chỉ đường khi chọn bạn hoặc đổi phương tiện
  useEffect(() => {
    if (!isLoaded || !userLocation || !window.google) {
      setDirections(null);
      return;
    }

    const currentMode = TRANSPORT_MODES.find(m => m.id === selectedTransportMode);
    if (!currentMode) return;

    const travelMode = window.google.maps.TravelMode[currentMode.googleMode];
    if (!travelMode) return;

    const directionsService = new window.google.maps.DirectionsService();
    const destination = (selectedFriend && selectedFriend.location) 
      ? selectedFriend.location 
      : BACH_KHOA_LOCATION;

    const routeOptions = {
      origin: new window.google.maps.LatLng(userLocation.lat, userLocation.lng),
      destination: new window.google.maps.LatLng(destination.lat, destination.lng),
      travelMode: travelMode,
      provideRouteAlternatives: true
    };

    if (currentMode.googleMode === 'DRIVING') {
      routeOptions.drivingOptions = {
        departureTime: new Date(),
        trafficModel: 'bestguess'
      };
      if (currentMode.avoidHighways) {
        routeOptions.avoidHighways = true;
      }
    }

    directionsService.route(routeOptions, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        if (result.routes && result.routes.length > 0) {
          let shortestRouteIndex = 0;
          let shortestDistance = result.routes[0].legs[0].distance.value;
          
          result.routes.forEach((route, index) => {
            const distance = route.legs[0].distance.value;
            if (distance < shortestDistance) {
              shortestDistance = distance;
              shortestRouteIndex = index;
            }
          });
          
          const selectedRoute = result.routes[shortestRouteIndex];
          result.routes = [selectedRoute];
        }
        setDirections(result);
      } else {
        console.error('Lỗi tính đường đi:', status);
        setDirections(null);
      }
    });
  }, [isLoaded, userLocation, selectedFriend, selectedTransportMode]);

  // Map options
  const mapOptions = useMemo(() => ({
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true
  }), []);

  // Loading state
  if (loadError) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Lỗi tải bản đồ</div>;
  }

  if (!isLoaded) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f0f0f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #8B5CF6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Đang tải bản đồ...</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userLocation || defaultCenter}
        zoom={14}
        options={mapOptions}
      >
        {/* Marker của bạn - màu xanh dương */}
        {userLocation && (
          <Marker
            position={userLocation}
            title="Vị trí của bạn"
            zIndex={1000}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }}
          />
        )}

        {/* Marker của bạn bè */}
        {friends.map(friend =>
          friend.location ? (
            <Marker
              key={friend.id}
              position={friend.location}
              label={{
                text: friend.username,
                color: 'white',
                fontWeight: 'bold'
              }}
              icon={{
                url: selectedFriend?.id === friend.id
                  ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                  : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
              }}
            />
          ) : null
        )}

        {/* Marker Bách Khoa */}
        {(!selectedFriend || !selectedFriend.location) && (
          <Marker
            position={BACH_KHOA_LOCATION}
            title="ĐH Bách Khoa Hà Nội"
            zIndex={999}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }}
          />
        )}

        {/* Đường đi */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#8B5CF6',
                strokeWeight: 6
              }
            }}
          />
        )}
      </GoogleMap>

      {/* Transport Mode Selector */}
      {userLocation && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          backgroundColor: 'white',
          borderRadius: '50px',
          padding: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          {TRANSPORT_MODES.map((mode) => {
            const isSelected = selectedTransportMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedTransportMode(mode.id)}
                title={mode.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '25px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: isSelected ? '#8B5CF6' : '#F3F4F6',
                  color: isSelected ? 'white' : '#6B7280',
                  fontWeight: isSelected ? '600' : '500',
                  fontSize: '13px'
                }}
              >
                {mode.id === 'driving' && <Car style={{ width: '16px', height: '16px' }} />}
                {mode.id === 'motorbike' && <Navigation style={{ width: '16px', height: '16px' }} />}
                {mode.id === 'bicycling' && <Navigation style={{ width: '16px', height: '16px' }} />}
                {mode.id === 'walking' && <User style={{ width: '16px', height: '16px' }} />}
                {mode.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Panel thông tin khoảng cách */}
      {userLocation && distanceInfo && distanceInfo.modes && distanceInfo.modes.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          maxWidth: '420px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Navigation style={{ width: '22px', height: '22px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 'bold', margin: 0, fontSize: '16px' }}>
                  Đến {distanceInfo.destination.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                  Khoảng cách & thời gian di chuyển
                </p>
              </div>
            </div>
            {selectedFriend && (
              <button
                onClick={onClearRoute}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Grid các phương tiện */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '10px' 
          }}>
            {distanceInfo.modes.map((mode) => {
              const colors = getModeColor(mode.mode);
              return (
                <div
                  key={mode.mode}
                  style={{
                    padding: '12px',
                    backgroundColor: colors.bg,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{ color: colors.color }}>
                    {getModeIcon(mode.mode)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontSize: '11px', 
                      color: '#666', 
                      margin: 0,
                      fontWeight: '500'
                    }}>
                      {mode.modeName}
                    </p>
                    <p style={{ 
                      fontWeight: '600', 
                      margin: 0, 
                      fontSize: '14px',
                      color: colors.color
                    }}>
                      {mode.duration}
                    </p>
                    <p style={{ 
                      fontSize: '11px', 
                      color: '#888', 
                      margin: 0 
                    }}>
                      {mode.distance}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {loadingDistance && (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '12px' }}>
              Đang tính toán...
            </p>
          )}
        </div>
      )}

      {/* Trạng thái chia sẻ vị trí */}
      {userLocation && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: '8px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#10B981',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              Đang chia sẻ vị trí
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
            {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default MapView;
