import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Auth.module.css';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください');
      setIsLoading(false);
      return;
    }

    try {
      // 簡易的な管理者認証（実際の本番環境では絶対に使わないでください）
      const adminUsername = 'admin';
      const adminPassword = 'admin123';
      
      if (username === adminUsername && password === adminPassword) {
        // セッションストレージに管理者フラグを保存
        sessionStorage.setItem('isAdmin', 'true');
        
        // 遅延を入れてユーザー体験を向上
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 500);
      } else {
        setError('管理者ID・パスワードが正しくありません');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('管理者ログインエラー:', error);
      setError('ログインに失敗しました。管理者アカウント情報を確認してください。');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>管理者ログイン | Torihada Training</title>
        <meta name="description" content="Torihada Training管理者ページ" />
      </Head>

      <main className={styles.main}>
        <div className={styles.authContainer}>
          <h1 className={styles.title}>Torihada Training</h1>
          <h2 className={styles.subtitle}>管理者ログイン</h2>

          {error && <div className={styles.error}>{error}</div>}
          
          <form onSubmit={handleAdminLogin} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="username">管理者ID</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="管理者IDを入力"
                disabled={isLoading}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                disabled={isLoading}
                required
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
          
          <div className={styles.links}>
            <a
              href="/"
              className={styles.link}
              onClick={(e) => {
                e.preventDefault();
                router.push('/');
              }}
            >
              ホームに戻る
            </a>
          </div>
        </div>
      </main>
    </div>
  );
} 