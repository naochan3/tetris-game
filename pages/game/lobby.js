import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/Lobby.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faGamepad, faArrowLeft, faPlus, faUsers, faClock, faRedo, faCubes, faSignal, faTable, faWifi, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

// グローバル変数の初期化
const initGlobalVars = () => {
  try {
    if (typeof window !== 'undefined') {
      if (!window.globalOnlineUsers) {
        window.globalOnlineUsers = [];
      }
      if (!window.globalActiveRooms) {
        window.globalActiveRooms = [];
      }
    }
  } catch (error) {
    console.error('グローバル変数の初期化エラー:', error);
  }
};

export default function Lobby({ socket, isConnected, connectionAttempted, useLocalFallback }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [timeLimit, setTimeLimit] = useState(180); // デフォルト3分（180秒）
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState('');
  const [usingLocalMode, setUsingLocalMode] = useState(false);

  // コンポーネントマウント時の処理
  useEffect(() => {
    // サーバーサイドレンダリング時は実行しない
    if (typeof window === 'undefined') return;
    
    try {
      // ローカルストレージからユーザー名を取得
      const storedName = localStorage.getItem('tetris_username');
      if (!storedName) {
        router.push('/');
        return;
      }
      setUsername(storedName);

      // 一意のユーザーIDを取得
      const storedId = localStorage.getItem('tetris_userId');
      if (storedId) {
        setUserId(storedId);
      } else {
        // 新しいIDを生成
        const newUserId = generateUserId();
        setUserId(newUserId);
        localStorage.setItem('tetris_userId', newUserId);
      }

      // ローカルモードかどうか確認
      if (!socket || useLocalFallback) {
        setUsingLocalMode(true);
        
        // ローカルデータの初期化
        initializeLocalData();
        
        // フォールバック（ローカルデータ）
        setOnlineUsers(window.globalOnlineUsers || []);
        setActiveRooms(window.globalActiveRooms || []);
        setLoading(false);
      } else {
        // ソケット接続の監視
        socket.on('connect', () => {
          setUsingLocalMode(false);
          
          // ユーザーログイン
          const userId = localStorage.getItem('tetris_userId');
          const username = localStorage.getItem('tetris_username');
          if (userId && username) {
            socket.emit('user:login', { userId, username });
          }
        });

        socket.on('disconnect', () => {
          setUsingLocalMode(true);
          // フォールバックモードに切り替え
          initializeLocalData();
        });

        // オンラインユーザー一覧の更新
        socket.on('users:update', (users) => {
          setOnlineUsers(users);
        });

        // ルーム一覧の更新
        socket.on('rooms:update', (rooms) => {
          setActiveRooms(rooms);
          setLoading(false);
        });

        // エラーハンドリング
        socket.on('error', (error) => {
          console.error('Socket error:', error);
          setError(`通信エラー: ${error.message || 'サーバーとの通信に問題が発生しました'}`);
        });

        // 初期データリクエスト
        socket.emit('users:get');
        socket.emit('rooms:get');

        // 定期的なデータ更新
        const intervalId = setInterval(() => {
          if (socket.connected) {
            socket.emit('users:get');
            socket.emit('rooms:get');
          } else if (useLocalFallback) {
            // ローカルモードに切り替え
            setUsingLocalMode(true);
            // ローカルデータを使用
            setOnlineUsers(window.globalOnlineUsers || []);
            setActiveRooms(window.globalActiveRooms || []);
          }
        }, 3000);

        // クリーンアップ関数
        return () => {
          clearInterval(intervalId);
          socket.off('connect');
          socket.off('disconnect');
          socket.off('users:update');
          socket.off('rooms:update');
          socket.off('error');
        };
      }
    } catch (err) {
      console.error('初期化エラー:', err);
      setError('アプリケーションの初期化中にエラーが発生しました。');
      setLoading(false);
    }
    
    // ローディングタイムアウト
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        // まだデータが読み込めていない場合はローカルモードに切り替え
        if (onlineUsers.length === 0 && activeRooms.length === 0) {
          setUsingLocalMode(true);
          initializeLocalData();
          setOnlineUsers(window.globalOnlineUsers || []);
          setActiveRooms(window.globalActiveRooms || []);
        }
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router, socket, isConnected, useLocalFallback]);

  // ローカルデータの初期化
  const initializeLocalData = () => {
    if (typeof window === 'undefined') return;
    
    // 自分のユーザー情報
    const myUserId = localStorage.getItem('tetris_userId');
    const myUsername = localStorage.getItem('tetris_username');
    
    if (!window.globalOnlineUsers) {
      window.globalOnlineUsers = [];
    }
    
    // 自分のユーザーが存在するか確認
    const existingUserIndex = window.globalOnlineUsers.findIndex(u => u.id === myUserId);
    if (existingUserIndex >= 0) {
      // 既存のユーザー情報を更新
      window.globalOnlineUsers[existingUserIndex].name = myUsername;
      window.globalOnlineUsers[existingUserIndex].status = 'online';
    } else {
      // 新しいユーザーを追加
      window.globalOnlineUsers.push({
        id: myUserId,
        name: myUsername,
        status: 'online',
        joinedAt: new Date()
      });
    }
    
    // 追加のテストユーザー
    if (window.globalOnlineUsers.length < 2) {
      if (!window.globalOnlineUsers.some(u => u.id === 'test-user-1')) {
        window.globalOnlineUsers.push({
          id: 'test-user-1',
          name: 'テストユーザー1',
          status: 'online',
          joinedAt: new Date()
        });
      }
      
      if (!window.globalOnlineUsers.some(u => u.id === 'test-user-2')) {
        window.globalOnlineUsers.push({
          id: 'test-user-2',
          name: 'テストユーザー2',
          status: 'online',
          joinedAt: new Date()
        });
      }
    }
    
    // ルーム情報の初期化
    if (!window.globalActiveRooms) {
      window.globalActiveRooms = [];
    }
    
    // テストルームの追加
    if (window.globalActiveRooms.length === 0) {
      window.globalActiveRooms.push({
        id: 'test-room-1',
        name: 'テスト対戦ルーム',
        host: 'テストユーザー1',
        hostId: 'test-user-1',
        status: 'waiting',
        timeLimit: 180,
        players: [{ id: 'test-user-1', name: 'テストユーザー1' }],
        maxPlayers: 2,
        createdAt: new Date()
      });
    }
  };

  // ユーザーIDの生成
  const generateUserId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  };

  // データの手動更新
  const fetchLatestData = () => {
    if (socket && socket.connected) {
      socket.emit('users:get');
      socket.emit('rooms:get');
    } else {
      // フォールバック
      try {
        if (typeof window !== 'undefined') {
          setOnlineUsers(window.globalOnlineUsers || []);
          setActiveRooms(window.globalActiveRooms || []);
        }
      } catch (err) {
        console.error('データ更新エラー:', err);
      }
    }
  };

  // 部屋の作成
  const createRoom = () => {
    if (!roomName.trim()) {
      alert('部屋名を入力してください');
      return;
    }

    try {
      if (socket && socket.connected && !usingLocalMode) {
        setLoading(true);
        console.log(`部屋を作成します: ${roomName}`);
        // サーバーに部屋作成をリクエスト
        socket.emit('room:create', {
          name: roomName,
          host: username,
          hostId: userId,
          timeLimit: timeLimit,
          maxPlayers: 2
        });
        
        // イベントリスナーを一度設定（重複を避けるため）
        socket.off('room:created');
        socket.on('room:created', (roomData) => {
          console.log('部屋が作成されました:', roomData);
          setLoading(false);
          
          if (roomData && roomData.id) {
            // ルームIDが返されたら、そのルームに自動参加
            joinRoom(roomData.id);
          }
        });
        
        // エラー処理
        socket.off('room:error');
        socket.on('room:error', (error) => {
          console.error('部屋作成エラー:', error);
          setLoading(false);
          alert(`部屋の作成に失敗しました: ${error.message || '不明なエラー'}`);
        });
      } else {
        // ローカルモード: フォールバック（ローカルでの部屋作成）
        const roomId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        const newRoom = {
          id: roomId,
          name: roomName,
          host: username,
          hostId: userId,
          status: 'waiting',
          timeLimit,
          players: [{ id: userId, name: username }],
          maxPlayers: 2,
          createdAt: new Date()
        };

        if (typeof window !== 'undefined') {
          window.globalActiveRooms = [...(window.globalActiveRooms || []), newRoom];
          setActiveRooms([...(window.globalActiveRooms || [])]);
        }
        
        // 作成した部屋に入室する
        router.push(`/game/battle?roomId=${roomId}`);
      }
    } catch (err) {
      console.error('部屋作成エラー:', err);
      setLoading(false);
      alert('部屋の作成中にエラーが発生しました。');
    }
  };

  // 部屋に参加
  const joinRoom = (roomId) => {
    try {
      if (socket && socket.connected && !usingLocalMode) {
        setLoading(true);
        console.log(`部屋に参加します: ${roomId}`);
        
        // サーバーに部屋参加をリクエスト
        socket.emit('room:join', {
          roomId,
          userId,
          username
        });
        
        // 参加イベントのリスナー（_app.jsにも設定済み）
        socket.off('room:joined');
        socket.on('room:joined', (roomData) => {
          console.log('部屋参加成功:', roomData);
          setLoading(false);
          
          if (roomData) {
            // バトル画面に移動
            router.push(`/game/battle?roomId=${roomData.id || roomData.roomId}`);
          }
        });
        
        // エラー処理
        socket.off('room:error');
        socket.on('room:error', (error) => {
          console.error('部屋参加エラー:', error);
          setLoading(false);
          alert(`部屋への参加に失敗しました: ${error.message || '不明なエラー'}`);
        });
        
        // タイムアウト処理
        setTimeout(() => {
          if (loading) {
            setLoading(false);
            alert('部屋への参加がタイムアウトしました。再度お試しください。');
          }
        }, 10000);
      } else {
        // ローカルモード: フォールバック（ローカルでの参加処理）
        if (typeof window === 'undefined') return;
        
        const roomIndex = window.globalActiveRooms.findIndex(room => room.id === roomId);
        
        if (roomIndex === -1) {
          alert('部屋が存在しません');
          return;
        }
        
        const room = window.globalActiveRooms[roomIndex];
        
        if (room.status !== 'waiting') {
          alert('この部屋は既にゲームが始まっています');
          return;
        }
        
        if (room.players.length >= room.maxPlayers) {
          alert('この部屋は満員です');
          return;
        }
        
        // 既に参加している場合は追加しない
        if (!room.players.some(player => player.id === userId)) {
          room.players.push({ id: userId, name: username });
        }
        
        // 部屋の定員に達したら状態を更新
        if (room.players.length >= room.maxPlayers) {
          room.status = 'playing';
        }
        
        window.globalActiveRooms[roomIndex] = room;
        
        // 画面を更新
        setActiveRooms([...window.globalActiveRooms]);
        
        // バトル画面に移動
        router.push(`/game/battle?roomId=${roomId}`);
      }
    } catch (err) {
      console.error('部屋参加エラー:', err);
      setLoading(false);
      alert('部屋への参加中にエラーが発生しました。');
    }
  };

  // メインメニューに戻る
  const goToMainMenu = () => {
    router.push('/');
  };

  // エラー表示
  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>エラー | テトリス オンライン対戦</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>
            <FontAwesomeIcon icon={faWifi} size="3x" />
          </div>
          <h1>エラーが発生しました</h1>
          <p>{error}</p>
          <button onClick={goToMainMenu} className={styles.button}>
            <FontAwesomeIcon icon={faArrowLeft} /> メインメニューに戻る
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
          <title>テトリス対戦 - ロビー</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <div className={styles.loadingContainer}>
          <div className={styles.logoAnimation}>
            <FontAwesomeIcon icon={faCubes} size="3x" className={styles.logoIcon} />
          </div>
          <div className={styles.spinner}></div>
          <p>ロビー情報を読み込み中...</p>
          <small>マルチプレイヤーサーバーに接続しています</small>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>テトリス対戦 - ロビー</title>
        <meta name="description" content="テトリス対戦のロビー画面" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles.bgOverlay}></div>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faCubes} className={styles.titleIcon} /> TETRIS BATTLE
          </h1>
          <div className={styles.subtitle}>オンライン対戦ロビー</div>
        </div>
        <div className={styles.userControls}>
          <div className={styles.usernameInput}>
            <FontAwesomeIcon icon={faUser} />
            <span>{username}</span>
          </div>
          <div className={styles.createRoomForm}>
            <div className={styles.inputWrap}>
              <FontAwesomeIcon icon={faTable} className={styles.inputIcon} />
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="部屋名を入力"
                className={styles.roomNameInput}
              />
            </div>
            <div className={styles.inputWrap}>
              <FontAwesomeIcon icon={faClock} className={styles.inputIcon} />
              <select
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className={styles.timeLimitSelect}
              >
                <option value="120">2分</option>
                <option value="180">3分</option>
                <option value="300">5分</option>
              </select>
            </div>
            <button 
              className={styles.createRoomButton}
              onClick={createRoom}
              disabled={!roomName.trim()}
            >
              <FontAwesomeIcon icon={faPlus} /> 部屋を作成
            </button>
          </div>
        </div>
      </div>

      {usingLocalMode && (
        <div className={styles.localModeNotice}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.localModeIcon} />
          <p>サーバーに接続できません。ローカルモードで動作しています。他のプレイヤーとの対戦はできません。</p>
        </div>
      )}

      <div className={styles.lobbySections}>
        <div className={styles.roomsSection}>
          <h2 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faGamepad} /> 部屋一覧
            <button className={styles.refreshButton} onClick={fetchLatestData}>
              <FontAwesomeIcon icon={faRedo} />
            </button>
          </h2>
          <div className={styles.roomListTable}>
            {activeRooms.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>部屋名</th>
                    <th>ホスト</th>
                    <th>状態</th>
                    <th>プレイヤー</th>
                    <th>制限時間</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRooms.map(room => (
                    <tr key={room.id} className={room.status === 'playing' ? styles.roomPlaying : ''}>
                      <td>
                        <div className={styles.roomNameCell}>
                          <FontAwesomeIcon icon={faTable} className={styles.roomIcon} />
                          <span>{room.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.hostNameCell}>
                          <FontAwesomeIcon icon={faUser} className={styles.hostIcon} />
                          <span>{room.host}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${room.status === 'waiting' ? styles.waiting : styles.playing}`}>
                          {room.status === 'waiting' ? '待機中' : 'プレイ中'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.playerCountCell}>
                          <FontAwesomeIcon icon={faUsers} className={styles.playerCountIcon} />
                          <span>{room.players ? room.players.length : 1} / {room.maxPlayers || 2}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.timeLimitCell}>
                          <FontAwesomeIcon icon={faClock} className={styles.timeLimitIcon} />
                          <span>{Math.floor(room.timeLimit / 60)}分{room.timeLimit % 60 > 0 ? `${room.timeLimit % 60}秒` : ''}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className={styles.joinRoomButton}
                          disabled={
                            room.status !== 'waiting' || 
                            (room.players && room.players.length >= (room.maxPlayers || 2)) || 
                            (room.players && room.players.some(p => p.id === userId))
                          }
                          onClick={() => joinRoom(room.id)}
                        >
                          {room.players && room.players.some(p => p.id === userId) ? '参加中' : '参加する'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.noRooms}>
                <FontAwesomeIcon icon={faGamepad} size="2x" className={styles.noRoomsIcon} />
                <p>現在、利用可能な部屋はありません</p>
                <p className={styles.noRoomsSub}>新しい部屋を作成して対戦相手を待ちましょう</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.usersSection}>
          <h2 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faUsers} /> オンラインユーザー 
            <span className={styles.userCount}>{onlineUsers.length}人</span>
          </h2>
          <div className={styles.usersList}>
            {onlineUsers.length > 0 ? (
              onlineUsers.map(user => (
                <div key={user.id} className={styles.userItem}>
                  <div className={styles.userIcon}>
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                  <div className={styles.userName}>{user.name}</div>
                  <div className={`${styles.userStatus} ${user.status === 'online' ? styles.online : styles.inGame}`}>
                    {user.status === 'online' ? 'オンライン' : 'ゲーム中'}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noUsers}>
                <FontAwesomeIcon icon={faUsers} size="2x" className={styles.noUsersIcon} />
                <p>現在オンラインのユーザーはいません</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <div className={`${styles.statusIndicator} ${isConnected ? (usingLocalMode ? styles.local : styles.connected) : styles.disconnected}`}></div>
          <div className={styles.statusText}>
            <span>
              <FontAwesomeIcon icon={faSignal} /> 状態: {isConnected ? (usingLocalMode ? 'ローカルモード' : 'オンライン') : 'オフライン'}
            </span>
          </div>
        </div>
        <div className={styles.statusRight}>
          <span className={styles.refreshInfo}>
            <FontAwesomeIcon icon={faRedo} className={styles.refreshIcon} spin={loading} /> 3秒ごとに自動更新
          </span>
        </div>
      </div>

      <div className={styles.backButtonContainer}>
        <button 
          className={styles.backButton}
          onClick={goToMainMenu}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> メインメニューに戻る
        </button>
      </div>

      <div className={styles.footer}>
        <p>© 2023 テトリスバトル. All Rights Reserved.</p>
      </div>
    </div>
  );
} 