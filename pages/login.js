import { useEffect } from 'react';

// このページは使用しません
export default function Login() {
  // マウント時に直接リダイレクト
  useEffect(() => {
    // 直接リダイレクト
    window.location.href = '/register';
  }, []);
  
  // シンプルな表示
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: '#000428',
      color: 'white'
    }}>
      リダイレクト中...
    </div>
  );
} 