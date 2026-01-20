import React, { useState, useEffect } from 'react';
import { MapPin, Mail, ArrowLeft, Loader } from 'lucide-react';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  
  // Reset password states
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Error/Success message for login form
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const API_URL = process.env.REACT_APP_API_URL;
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // Check for reset token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
      setShowResetPassword(true);
      // Clear URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load Google Sign-In script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    // Chỉ render button khi đang ở trang login chính
    if (showForgotPassword || showResetPassword) return;

    const renderGoogleButton = () => {
      const buttonElement = document.getElementById('google-signin-button');
      if (buttonElement && window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback
        });
        window.google.accounts.id.renderButton(
          buttonElement,
          { 
            theme: 'outline', 
            size: 'large', 
            width: '100%',
            text: 'continue_with',
            locale: 'vi'
          }
        );
      }
    };

    // Nếu script đã load rồi
    if (window.google?.accounts?.id) {
      setTimeout(renderGoogleButton, 100);
      return;
    }

    // Nếu chưa load script
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      setTimeout(renderGoogleButton, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = renderGoogleButton;

    return () => {
      // Không remove script để tránh load lại
    };
  }, [GOOGLE_CLIENT_ID, showForgotPassword, showResetPassword]);

  // Handle Google callback
  const handleGoogleCallback = async (response) => {
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();

      if (res.ok) {
        setErrorMessage('');
        onLoginSuccess(data.token, data.username, data.userId);
      } else {
        setErrorMessage(data.message || 'Lỗi đăng nhập Google');
      }
    } catch (error) {
      console.error('Lỗi Google login:', error);
      setErrorMessage('Không thể kết nối đến server');
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!username || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    if (isRegistering && !email) {
      setErrorMessage('Vui lòng nhập email để đăng ký!');
      return;
    }

    const endpoint = isRegistering ? '/auth/register' : '/auth/login';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        if (isRegistering) {
          setSuccessMessage('Đăng ký thành công! Vui lòng đăng nhập.');
          setErrorMessage('');
          setIsRegistering(false);
          setPassword('');
          setEmail('');
        } else {
          setErrorMessage('');
          onLoginSuccess(data.token, data.username, data.userId);
        }
      } else {
        setErrorMessage(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Lỗi:', error);
      setErrorMessage('Không thể kết nối đến server');
    }
  };

  // Forgot password handler
  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setForgotMessage('Vui lòng nhập email');
      return;
    }

    setForgotLoading(true);
    setForgotMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();

      if (response.ok) {
        setForgotMessage('✅ Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.');
      } else {
        setForgotMessage('❌ ' + (data.message || 'Có lỗi xảy ra'));
      }
    } catch (error) {
      setForgotMessage('❌ Không thể kết nối đến server');
    }

    setForgotLoading(false);
  };

  // Reset password handler
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setResetMessage('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setResetMessage('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage('✅ Đặt lại mật khẩu thành công! Đang chuyển hướng...');
        setTimeout(() => {
          setShowResetPassword(false);
          setResetToken('');
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      } else {
        setResetMessage('❌ ' + (data.message || 'Có lỗi xảy ra'));
      }
    } catch (error) {
      setResetMessage('❌ Không thể kết nối đến server');
    }

    setResetLoading(false);
  };

  // Reset Password Form
  if (showResetPassword) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '32px',
          width: '100%',
          maxWidth: '400px',
          margin: 'auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <MapPin style={{ width: '48px', height: '48px', color: '#8B5CF6', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Đặt lại mật khẩu</h2>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {resetMessage && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: resetMessage.includes('✅') ? '#D1FAE5' : '#FEE2E2',
              color: resetMessage.includes('✅') ? '#065F46' : '#991B1B',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {resetMessage}
            </div>
          )}

          <button
            onClick={handleResetPassword}
            disabled={resetLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: resetLoading ? 'not-allowed' : 'pointer',
              opacity: resetLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {resetLoading && <Loader size={18} className="spin" />}
            Đặt lại mật khẩu
          </button>
        </div>
      </div>
    );
  }

  // Forgot Password Form
  if (showForgotPassword) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '32px',
          width: '100%',
          maxWidth: '400px',
          margin: 'auto'
        }}>
          <button
            onClick={() => { setShowForgotPassword(false); setForgotMessage(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              marginBottom: '16px'
            }}
          >
            <ArrowLeft size={18} /> Quay lại
          </button>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Mail style={{ width: '48px', height: '48px', color: '#8B5CF6', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Quên mật khẩu?</h2>
            <p style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>
              Nhập email của bạn để nhận link đặt lại mật khẩu
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {forgotMessage && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: forgotMessage.includes('✅') ? '#D1FAE5' : '#FEE2E2',
              color: forgotMessage.includes('✅') ? '#065F46' : '#991B1B',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {forgotMessage}
            </div>
          )}

          <button
            onClick={handleForgotPassword}
            disabled={forgotLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: forgotLoading ? 'not-allowed' : 'pointer',
              opacity: forgotLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {forgotLoading && <Loader size={18} className="spin" />}
            Gửi email đặt lại mật khẩu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '16px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        margin: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <MapPin style={{ 
            width: '64px', 
            height: '64px', 
            color: '#8B5CF6', 
            margin: '0 auto 16px' 
          }} />
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            FindUrPal
          </h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Chia sẻ vị trí với bạn bè
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#DC2626',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            {errorMessage}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#D1FAE5',
            border: '1px solid #A7F3D0',
            borderRadius: '8px',
            color: '#059669',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>✅</span>
            {successMessage}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '8px' 
          }}>
            Tên đăng nhập
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="alice"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {isRegistering && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              marginBottom: '8px' 
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '8px' 
          }}>
            Mật khẩu
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {!isRegistering && (
          <div style={{ textAlign: 'right', marginBottom: '16px' }}>
            <button
              onClick={() => setShowForgotPassword(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8B5CF6',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Quên mật khẩu?
            </button>
          </div>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {isRegistering ? 'Đăng ký' : 'Đăng nhập'}
        </button>

        {/* Google Sign In */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              margin: '20px 0',
              gap: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
              <span style={{ color: '#666', fontSize: '13px' }}>hoặc</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
            </div>

            <div id="google-signin-button" style={{ width: '100%' }} />
          </>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={() => { setIsRegistering(!isRegistering); setEmail(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B5CF6',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default Login;