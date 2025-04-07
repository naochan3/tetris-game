import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/Battle.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTrophy, faHourglassHalf, faUsers, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

// コンスタント
const ROWS = 20;
const COLS = 10;
const SHAPES = [
  // テトリミノの形状定義...
  // 省略
];

export default function Battle({ socket, useLocalFallback }) {
  const router = useRouter();
  const canvasRef = useRef(null);
  const opponentCanvasRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3分
  const [opponentBoard, setOpponentBoard] = useState(Array(ROWS).fill().map(() => Array(COLS).fill(0)));
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentLines, setOpponentLines] = useState(0);
  const [opponentLevel, setOpponentLevel] = useState(1);
  const [opponentUsername, setOpponentUsername] = useState('');
  const [playerUsername, setPlayerUsername] = useState('');
  const [gameRoomId, setGameRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // ゲームステート参照用
  const gameStateRef = useRef({
    board: Array(ROWS).fill().map(() => Array(COLS).fill(0)),
    score: 0,
    lines: 0,
    level: 1,
    currentPiece: null,
    nextPiece: null,
    gameOver: false
  });

  // カウントダウン開始処理
  const startCountdown = () => {
    // 3,2,1のカウントダウン
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setGameStarted(true);
          setCountdown(null);
          initGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Socket.IO接続の確認
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (socket) {
      setIsConnected(socket.connected);
      
      socket.on('connect', () => {
        setIsConnected(true);
      });
      
      socket.on('disconnect', () => {
        setIsConnected(false);
      });
      
      return () => {
        socket.off('connect');
        socket.off('disconnect');
      };
    }
  }, [socket]);

  // ルーム情報とゲーム初期化
  useEffect(() => {
    // サーバーサイドレンダリング時は実行しない
    if (typeof window === 'undefined') return;

    try {
      // roomIdを取得
      const { roomId } = router.query;
      if (!roomId) {
        setError('部屋IDが見つかりません');
        return;
      }
      
      // ユーザー情報を取得
      const userId = localStorage.getItem('tetris_userId');
      const username = localStorage.getItem('tetris_username');
      
      if (!userId || !username) {
        setError('ユーザー情報が見つかりません');
        router.push('/');
        return;
      }
      
      setGameRoomId(roomId);
      setPlayerId(userId);
      setPlayerUsername(username);
      
      // ルーム情報の取得
      let roomInfo;
      
      if (socket && socket.connected && !useLocalFallback) {
        console.log(`バトル画面初期化: ルームID ${roomId}`);
        
        // サーバーからルーム情報を取得
        socket.emit('room:get', { roomId });
        
        // ルーム情報受信イベント
        socket.on('room:info', (room) => {
          if (!room) {
            setError('部屋情報が見つかりません');
            return;
          }
          
          console.log('受信した部屋情報:', room);
          
          setRoom(room);
          setOpponentUsername(room.players.find(p => p.id !== userId)?.name || '');
          setTimeRemaining(room.timeLimit || 180);
          
          // 部屋のステータスが「playing」の場合、カウントダウンを開始
          if (room.status === 'playing' && room.players.length >= 2) {
            startCountdown();
          }
        });
        
        // ゲーム状態更新イベント
        socket.on('game:update', (gameState) => {
          if (gameState.roomId === roomId) {
            // 相手の状態を更新
            if (gameState.playerId !== userId) {
              setOpponentBoard(gameState.board || []);
              setOpponentScore(gameState.score || 0);
              setOpponentLevel(gameState.level || 1);
              setOpponentLines(gameState.lines || 0);
            }
          }
        });
        
        // プレイヤー参加イベント
        socket.on('player:joined', (data) => {
          if (data.roomId === roomId && data.player) {
            console.log('新しいプレイヤーが参加しました:', data.player);
            
            // 相手プレイヤーを設定
            if (data.player.id !== userId) {
              setOpponentUsername(data.player.name);
              
              // 全プレイヤーリストを更新
              socket.emit('room:get', { roomId });
            }
            
            // プレイヤーが2人揃ったらカウントダウン開始
            if (data.players && data.players.length >= 2) {
              startCountdown();
            }
          }
        });
        
        // ゲーム終了イベント
        socket.on('game:over', (data) => {
          if (data.roomId === roomId) {
            handleGameOver(data.winnerId === userId);
          }
        });
        
        // エラーイベント
        socket.on('error', (error) => {
          console.error('ゲームエラー:', error);
          setError(`エラーが発生しました: ${error.message || '不明なエラー'}`);
        });
        
        // クリーンアップ関数
        return () => {
          socket.off('room:info');
          socket.off('game:update');
          socket.off('player:joined');
          socket.off('game:over');
          socket.off('error');
          
          // 部屋から退出
          socket.emit('room:leave', { roomId, userId });
        };
      } else {
        // ローカルモード（Socket接続がない場合）
        console.log('ローカルモードでバトル画面を初期化します');
        
        if (window.globalActiveRooms) {
          roomInfo = window.globalActiveRooms.find(r => r.id === roomId);
          
          if (!roomInfo) {
            setError('部屋情報が見つかりません（ローカルモード）');
            return;
          }
          
          console.log('ローカルの部屋情報:', roomInfo);
          
          setRoom(roomInfo);
          setOpponentUsername(roomInfo.players.find(p => p.id !== userId)?.name || '');
          setTimeRemaining(roomInfo.timeLimit || 180);
          
          // 相手プレイヤーを設定（ローカルモード）
          const opponent = roomInfo.players.find(p => p.id !== userId);
          if (opponent) {
            setOpponentUsername(opponent.name);
          } else {
            // CPUプレイヤーを追加（シングルプレイモード）
            const cpuPlayer = {
              id: 'cpu-player',
              name: 'CPUプレイヤー'
            };
            
            setOpponentUsername(cpuPlayer.name);
            
            // プレイヤーリストにCPUを追加
            const updatedPlayers = [...(roomInfo.players || []), cpuPlayer];
            setRoom(roomInfo);
            
            // ローカルの部屋情報も更新
            roomInfo.players = updatedPlayers;
            
            // 全プレイヤーが揃ったのでカウントダウン開始
            startCountdown();
          }
        } else {
          setError('ローカルモードの初期化に失敗しました');
        }
        
        // ゲーム状態更新イベントのリスナー（ローカルモード）
        const handleLocalGameUpdate = (event) => {
          const gameState = event.detail;
          
          if (gameState && gameState.roomId === roomId && gameState.playerId !== userId) {
            setOpponentBoard(gameState.board || []);
            setOpponentScore(gameState.score || 0);
            setOpponentLevel(gameState.level || 1);
            setOpponentLines(gameState.lines || 0);
          }
        };
        
        window.addEventListener('game:state_update', handleLocalGameUpdate);
        
        return () => {
          window.removeEventListener('game:state_update', handleLocalGameUpdate);
          
          // ローカルの部屋情報を更新（プレイヤー退出）
          if (window.globalActiveRooms) {
            const roomIndex = window.globalActiveRooms.findIndex(r => r.id === roomId);
            
            if (roomIndex !== -1) {
              // プレイヤーを削除
              window.globalActiveRooms[roomIndex].players = 
                window.globalActiveRooms[roomIndex].players.filter(p => p.id !== userId);
              
              // 部屋が空になったら削除
              if (window.globalActiveRooms[roomIndex].players.length === 0) {
                window.globalActiveRooms.splice(roomIndex, 1);
              }
            }
          }
        };
      }
    } catch (error) {
      console.error('バトル画面初期化エラー:', error);
      setError('ゲームの初期化中にエラーが発生しました');
    }
  }, [router, socket, router.query, useLocalFallback]);

  // ゲームの初期化
  const initGame = () => {
    if (!canvasRef.current) return;
    
    // ゲームロジックの初期化処理
    // (実装は既存のゲームロジックに基づく)
    
    // ゲームの状態をリセット
    gameStateRef.current = {
      board: Array(ROWS).fill().map(() => Array(COLS).fill(0)),
      score: 0,
      lines: 0,
      level: 1,
      currentPiece: getRandomPiece(),
      nextPiece: getRandomPiece(),
      gameOver: false
    };
    
    // ゲームループ開始
    requestAnimationFrame(gameLoop);
  };

  // ランダムなテトリミノの取得
  const getRandomPiece = () => {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    return {
      shape: SHAPES[randomIndex],
      x: 3,
      y: 0,
      rotation: 0
    };
  };

  // ゲームループ
  const gameLoop = (timestamp) => {
    if (!gameStarted || gameOver) return;
    
    // ゲーム状態の更新
    updateGame();
    
    // 画面描画
    drawGame();
    
    // サーバーに現在の状態を送信
    if (socket && socket.connected) {
      socket.emit('game:update', {
        roomId,
        playerId: localStorage.getItem('tetris_userId'),
        state: {
          board: gameStateRef.current.board,
          score: gameStateRef.current.score,
          lines: gameStateRef.current.lines,
          level: gameStateRef.current.level,
          gameOver: gameStateRef.current.gameOver
        }
      });
    }
    
    // 次のフレームをリクエスト
    if (!gameStateRef.current.gameOver) {
      requestAnimationFrame(gameLoop);
    } else {
      handleGameOver(false); // 敗北
    }
  };

  // ゲーム状態の更新
  const updateGame = () => {
    // ゲーム状態更新のロジック
    // (実装は既存のゲームロジックに基づく)
  };

  // ゲーム描画
  const drawGame = () => {
    // キャンバスへの描画ロジック
    // (実装は既存のゲームロジックに基づく)
  };

  // ゲームオーバー処理
  const handleGameOver = (isWinner) => {
    setGameOver(true);
    setGameStarted(false);
    
    if (isWinner) {
      setWinner(playerUsername);
    } else {
      setWinner(opponentUsername);
      
      // 敗北通知をサーバーに送信
      if (socket && socket.connected) {
        socket.emit('game:over', {
          roomId,
          playerId: localStorage.getItem('tetris_userId')
        });
      }
    }
  };

  // 準備完了
  const handleReady = () => {
    setIsReady(true);
    
    if (socket && socket.connected) {
      socket.emit('player:ready', {
        roomId,
        playerId: localStorage.getItem('tetris_userId')
      });
    }
  };

  // メインメニューに戻る
  const goToLobby = () => {
    router.push('/game/lobby');
  };

  // ゲームが終了した場合の表示
  if (gameOver) {
    return (
      <div className={styles.container}>
        <Head>
          <title>対戦終了 | テトリスバトル</title>
        </Head>
        <div className={styles.gameOverContainer}>
          <h1 className={styles.gameOverTitle}>ゲーム終了</h1>
          <div className={styles.winnerInfo}>
            <FontAwesomeIcon icon={faTrophy} className={styles.trophyIcon} />
            <h2>勝者: {winner || '不明'}</h2>
          </div>
          <div className={styles.gameResults}>
            <div className={styles.playerResult}>
              <h3>{playerUsername}</h3>
              <p>スコア: {gameStateRef.current.score}</p>
              <p>消去ライン: {gameStateRef.current.lines}</p>
              <p>レベル: {gameStateRef.current.level}</p>
            </div>
            <div className={styles.playerResult}>
              <h3>{opponentUsername}</h3>
              <p>スコア: {opponentScore}</p>
              <p>消去ライン: {opponentLines}</p>
              <p>レベル: {opponentLevel}</p>
            </div>
          </div>
          <button className={styles.button} onClick={goToLobby}>
            <FontAwesomeIcon icon={faArrowLeft} /> ロビーに戻る
          </button>
        </div>
      </div>
    );
  }

  // ローディング表示
  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>対戦準備中 | テトリスバトル</title>
        </Head>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>対戦情報を読み込み中...</p>
          {!isConnected && 
            <div className={styles.connectionError}>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <p>サーバーに接続できません。再接続中...</p>
            </div>
          }
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>エラー | テトリスバトル</title>
        </Head>
        <div className={styles.errorContainer}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.errorIcon} />
          <h1>エラーが発生しました</h1>
          <p>{error}</p>
          <button className={styles.button} onClick={goToLobby}>
            <FontAwesomeIcon icon={faArrowLeft} /> ロビーに戻る
          </button>
        </div>
      </div>
    );
  }

  // カウントダウン表示
  if (countdown !== null && !gameStarted) {
    return (
      <div className={styles.container}>
        <Head>
          <title>対戦開始まであと{countdown}秒 | テトリスバトル</title>
        </Head>
        <div className={styles.countdownContainer}>
          <h1 className={styles.countdownNumber}>{countdown}</h1>
          <p>対戦開始まで...</p>
          <div className={styles.playerInfo}>
            <div className={styles.player}>
              <span>{playerUsername}</span>
            </div>
            <span className={styles.vs}>VS</span>
            <div className={styles.player}>
              <span>{opponentUsername || '対戦相手を待っています...'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 対戦待機画面
  if (!gameStarted && !countdown) {
    return (
      <div className={styles.container}>
        <Head>
          <title>対戦待機中 | テトリスバトル</title>
        </Head>
        <div className={styles.waitingContainer}>
          <h1>対戦準備</h1>
          <div className={styles.roomInfo}>
            <h2>{room?.name || 'ゲームルーム'}</h2>
            <p><FontAwesomeIcon icon={faUsers} /> プレイヤー: {room?.players?.length || 0}/{room?.maxPlayers || 2}</p>
            <p><FontAwesomeIcon icon={faHourglassHalf} /> 制限時間: {Math.floor((room?.timeLimit || 180) / 60)}分</p>
          </div>
          
          <div className={styles.playerInfo}>
            <div className={styles.player}>
              <h3>{playerUsername}</h3>
              <div className={`${styles.readyStatus} ${isReady ? styles.ready : ''}`}>
                {isReady ? '準備完了' : '準備中'}
              </div>
            </div>
            <span className={styles.vs}>VS</span>
            <div className={styles.player}>
              <h3>{opponentUsername || '対戦相手を待っています...'}</h3>
              <div className={`${styles.readyStatus} ${room?.players?.find(p => p.name === opponentUsername)?.ready ? styles.ready : ''}`}>
                {room?.players?.find(p => p.name === opponentUsername)?.ready ? '準備完了' : '準備中'}
              </div>
            </div>
          </div>
          
          <div className={styles.controls}>
            <button 
              className={`${styles.button} ${styles.readyButton} ${isReady ? styles.readyActive : ''}`} 
              onClick={handleReady}
              disabled={isReady}
            >
              {isReady ? '準備完了!' : '準備する'}
            </button>
            <button className={styles.button} onClick={goToLobby}>
              <FontAwesomeIcon icon={faArrowLeft} /> ロビーに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ゲームプレイ画面
  return (
    <div className={styles.container}>
      <Head>
        <title>テトリスバトル</title>
      </Head>
      <div className={styles.gameContainer}>
        <div className={styles.playerSection}>
          <h2>{playerUsername}</h2>
          <canvas 
            ref={canvasRef} 
            width={300} 
            height={600} 
            className={styles.gameCanvas}
          ></canvas>
          <div className={styles.statsContainer}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>スコア</span>
              <span className={styles.statValue}>{gameStateRef.current.score}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>ライン</span>
              <span className={styles.statValue}>{gameStateRef.current.lines}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>レベル</span>
              <span className={styles.statValue}>{gameStateRef.current.level}</span>
            </div>
          </div>
        </div>
        
        <div className={styles.centerSection}>
          <div className={styles.timer}>
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </div>
          <div className={styles.vsIndicator}>VS</div>
        </div>
        
        <div className={styles.opponentSection}>
          <h2>{opponentUsername}</h2>
          <canvas 
            ref={opponentCanvasRef} 
            width={300} 
            height={600} 
            className={styles.gameCanvas}
          ></canvas>
          <div className={styles.statsContainer}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>スコア</span>
              <span className={styles.statValue}>{opponentScore}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>ライン</span>
              <span className={styles.statValue}>{opponentLines}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>レベル</span>
              <span className={styles.statValue}>{opponentLevel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 