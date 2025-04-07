import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Game.module.css';
import challengeStyles from '../../styles/Challenge.module.css';

// チャレンジの種類を定義
const CHALLENGES = [
  {
    id: 'speedrun',
    title: 'スピードラン',
    description: '40ラインを最速でクリアせよ！',
    goal: '40ラインを消す',
    difficulty: 'medium',
    icon: '⏱️'
  },
  {
    id: 'marathon',
    title: 'マラソン',
    description: '15分間でどれだけスコアを稼げるか挑戦！',
    goal: '15分間プレイ',
    difficulty: 'medium',
    icon: '🏃'
  },
  {
    id: 'ultra',
    title: 'ウルトラ',
    description: '2分間でどれだけスコアを稼げるか挑戦！',
    goal: '2分間でハイスコア',
    difficulty: 'hard',
    icon: '🔥'
  },
  {
    id: 'survival',
    title: 'サバイバル',
    description: '1ラインも消さずに何個のブロックを置けるか？',
    goal: 'ラインを消さない',
    difficulty: 'extreme',
    icon: '💀'
  },
  {
    id: 'master',
    title: 'テトリスマスター',
    description: '超高速落下！レベル15からのスタート',
    goal: 'できるだけ長く生き残る',
    difficulty: 'extreme',
    icon: '👑'
  },
  {
    id: 'coming-soon',
    title: '近日公開',
    description: '新しいチャレンジモードを準備中...',
    goal: '準備中',
    difficulty: 'unknown',
    icon: '🔜',
    disabled: true
  }
];

export default function Challenge() {
  const router = useRouter();
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [highScores, setHighScores] = useState({});
  
  // 初期化
  useEffect(() => {
    // ローカルストレージからハイスコアを読み込み
    const storedScores = localStorage.getItem('tetrisChallengeScores');
    if (storedScores) {
      setHighScores(JSON.parse(storedScores));
    }
  }, []);
  
  // チャレンジ選択時の処理
  const handleChallengeSelect = (challenge) => {
    if (challenge.disabled) return;
    
    setSelectedChallenge(challenge);
    
    // 開発中なので、現在は選択するとメッセージを表示するだけ
    alert(`${challenge.title}は現在開発中です。完成をお待ちください！`);
    
    // 実際の実装では、選択したチャレンジに対応するゲームページに遷移
    // router.push(`/game/challenge/${challenge.id}`);
  };
  
  // メニューに戻る
  const handleBackToMenu = () => {
    router.push('/game');
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>チャレンジモード | Torihada Training</title>
        <meta name="description" content="テトリスのチャレンジモード" />
      </Head>
      
      <header className={styles.header}>
        <h1 className={styles.logo}>Torihada Training</h1>
        <div className={styles.version}>v0.1</div>
        <button onClick={handleBackToMenu} className={styles.backButton}>
          メニューに戻る
        </button>
      </header>
      
      <main className={styles.main}>
        <div className={challengeStyles.challengeContainer}>
          <h1 className={challengeStyles.title}>チャレンジモード</h1>
          <p className={challengeStyles.subtitle}>様々な条件でスキルを試そう！</p>
          
          <div className={challengeStyles.noticeBox}>
            <div className={challengeStyles.noticeIcon}>🚧</div>
            <div className={challengeStyles.noticeText}>
              <h3>開発中のコンテンツ</h3>
              <p>チャレンジモードは現在開発中です。近日公開予定ですので、もうしばらくお待ちください。</p>
            </div>
          </div>
          
          <div className={challengeStyles.challengeGrid}>
            {CHALLENGES.map((challenge) => (
              <div 
                key={challenge.id}
                className={`${challengeStyles.challengeCard} ${challenge.disabled ? challengeStyles.disabled : ''}`}
                onClick={() => handleChallengeSelect(challenge)}
              >
                <div className={challengeStyles.challengeIcon}>{challenge.icon}</div>
                <h2 className={challengeStyles.challengeTitle}>{challenge.title}</h2>
                <p className={challengeStyles.challengeDescription}>{challenge.description}</p>
                <div className={challengeStyles.challengeFooter}>
                  <div className={`${challengeStyles.difficultyBadge} ${challengeStyles[challenge.difficulty]}`}>
                    {challenge.difficulty === 'easy' && '初級'}
                    {challenge.difficulty === 'medium' && '中級'}
                    {challenge.difficulty === 'hard' && '上級'}
                    {challenge.difficulty === 'extreme' && '超上級'}
                    {challenge.difficulty === 'unknown' && '???'}
                  </div>
                  
                  <div className={challengeStyles.highScore}>
                    {highScores[challenge.id] ? (
                      <span>ハイスコア: {highScores[challenge.id]}</span>
                    ) : (
                      <span>未挑戦</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className={challengeStyles.comingSoon}>
            <h3>今後のアップデートでさらに多くのチャレンジが追加されます！</h3>
            <p>あなたのフィードバックや要望をお待ちしています。</p>
          </div>
        </div>
      </main>
      
      <footer className={styles.footer}>
        <p>Torihada Training &copy; 2025</p>
      </footer>
    </div>
  );
} 