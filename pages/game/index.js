import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Game.module.css';

export default function GameMenu() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  
  useEffect(() => {
    // ユーザー名の取得（セッションストレージから）
    const storedUsername = sessionStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);
  
  // ユーザー名の保存
  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    sessionStorage.setItem('username', newUsername);
  };
  
  // ホームに戻る
  const handleBackHome = () => {
    router.push('/');
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>ゲームメニュー | Torihada Training</title>
        <meta name="description" content="テトリスゲームメニュー" />
      </Head>
      
      <header className={styles.header}>
        <h1 className={styles.logo}>Torihada Training</h1>
        <div className={styles.version}>v0.1</div>
        <button onClick={handleBackHome} className={styles.backButton}>
          ホームに戻る
        </button>
      </header>
      
      <main className={styles.main}>
        <div className={styles.usernameSection}>
          <label htmlFor="username" className={styles.usernameLabel}>ユーザー名:</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="ユーザー名を入力"
            className={styles.usernameInput}
            maxLength={15}
          />
        </div>
        
        <div className={styles.modesGrid}>
          <div className={styles.modeCard} onClick={() => router.push('/game/single')}>
            <h2 className={styles.modeTitle}>シングルプレイヤー</h2>
            <p className={styles.modeDescription}>
              時間制限なしでじっくりプレイ
            </p>
            <div className={styles.modeFooter}>
              <span className={styles.modeIcon}>👤</span>
              <button className={styles.modeButton}>
                プレイ
              </button>
            </div>
          </div>
          
          <div className={styles.modeCard} onClick={() => router.push('/game/lobby')}>
            <h2 className={styles.modeTitle}>マルチプレイヤー</h2>
            <p className={styles.modeDescription}>
              他のプレイヤーとリアルタイム対戦
            </p>
            <div className={styles.modeFooter}>
              <span className={styles.modeIcon}>👥</span>
              <button className={styles.modeButton}>
                プレイ
              </button>
            </div>
          </div>
          
          <div className={styles.modeCard} onClick={() => router.push('/game/challenge')}>
            <h2 className={styles.modeTitle}>チャレンジモード</h2>
            <p className={styles.modeDescription}>
              様々な条件でハイスコアに挑戦
            </p>
            <div className={styles.modeFooter}>
              <span className={styles.modeIcon}>🏆</span>
              <button className={styles.modeButton}>
                プレイ
              </button>
            </div>
          </div>
          
          <div className={styles.modeCard} onClick={() => router.push('/game/practice')}>
            <h2 className={styles.modeTitle}>練習モード</h2>
            <p className={styles.modeDescription}>
              特定の状況や配置を練習
            </p>
            <div className={styles.modeFooter}>
              <span className={styles.modeIcon}>📝</span>
              <button className={styles.modeButton}>
                プレイ
              </button>
            </div>
          </div>
        </div>
        
        <div className={styles.infoSection}>
          <h3>ゲームルール</h3>
          <p>
            テトリスはブロックを積み重ねて横一列を揃えると消えるパズルゲームです。
            落ちてくるテトリミノを操作して、できるだけ多くのラインを消しましょう。
          </p>
          <h3>操作方法</h3>
          <div className={styles.controlsGrid}>
            <div className={styles.controlItem}>
              <span className={styles.controlKey}>←→</span>
              <span className={styles.controlDesc}>左右移動</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.controlKey}>↓</span>
              <span className={styles.controlDesc}>下に移動</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.controlKey}>↑ / X</span>
              <span className={styles.controlDesc}>回転</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.controlKey}>Shift / C</span>
              <span className={styles.controlDesc}>ホールド</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.controlKey}>スペース</span>
              <span className={styles.controlDesc}>ハードドロップ</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.controlKey}>ESC</span>
              <span className={styles.controlDesc}>一時停止</span>
            </div>
          </div>
        </div>
      </main>
      
      <footer className={styles.footer}>
        <p>Torihada Training &copy; 2025</p>
      </footer>
    </div>
  );
} 