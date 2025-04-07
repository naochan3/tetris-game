import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Admin.module.css';

export default function AdminDashboard() {
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const router = useRouter();

  // クライアントサイドでのみ実行する処理
  useEffect(() => {
    // 管理者権限チェック（簡易的な実装）
    const checkAdminStatus = () => {
      const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
      setIsAdminUser(isAdmin);
      
      if (!isAdmin) {
        router.push('/admin');
      }
    };
    
    checkAdminStatus();
  }, [router]);

  // APIキー設定の確認（クライアントサイドのみ）
  useEffect(() => {
    // 仮のロジック：APIキーがすでに設定されているかチェック
    const fetchApiKey = () => {
      try {
        // 仮のロジック
        const storedApiKey = 'sk-******************************************';
        if (storedApiKey) {
          setSavedApiKey(storedApiKey);
        }
      } catch (error) {
        console.error('APIキー取得エラー:', error);
        setError('APIキーの取得に失敗しました');
      }
    };

    if (isAdminUser) {
      fetchApiKey();
    }
  }, [isAdminUser]);

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!apiKey) {
      setError('APIキーを入力してください');
      return;
    }

    try {
      // APIキーの形式確認
      if (!apiKey.startsWith('sk-')) {
        setError('APIキーの形式が正しくありません。sk-から始まる必要があります。');
        return;
      }

      // セッションストレージに保存（Botモードで使用するため）
      sessionStorage.setItem('openaiApiKey', apiKey);
      
      // 表示用に保存
      setSavedApiKey('sk-' + '*'.repeat(apiKey.length - 3));
      setApiKey('');
      setMessage('APIキーが正常に保存されました。このキーはBot対戦モードで使用されます。');
    } catch (error) {
      console.error('APIキー保存エラー:', error);
      setError('APIキーの保存に失敗しました');
    }
  };

  const handleDeleteApiKey = async () => {
    try {
      // セッションストレージからも削除
      sessionStorage.removeItem('openaiApiKey');
      
      setSavedApiKey('');
      setMessage('APIキーが正常に削除されました');
    } catch (error) {
      console.error('APIキー削除エラー:', error);
      setError('APIキーの削除に失敗しました');
    }
  };

  const handleLogout = () => {
    // セッションストレージから管理者フラグを削除
    sessionStorage.removeItem('isAdmin');
    router.push('/admin');
  };

  // サーバーサイドレンダリング時は何も表示しない
  if (typeof window === 'undefined') {
    return null;
  }

  // 管理者でない場合も何も表示しない
  if (!isAdminUser) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>管理者ダッシュボード | Torihada Training</title>
        <meta name="description" content="Torihada Training管理者ダッシュボード" />
      </Head>

      <header className={styles.header}>
        <h1>管理者ダッシュボード</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          ログアウト
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>ChatGPT APIキー管理</h2>
          
          <div className={styles.apiKeyStatus}>
            <h3>現在のAPIキーの状態:</h3>
            {savedApiKey ? (
              <div className={styles.keyInfo}>
                <p>APIキー: {savedApiKey}</p>
                <button 
                  onClick={handleDeleteApiKey} 
                  className={styles.deleteButton}
                >
                  APIキーを削除
                </button>
              </div>
            ) : (
              <p>APIキーが設定されていません</p>
            )}
          </div>

          <form onSubmit={handleSaveApiKey} className={styles.apiKeyForm}>
            <h3>新しいAPIキーを設定:</h3>
            {message && <p className={styles.message}>{message}</p>}
            {error && <p className={styles.error}>{error}</p>}
            
            <div className={styles.inputGroup}>
              <label htmlFor="apiKey">ChatGPT APIキー</label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <button type="submit" className={styles.button}>
              保存
            </button>
          </form>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Torihada Training 管理者ページ &copy; 2025</p>
      </footer>
    </div>
  );
} 