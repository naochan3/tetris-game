import Head from 'next/head';
import { useState } from 'react';
import styles from '../styles/Auth.module.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }
    
    // 直接ローカルストレージに保存
    try {
      // セッションストレージにユーザー名を保存
      sessionStorage.setItem('username', username);
      
      // 直接ページを移動（router.pushではなくWindowのロケーションを使用）
      window.location.href = '/game';
    } catch (error) {
      console.error('エラー:', error);
      setError('エラーが発生しました。もう一度お試しください。');
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Torihada Training</title>
        <meta name="description" content="テトリスゲーム" />
      </Head>

      <main className={styles.main}>
        <div className={styles.authContainer}>
          <h1 className={styles.title}>Torihada Training</h1>
          <h2 className={styles.subtitle}>ユーザー名を入力</h2>
          
          {error && <div className={styles.error}>{error}</div>}
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="username">ユーザー名</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className={styles.submitButton}
            >
              ゲームを始める
            </button>
          </form>
          
          <div className={styles.links}>
            <a
              href="/"
              className={styles.link}
            >
              ホームに戻る
            </a>
          </div>
        </div>
      </main>
    </div>
  );
} 