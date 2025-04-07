import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function BotRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Bot対戦ページにリダイレクト
    router.replace('/game/bot');
  }, [router]);
  
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: '#000428',
      color: 'white',
      fontSize: '1.5rem'
    }}>
      <div>Bot対戦ページに移動中...</div>
    </div>
  );
} 