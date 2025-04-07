import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Ranking.module.css';

export default function Ranking() {
  const router = useRouter();
  const [rankings, setRankings] = useState([]);
  const [currentUsername, setCurrentUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (mounted) {
      try {
        // ユーザーデータを取得
        const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
        
        // 現在のユーザー名を取得
        const username = sessionStorage.getItem('username') || '';
        setCurrentUsername(username);
        
        // ユーザーデータを配列に変換
        const rankingsData = Object.entries(usersData).map(([username, data]) => ({
          username,
          rating: data.rating || 1000,
          wins: data.wins || 0,
          losses: data.losses || 0,
          gamesPlayed: (data.wins || 0) + (data.losses || 0),
          winRate: data.wins > 0 ? Math.round((data.wins / ((data.wins || 0) + (data.losses || 0))) * 100) : 0
        }));
        
        // レーティング順にソート
        const sortedRankings = rankingsData.sort((a, b) => b.rating - a.rating);
        setRankings(sortedRankings);
        setIsLoading(false);
      } catch (error) {
        console.error('ランキングデータの取得エラー:', error);
        setIsLoading(false);
      }
    }
  }, [mounted]);

  const handleBackToHome = () => {
    router.push('/');
  };

  const handlePlayGame = () => {
    if (currentUsername) {
      router.push('/game');
    } else {
      router.push('/register');
    }
  };

  const getRankStyle = (index) => {
    if (index === 0) return styles.firstRank;
    if (index === 1) return styles.secondRank;
    if (index === 2) return styles.thirdRank;
    return '';
  };
  
  // クライアントサイドレンダリングを待つ
  if (!mounted) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#6b5be6',
        color: 'white',
        fontSize: '1.5rem'
      }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>ランキング | Torihada Training</title>
        <meta name="description" content="テトリスゲームのプレイヤーランキング" />
      </Head>

      <header className={styles.header}>
        <h1 className={styles.title}>Torihada Training</h1>
        <h2 className={styles.subtitle}>プレイヤーランキング</h2>
      </header>

      <main className={styles.main}>
        {isLoading ? (
          <div className={styles.loading}>ランキングデータを読み込み中...</div>
        ) : rankings.length > 0 ? (
          <div className={styles.rankingContainer}>
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th className={styles.rankColumn}>順位</th>
                  <th className={styles.nameColumn}>プレイヤー名</th>
                  <th className={styles.ratingColumn}>レーティング</th>
                  <th className={styles.winsColumn}>勝利数</th>
                  <th className={styles.lossesColumn}>敗北数</th>
                  <th className={styles.winRateColumn}>勝率</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((player, index) => (
                  <tr 
                    key={player.username} 
                    className={`${styles.rankRow} ${player.username === currentUsername ? styles.currentPlayer : ''} ${getRankStyle(index)}`}
                  >
                    <td className={styles.rankColumn}>{index + 1}</td>
                    <td className={styles.nameColumn}>{player.username}</td>
                    <td className={styles.ratingColumn}>{player.rating}</td>
                    <td className={styles.winsColumn}>{player.wins}</td>
                    <td className={styles.lossesColumn}>{player.losses}</td>
                    <td className={styles.winRateColumn}>{player.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.noData}>
            <p>ランキングデータがありません。</p>
            <p>ゲームをプレイしてランキングに参加しましょう！</p>
          </div>
        )}

        <div className={styles.buttonContainer}>
          <button className={styles.button} onClick={handlePlayGame}>
            {currentUsername ? 'ゲームをプレイ' : 'ゲームを始める'}
          </button>
          <button className={styles.button} onClick={handleBackToHome}>
            ホームに戻る
          </button>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Torihada Training &copy; 2025</p>
      </footer>
    </div>
  );
} 