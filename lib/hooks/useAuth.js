import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// 簡略化したAuth Hook - ユーザー名のみの認証
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 初期ロード時にセッションストレージからユーザー情報を取得
  useEffect(() => {
    const checkUser = () => {
      // セッションストレージからユーザー名を取得
      const username = sessionStorage.getItem('username');
      
      if (username) {
        setUser({ username });
      }
      
      setLoading(false);
    };
    
    checkUser();
  }, []);

  // ユーザー名だけでログイン
  const login = async (username) => {
    if (!username) {
      throw new Error('ユーザー名を入力してください');
    }
    
    try {
      // セッションストレージにユーザー名を保存
      sessionStorage.setItem('username', username);
      setUser({ username });
      return { success: true };
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  };
  
  // 新規ユーザー登録
  const register = async (username) => {
    if (!username) {
      throw new Error('ユーザー名を入力してください');
    }
    
    try {
      // ローカルストレージからユーザーリストを取得
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      
      // ユーザー名が既に存在するか確認
      if (existingUsers.includes(username)) {
        throw new Error('そのユーザー名は既に使用されています');
      }
      
      // 新しいユーザーを追加
      existingUsers.push(username);
      localStorage.setItem('users', JSON.stringify(existingUsers));
      
      // セッションにユーザー名を保存
      sessionStorage.setItem('username', username);
      setUser({ username });
      
      return { success: true };
    } catch (error) {
      console.error('登録エラー:', error);
      throw error;
    }
  };
  
  // ログアウト
  const logout = async () => {
    try {
      // セッションストレージからユーザー情報を削除
      sessionStorage.removeItem('username');
      setUser(null);
      
      // ホームページにリダイレクト
      router.push('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    login,
    register,
    logout
  };
} 