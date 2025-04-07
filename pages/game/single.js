import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Game.module.css';
import singleStyles from '../../styles/SingleGame.module.css';
import TetrisBoard from '../../components/TetrisBoard';
import NextPieceDisplay from '../../components/NextPieceDisplay';
import HoldPieceDisplay from '../../components/HoldPieceDisplay';
import ScoreDisplay from '../../components/ScoreDisplay';
import { TetrisGame } from '../../lib/tetrisLogic';

export default function SingleGame() {
  const router = useRouter();
  const [gamePhase, setGamePhase] = useState('playing'); // playing, paused, gameover
  const [gameState, setGameState] = useState(null);
  const [highScore, setHighScore] = useState(0);
  const [username, setUsername] = useState('プレイヤー');
  
  // ゲームインスタンスの参照
  const gameRef = useRef(null);
  // ゲームループのタイマーID
  const gameLoopRef = useRef(null);
  // 落下タイマーID
  const dropTimerRef = useRef(null);
  // キー入力状態
  const keyStateRef = useRef({});
  // 最後のキー処理時刻（連続入力制御用）
  const lastMoveTimeRef = useRef({ left: 0, right: 0, down: 0 });
  
  // ゲームの初期化
  useEffect(() => {
    // ユーザー名を取得（sessionStorageから）
    const storedUsername = sessionStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
    
    // ハイスコアを取得（ローカルストレージから）
    const storedHighScore = localStorage.getItem('tetrisHighScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
    
    // ゲームインスタンス作成
    initializeGame();
    
    // クリーンアップ
    return () => {
      // ゲームループとタイマーをクリア
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      
      stopDropTimer();
    };
  }, []);
  
  // ゲームの初期化
  const initializeGame = () => {
    // テトリスゲームのインスタンスを作成
    const game = new TetrisGame();
    gameRef.current = game;
    
    // 初期状態を設定
    setGameState(game.getGameState());
    
    // ゲームループを開始
    startGameLoop();
  };
  
  // ゲームループの開始
  const startGameLoop = () => {
    // 前回のタイマーをクリア
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    
    // アニメーションフレームを使用したゲームループ
    const gameLoop = () => {
      const game = gameRef.current;
      
      // キー入力の処理
      handleInputs();
      
      // ゲーム状態を更新
      setGameState(game.getGameState());
      
      // ハイスコア更新チェック
      if (game.score > highScore) {
        setHighScore(game.score);
        localStorage.setItem('tetrisHighScore', game.score.toString());
      }
      
      // ゲームオーバーでなければループを継続
      if (!game.isGameOver) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      } else {
        // ゲームオーバー時の処理
        setGamePhase('gameover');
      }
    };
    
    // 初回ループ開始
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    // 自然落下タイマーの開始
    startDropTimer();
  };
  
  // 自然落下タイマーの開始
  const startDropTimer = () => {
    if (dropTimerRef.current) {
      clearInterval(dropTimerRef.current);
    }
    
    // ゲームのレベルに応じた落下速度を計算
    const getDropInterval = () => {
      const level = gameRef.current.level;
      // レベルが上がるほど速くなる（ミリ秒）
      return Math.max(100, 1000 - (level - 1) * 100);
    };
    
    // 落下処理を定期的に実行
    dropTimerRef.current = setInterval(() => {
      const game = gameRef.current;
      
      if (game && !game.isPaused && !game.isGameOver) {
        game.moveDown();
        
        // 速度更新（レベルアップ時）
        clearInterval(dropTimerRef.current);
        dropTimerRef.current = setInterval(() => {
          if (game && !game.isPaused && !game.isGameOver) {
            game.moveDown();
          }
        }, getDropInterval());
      }
    }, getDropInterval());
  };
  
  // 自然落下タイマーの停止
  const stopDropTimer = () => {
    if (dropTimerRef.current) {
      clearInterval(dropTimerRef.current);
      dropTimerRef.current = null;
    }
  };
  
  // キー入力の処理
  const handleInputs = () => {
    const game = gameRef.current;
    const now = Date.now();
    
    // キー入力の間隔（ミリ秒）
    const moveDelay = 100;
    
    // 左移動
    if (keyStateRef.current.ArrowLeft && now - lastMoveTimeRef.current.left > moveDelay) {
      game.moveLeft();
      lastMoveTimeRef.current.left = now;
    }
    
    // 右移動
    if (keyStateRef.current.ArrowRight && now - lastMoveTimeRef.current.right > moveDelay) {
      game.moveRight();
      lastMoveTimeRef.current.right = now;
    }
    
    // 下移動（ソフトドロップ）
    if (keyStateRef.current.ArrowDown && now - lastMoveTimeRef.current.down > moveDelay / 2) {
      game.moveDown();
      lastMoveTimeRef.current.down = now;
    }
  };
  
  // キーボードイベントのセットアップ
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ページのスクロールを防止
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      
      if (gameRef.current && gameRef.current.isGameOver) return;
      
      // 押されたキーを記録
      keyStateRef.current[e.code] = true;
      
      // 単発アクション
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyX':
          // 時計回りに回転
          gameRef.current.rotate(true);
          break;
        case 'ControlLeft':
        case 'KeyZ':
          // 反時計回りに回転
          gameRef.current.rotate(false);
          break;
        case 'Space':
          // ハードドロップ
          gameRef.current.hardDrop();
          break;
        case 'ShiftLeft':
        case 'KeyC':
          // ホールド
          gameRef.current.holdPiece();
          break;
        case 'Escape':
          // 一時停止/再開
          if (gamePhase === 'playing') {
            setGamePhase('paused');
            gameRef.current.togglePause();
          } else if (gamePhase === 'paused') {
            setGamePhase('playing');
            gameRef.current.togglePause();
          }
          break;
      }
    };
    
    const handleKeyUp = (e) => {
      // 離されたキーを記録から削除
      keyStateRef.current[e.code] = false;
    };
    
    // イベントリスナーを追加
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gamePhase]);
  
  // ゲームメニューに戻る
  const handleBackToMenu = () => {
    router.push('/game');
  };
  
  // リトライ（もう一度プレイ）
  const handleRetry = () => {
    // ゲームを再初期化
    setGamePhase('playing');
    initializeGame();
  };
  
  // 一時停止からの再開
  const handleResume = () => {
    setGamePhase('playing');
    gameRef.current.togglePause();
  };
  
  // ゲームプレイ画面
  const renderGameScreen = () => {
    if (!gameState) return null;
    
    return (
      <div className={singleStyles.gameScreen}>
        <div className={singleStyles.gameContainer}>
          <div className={singleStyles.sidePanel}>
            <HoldPieceDisplay 
              piece={gameState.heldPiece} 
              canHold={gameState.canHold} 
            />
            <ScoreDisplay 
              score={gameState.score} 
              level={gameState.level} 
              linesCleared={gameState.linesCleared}
              highScore={highScore}
            />
          </div>
          
          <div className={singleStyles.mainBoard}>
            <TetrisBoard gameState={gameState} />
          </div>
          
          <div className={singleStyles.sidePanel}>
            <NextPieceDisplay piece={gameState.nextPieces[0]} title="NEXT" />
            {gameState.nextPieces[1] && (
              <NextPieceDisplay piece={gameState.nextPieces[1]} title="NEXT+1" />
            )}
            {gameState.nextPieces[2] && (
              <NextPieceDisplay piece={gameState.nextPieces[2]} title="NEXT+2" />
            )}
          </div>
        </div>
        
        <div className={singleStyles.controls}>
          <div className={singleStyles.controlsInfo}>
            <h3>操作方法</h3>
            <div className={singleStyles.controlsList}>
              <div className={singleStyles.controlItem}>
                <span>← →</span>
                <span>左右移動</span>
              </div>
              <div className={singleStyles.controlItem}>
                <span>↓</span>
                <span>下に移動</span>
              </div>
              <div className={singleStyles.controlItem}>
                <span>↑ / X</span>
                <span>回転</span>
              </div>
              <div className={singleStyles.controlItem}>
                <span>Shift / C</span>
                <span>ホールド</span>
              </div>
              <div className={singleStyles.controlItem}>
                <span>スペース</span>
                <span>ハードドロップ</span>
              </div>
              <div className={singleStyles.controlItem}>
                <span>ESC</span>
                <span>一時停止</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // 一時停止画面
  const renderPausedScreen = () => {
    return (
      <div className={singleStyles.pausedScreen}>
        <div className={singleStyles.pausedOverlay}>
          <h2>一時停止中</h2>
          <div className={singleStyles.pausedButtons}>
            <button onClick={handleResume} className={singleStyles.resumeButton}>
              ゲームを再開
            </button>
            <button onClick={handleBackToMenu} className={singleStyles.menuButton}>
              メニューに戻る
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ゲームオーバー画面
  const renderGameOverScreen = () => {
    if (!gameState) return null;
    
    return (
      <div className={singleStyles.gameOverScreen}>
        <h1 className={singleStyles.gameOverTitle}>ゲームオーバー</h1>
        
        <div className={singleStyles.gameResults}>
          <div className={singleStyles.gameStats}>
            <div className={singleStyles.statItem}>
              <div className={singleStyles.statLabel}>スコア</div>
              <div className={singleStyles.statValue}>{gameState.score}</div>
            </div>
            
            <div className={singleStyles.statItem}>
              <div className={singleStyles.statLabel}>レベル</div>
              <div className={singleStyles.statValue}>{gameState.level}</div>
            </div>
            
            <div className={singleStyles.statItem}>
              <div className={singleStyles.statLabel}>消したライン</div>
              <div className={singleStyles.statValue}>{gameState.linesCleared}</div>
            </div>
            
            <div className={singleStyles.statItem}>
              <div className={singleStyles.statLabel}>ハイスコア</div>
              <div className={singleStyles.statValue}>{highScore}</div>
            </div>
          </div>
        </div>
        
        <div className={singleStyles.buttonContainer}>
          <button 
            className={singleStyles.retryButton} 
            onClick={handleRetry}
          >
            もう一度プレイ
          </button>
          <button 
            className={singleStyles.menuButton} 
            onClick={handleBackToMenu}
          >
            メニューに戻る
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>シングルプレイヤー | Torihada Training</title>
        <meta name="description" content="テトリスのシングルプレイヤーモード" />
      </Head>
      
      <header className={styles.header}>
        <h1 className={styles.logo}>Torihada Training</h1>
        <div className={styles.version}>v0.1</div>
        {gamePhase !== 'playing' && (
          <button onClick={handleBackToMenu} className={styles.backButton}>
            メニューに戻る
          </button>
        )}
      </header>
      
      <main className={styles.main}>
        {gamePhase === 'playing' && renderGameScreen()}
        {gamePhase === 'paused' && (
          <>
            {renderGameScreen()}
            {renderPausedScreen()}
          </>
        )}
        {gamePhase === 'gameover' && renderGameOverScreen()}
      </main>
      
      <footer className={styles.footer}>
        <p>Torihada Training &copy; 2025</p>
      </footer>
    </div>
  );
} 