import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Game.module.css';
import rankingStyles from '../../styles/Ranking.module.css';

// ランキングモード
const RANKING_MODES = [
  { id: 'total', name: '総合スコア' },
  { id: 'bot', name: 'Bot対戦' },
  { id: 'multi', name: 'マルチプレイヤー' }
];

// 仮のランキングデータ（実際はSupabaseから取得）
const MOCK_RANKINGS = {
  total: [
    { id: 1, username: "テトリスマスター", score: 15420, level: 10, lines: 85, date: "2023-04-01" },
    { id: 2, username: "ブロッカー", score: 12380, level: 8, lines: 64, date: "2023-04-02" },
    { id: 3, username: "ラインクリアラー", score: 10750, level: 7, lines: 56, date: "2023-04-03" },
    { id: 4, username: "テトロミノ", score: 9300, level: 6, lines: 49, date: "2023-04-04" },
    { id: 5, username: "ブロック職人", score: 8250, level: 6, lines: 45, date: "2023-04-05" },
    { id: 6, username: "フォーライン", score: 7680, level: 5, lines: 40, date: "2023-04-06" },
    { id: 7, username: "カラフルブロック", score: 6420, level: 5, lines: 35, date: "2023-04-07" },
    { id: 8, username: "テトラクリア", score: 5760, level: 4, lines: 32, date: "2023-04-08" },
    { id: 9, username: "ブロックドロッパー", score: 4950, level: 4, lines: 28, date: "2023-04-09" },
    { id: 10, username: "ライン消し太郎", score: 4320, level: 3, lines: 25, date: "2023-04-10" }
  ],
  bot: [
    { id: 1, username: "テトリスマスター", score: 12500, level: 8, lines: 70, difficulty: "激むず", date: "2023-04-01" },
    { id: 2, username: "ブロッカー", score: 10200, level: 7, lines: 58, difficulty: "難しい", date: "2023-04-02" },
    { id: 3, username: "ラインクリアラー", score: 8950, level: 6, lines: 48, difficulty: "普通", date: "2023-04-03" },
    { id: 4, username: "テトロミノ", score: 7600, level: 5, lines: 42, difficulty: "難しい", date: "2023-04-04" },
    { id: 5, username: "ブロック職人", score: 6850, level: 5, lines: 38, difficulty: "普通", date: "2023-04-05" }
  ],
  multi: [
    { id: 1, username: "テトリスマスター", wins: 15, losses: 3, score: 12800, level: 8, lines: 75, date: "2023-04-01" },
    { id: 2, username: "ブロッカー", wins: 12, losses: 5, score: 10500, level: 7, lines: 62, date: "2023-04-02" },
    { id: 3, username: "ラインクリアラー", wins: 10, losses: 6, score: 9200, level: 6, lines: 54, date: "2023-04-03" },
    { id: 4, username: "テトロミノ", wins: 8, losses: 7, score: 7850, level: 5, lines: 46, date: "2023-04-04" },
    { id: 5, username: "ブロック職人", wins: 7, losses: 8, score: 6700, level: 5, lines: 40, date: "2023-04-05" }
  ]
};

export default function Ranking() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState(RANKING_MODES[0]);
  const [rankings, setRankings] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ランキングデータを取得（実際はSupabaseから取得）
  useEffect(() => {
    setIsLoading(true);
    
    // 仮のロード遅延
    setTimeout(() => {
      setRankings(MOCK_RANKINGS[selectedMode.id]);
      
      // 仮のユーザーランク（実際はログインユーザーのランクを取得）
      setUserRank({
        rank: 24,
        username: "あなた",
        score: 2150,
        level: 2,
        lines: 15,
        date: "2023-04-15"
      });
      
      setIsLoading(false);
    }, 500);
  }, [selectedMode]);
  
  // ランキングモード選択の処理
  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
  };
  
  // ゲームメニューに戻る
  const handleBackToMenu = () => {
    router.push('/game');
  };
  
  // 列データに応じたランキング表を生成
  const renderRankingTable = () => {
    if (isLoading) {
      return (
        <div className={rankingStyles.loadingContainer}>
          <div className={rankingStyles.spinner}></div>
          <p>ランキングデータを読み込み中...</p>
        </div>
      );
    }
    
    // 選択されたモードに基づいてテーブル列を設定
    let columns = [];
    
    switch (selectedMode.id) {
      case 'total':
        columns = [
          { id: 'rank', name: 'ランク', className: rankingStyles.rankColumn },
          { id: 'username', name: 'プレイヤー', className: rankingStyles.usernameColumn },
          { id: 'score', name: 'スコア', className: rankingStyles.scoreColumn },
          { id: 'level', name: 'レベル', className: rankingStyles.levelColumn },
          { id: 'lines', name: 'ライン', className: rankingStyles.linesColumn },
          { id: 'date', name: '日付', className: rankingStyles.dateColumn }
        ];
        break;
      case 'bot':
        columns = [
          { id: 'rank', name: 'ランク', className: rankingStyles.rankColumn },
          { id: 'username', name: 'プレイヤー', className: rankingStyles.usernameColumn },
          { id: 'score', name: 'スコア', className: rankingStyles.scoreColumn },
          { id: 'difficulty', name: '難易度', className: rankingStyles.difficultyColumn },
          { id: 'level', name: 'レベル', className: rankingStyles.levelColumn },
          { id: 'lines', name: 'ライン', className: rankingStyles.linesColumn },
          { id: 'date', name: '日付', className: rankingStyles.dateColumn }
        ];
        break;
      case 'multi':
        columns = [
          { id: 'rank', name: 'ランク', className: rankingStyles.rankColumn },
          { id: 'username', name: 'プレイヤー', className: rankingStyles.usernameColumn },
          { id: 'wins', name: '勝利', className: rankingStyles.winsColumn },
          { id: 'losses', name: '敗北', className: rankingStyles.lossesColumn },
          { id: 'score', name: 'スコア', className: rankingStyles.scoreColumn },
          { id: 'level', name: 'レベル', className: rankingStyles.levelColumn },
          { id: 'lines', name: 'ライン', className: rankingStyles.linesColumn },
          { id: 'date', name: '日付', className: rankingStyles.dateColumn }
        ];
        break;
    }
    
    return (
      <div className={rankingStyles.tableContainer}>
        <table className={rankingStyles.rankingTable}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={column.className}>
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankings.map((rank, index) => (
              <tr key={rank.id} className={rankingStyles.rankRow}>
                <td className={rankingStyles.rankColumn}>
                  <div className={`${rankingStyles.rankBadge} ${index < 3 ? rankingStyles.topRank : ''}`}>
                    {index + 1}
                  </div>
                </td>
                <td className={rankingStyles.usernameColumn}>{rank.username}</td>
                {columns.map((column) => {
                  if (column.id !== 'rank' && column.id !== 'username') {
                    return (
                      <td key={column.id} className={column.className}>
                        {rank[column.id]}
                      </td>
                    );
                  }
                  return null;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {userRank && (
          <div className={rankingStyles.userRankContainer}>
            <div className={rankingStyles.userRankHeader}>あなたのランキング</div>
            <table className={rankingStyles.rankingTable}>
              <tbody>
                <tr className={rankingStyles.userRankRow}>
                  <td className={rankingStyles.rankColumn}>
                    <div className={rankingStyles.rankBadge}>{userRank.rank}</div>
                  </td>
                  <td className={rankingStyles.usernameColumn}>{userRank.username}</td>
                  {columns.map((column) => {
                    if (column.id !== 'rank' && column.id !== 'username' && userRank[column.id] !== undefined) {
                      return (
                        <td key={column.id} className={column.className}>
                          {userRank[column.id]}
                        </td>
                      );
                    }
                    return null;
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>ランキング | Torihada Training</title>
        <meta name="description" content="テトリスゲームのランキング" />
      </Head>
      
      <header className={styles.header}>
        <h1 className={styles.logo}>Torihada Training</h1>
        <div className={styles.version}>v0.1</div>
        <button onClick={handleBackToMenu} className={styles.backButton}>
          メニューに戻る
        </button>
      </header>
      
      <main className={styles.main}>
        <div className={rankingStyles.rankingContainer}>
          <h1 className={rankingStyles.title}>ランキング</h1>
          
          <div className={rankingStyles.modeTabs}>
            {RANKING_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`${rankingStyles.modeTab} ${selectedMode.id === mode.id ? rankingStyles.activeTab : ''}`}
                onClick={() => handleModeSelect(mode)}
              >
                {mode.name}
              </button>
            ))}
          </div>
          
          {renderRankingTable()}
        </div>
      </main>
      
      <footer className={styles.footer}>
        <p>Torihada Training &copy; 2025</p>
      </footer>
    </div>
  );
} 