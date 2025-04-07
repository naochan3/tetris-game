import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGamepad, faUser, faCubes, faTrophy, faGlobe, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export default function Home({ socket, isConnected, connectionAttempted, useLocalFallback }) {
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // サーバーサイドレンダリング時は実行しない
    if (typeof window === 'undefined') return;
    
    // ローカルストレージからユーザー名を取得
    const storedName = localStorage.getItem('tetris_username');
    if (storedName) {
      setUsername(storedName);
    }

    // オンラインユーザー数の取得
    if (socket) {
      socket.on('stats:update', (stats) => {
        setOnlineUsers(stats.onlineUsers || 0);
        setLoading(false);
      });

      // 最新の統計情報をリクエスト
      socket.emit('stats:get');

      return () => {
        socket.off('stats:update');
      };
    } else if (connectionAttempted || useLocalFallback) {
      // フォールバック: ローカルモードの場合
      if (typeof window !== 'undefined') {
        setOnlineUsers(window.globalOnlineUsers?.length || 0);
      }
      setLoading(false);
    }

    // 一定時間後にローディングを解除（タイムアウト対策）
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [socket, loading, connectionAttempted, useLocalFallback]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setErrorMessage('ユーザー名を入力してください');
      return;
    }
    
    if (username.trim().length < 2 || username.trim().length > 20) {
      setErrorMessage('ユーザー名は2〜20文字で入力してください');
      return;
    }
    
    // ユーザー名を保存
    localStorage.setItem('tetris_username', username.trim());
    
    // ユーザーIDがない場合は生成して保存
    if (!localStorage.getItem('tetris_userId')) {
      const userId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      localStorage.setItem('tetris_userId', userId);
    }
    
    // ソケットが利用可能な場合はログイン
    if (socket && socket.connected) {
      socket.emit('user:login', {
        userId: localStorage.getItem('tetris_userId'),
        username: username.trim()
      });
    } else if (useLocalFallback && typeof window !== 'undefined') {
      // ローカルモードの場合はグローバル変数を更新
      const userId = localStorage.getItem('tetris_userId');
      // 既存のユーザーを削除
      window.globalOnlineUsers = window.globalOnlineUsers.filter(u => u.id !== userId);
      // 新しいユーザーを追加
      window.globalOnlineUsers.push({
        id: userId,
        name: username.trim(),
        status: 'online',
        joinedAt: new Date()
      });
    }
    
    // ロビーに移動
    router.push('/game/lobby');
  };

  // 接続状態の表示テキスト
  const getConnectionStatusText = () => {
    if (isConnected) {
      return 'サーバー接続済み';
    } else if (connectionAttempted || useLocalFallback) {
      return 'ローカルモードで動作中';
    } else {
      return 'サーバー接続中...';
    }
  };

  // オンラインユーザー数の表示テキスト
  const getOnlineUsersText = () => {
    if (loading) {
      return '読込中...';
    } else if (connectionAttempted || useLocalFallback) {
      if (typeof window !== 'undefined') {
        return `${window.globalOnlineUsers?.length || 0}人 (ローカル)`;
      }
      return '0人 (ローカル)';
    } else {
      return `${onlineUsers}人`;
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>テトリスバトル - オンライン対戦テトリス</title>
        <meta name="description" content="オンラインでリアルタイム対戦できるテトリスゲーム" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles.bgOverlay}></div>

      <main className={styles.main}>
        <div className={styles.titleContainer}>
          <div className={styles.logoAnimation}>
            <FontAwesomeIcon icon={faCubes} className={styles.logoIcon} />
          </div>
          <h1 className={styles.title}>
            TETRIS BATTLE
          </h1>
          <p className={styles.subtitle}>オンライン対戦テトリス</p>
        </div>

        {(connectionAttempted || useLocalFallback) && (
          <div className={styles.connectionNotice}>
            <FontAwesomeIcon icon={faExclamationTriangle} className={styles.noticeIcon} />
            <p>サーバーに接続できません。ローカルモードで動作しています。</p>
          </div>
        )}

        <div className={styles.formContainer}>
          {errorMessage && (
            <div className={styles.errorMessage}>
              <p>{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <FontAwesomeIcon icon={faUser} className={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                className={styles.input}
                maxLength={20}
              />
            </div>
            <button 
              type="submit" 
              className={styles.button}
              disabled={!username.trim()}
            >
              <FontAwesomeIcon icon={faGamepad} /> 
              プレイ開始
            </button>
          </form>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.connectionStatus}>
            <div className={`${styles.statusIndicator} ${isConnected ? styles.online : (connectionAttempted || useLocalFallback) ? styles.local : styles.offline}`}></div>
            <span>{getConnectionStatusText()}</span>
          </div>
          <div className={styles.onlineCount}>
            <FontAwesomeIcon icon={faGlobe} />
            <span>オンライン: {getOnlineUsersText()}</span>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>© 2023 テトリスバトル. All Rights Reserved.</p>
      </footer>
    </div>
  );
} 