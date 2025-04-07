import { Server as SocketIOServer } from 'socket.io';

// グローバル変数
let io;
const activeUsers = new Map();
const activeRooms = new Map();

// サーバーインスタンスの状態を維持
let isInitialized = false;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // サーバーが既に初期化されているか確認
    if (!isInitialized) {
      console.log('Socket.IOサーバーを初期化します...');
      
      // Next.jsのレスポンスオブジェクトが必要なプロパティを持っているか確認
      if (!res.socket || !res.socket.server) {
        console.error('HTTP サーバーが見つかりません');
        return res.status(500).json({ error: 'Socket server initialization failed' });
      }
      
      // Socket.IOサーバーがまだ作成されていない場合のみ初期化
      if (!res.socket.server.io) {
        try {
          // Socket.IO サーバーの初期化
          io = new SocketIOServer(res.socket.server, {
            path: '/api/socketio',
            addTrailingSlash: false,
            cors: {
              origin: '*',
              methods: ['GET', 'POST'],
              credentials: true
            },
            connectTimeout: 30000, // 接続タイムアウトを30秒に設定
            pingTimeout: 20000,    // Pingタイムアウトを20秒に設定
            pingInterval: 15000,   // Ping間隔を15秒に設定
          });
          
          // サーバーインスタンスを保存
          res.socket.server.io = io;
          isInitialized = true;
          
          // Socket接続の処理
          io.on('connection', (socket) => {
            console.log('新しいクライアント接続:', socket.id);
            
            // クライアントに接続確立を通知
            socket.emit('connection:established', {
              socketId: socket.id,
              serverTime: Date.now(),
              message: 'Socket.IOサーバーに接続しました'
            });
            
            // ユーザー認証・ログイン
            socket.on('user:login', (userData) => {
              try {
                const { userId, username } = userData;
                if (!userId || !username) {
                  socket.emit('error', { message: 'ユーザーID、ユーザー名が不足しています' });
                  return;
                }
                
                // ユーザー情報を保存
                const user = {
                  id: userId,
                  username,
                  socketId: socket.id,
                  status: 'online',
                  lastActive: Date.now()
                };
                
                activeUsers.set(userId, user);
                socket.userId = userId;
                
                // アクティブユーザーリストを更新して送信
                io.emit('users:update', Array.from(activeUsers.values()));
                io.emit('rooms:update', Array.from(activeRooms.values()));
                
                console.log(`ユーザーがログインしました: ${username} (${userId})`);
                
                // ログイン成功を通知
                socket.emit('user:login_success', {
                  user,
                  onlineUsers: Array.from(activeUsers.values()),
                  activeRooms: Array.from(activeRooms.values())
                });
              } catch (error) {
                console.error('ユーザーログインエラー:', error);
                socket.emit('error', { message: 'ログイン処理でエラーが発生しました' });
              }
            });
            
            // ユーザーログアウト
            socket.on('user:logout', () => {
              try {
                if (socket.userId) {
                  activeUsers.delete(socket.userId);
                  
                  // ユーザーが部屋に参加している場合は退出処理
                  for (const [roomId, room] of activeRooms.entries()) {
                    if (room.players.some(p => p.id === socket.userId)) {
                      // プレイヤーを部屋から削除
                      room.players = room.players.filter(p => p.id !== socket.userId);
                      
                      // 部屋が空になったら削除
                      if (room.players.length === 0) {
                        activeRooms.delete(roomId);
                      } else {
                        // 部屋のホストが退出した場合は新しいホストを設定
                        if (room.hostId === socket.userId && room.players.length > 0) {
                          room.hostId = room.players[0].id;
                        }
                        
                        // 部屋の状態を更新
                        activeRooms.set(roomId, room);
                        
                        // 部屋の更新を通知
                        io.to(roomId).emit('room:update', room);
                      }
                    }
                  }
                  
                  // アクティブユーザーリストを更新して送信
                  io.emit('users:update', Array.from(activeUsers.values()));
                  io.emit('rooms:update', Array.from(activeRooms.values()));
                  
                  console.log(`ユーザーがログアウトしました: ${socket.userId}`);
                  delete socket.userId;
                }
              } catch (error) {
                console.error('ユーザーログアウトエラー:', error);
              }
            });
            
            // 部屋の作成
            socket.on('room:create', (roomData) => {
              try {
                const { name, hostId, maxPlayers } = roomData;
                const host = activeUsers.get(hostId);
                
                if (!host) {
                  socket.emit('error', { message: 'ホストユーザーが見つかりません' });
                  return;
                }
                
                // 部屋IDを生成
                const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                
                // 部屋の情報を作成
                const room = {
                  id: roomId,
                  name,
                  hostId,
                  players: [{ ...host, isReady: false }],
                  status: 'waiting',
                  maxPlayers: maxPlayers || 2,
                  createdAt: Date.now(),
                  lastActive: Date.now()
                };
                
                // 部屋をアクティブリストに追加
                activeRooms.set(roomId, room);
                
                // ソケットを部屋に参加させる
                socket.join(roomId);
                
                // 部屋の作成を通知
                socket.emit('room:created', room);
                io.emit('rooms:update', Array.from(activeRooms.values()));
                
                console.log(`部屋が作成されました: ${name} (${roomId})`);
              } catch (error) {
                console.error('部屋作成エラー:', error);
                socket.emit('error', { message: '部屋の作成中にエラーが発生しました' });
              }
            });
            
            // 部屋への参加
            socket.on('room:join', (data) => {
              try {
                const { roomId, userId } = data;
                const user = activeUsers.get(userId);
                const room = activeRooms.get(roomId);
                
                if (!user) {
                  socket.emit('error', { message: 'ユーザーが見つかりません' });
                  return;
                }
                
                if (!room) {
                  socket.emit('error', { message: '部屋が見つかりません' });
                  return;
                }
                
                if (room.players.length >= room.maxPlayers) {
                  socket.emit('error', { message: '部屋が満員です' });
                  return;
                }
                
                if (room.status === 'playing') {
                  socket.emit('error', { message: '部屋はすでにゲーム中です' });
                  return;
                }
                
                // すでに参加している場合は何もしない
                if (room.players.some(p => p.id === userId)) {
                  socket.join(roomId);
                  socket.emit('room:joined', room);
                  return;
                }
                
                // ユーザーを部屋のプレイヤーリストに追加
                room.players.push({ ...user, isReady: false });
                room.lastActive = Date.now();
                
                // ソケットを部屋に参加させる
                socket.join(roomId);
                
                // 部屋の情報を更新
                activeRooms.set(roomId, room);
                
                // 部屋の参加を通知
                socket.emit('room:joined', room);
                io.to(roomId).emit('room:update', room);
                io.emit('rooms:update', Array.from(activeRooms.values()));
                
                console.log(`ユーザーが部屋に参加しました: ${user.username} -> ${room.name}`);
              } catch (error) {
                console.error('部屋参加エラー:', error);
                socket.emit('error', { message: '部屋への参加中にエラーが発生しました' });
              }
            });
            
            // 部屋からの退出
            socket.on('room:leave', (data) => {
              try {
                const { roomId, userId } = data;
                const room = activeRooms.get(roomId);
                
                if (!room) {
                  socket.emit('error', { message: '部屋が見つかりません' });
                  return;
                }
                
                // プレイヤーを部屋から削除
                room.players = room.players.filter(p => p.id !== userId);
                
                // 部屋が空になったら削除
                if (room.players.length === 0) {
                  activeRooms.delete(roomId);
                } else {
                  // 部屋のホストが退出した場合は新しいホストを設定
                  if (room.hostId === userId && room.players.length > 0) {
                    room.hostId = room.players[0].id;
                  }
                  
                  // ゲーム中の場合はゲームを終了
                  if (room.status === 'playing') {
                    room.status = 'waiting';
                    room.gameData = null;
                  }
                  
                  // 部屋の状態を更新
                  room.lastActive = Date.now();
                  activeRooms.set(roomId, room);
                  
                  // 部屋の更新を通知
                  io.to(roomId).emit('room:update', room);
                }
                
                // ソケットを部屋から退出させる
                socket.leave(roomId);
                
                // 部屋の退出を通知
                socket.emit('room:left', { roomId });
                io.emit('rooms:update', Array.from(activeRooms.values()));
                
                console.log(`ユーザーが部屋から退出しました: ${userId} -> ${roomId}`);
              } catch (error) {
                console.error('部屋退出エラー:', error);
                socket.emit('error', { message: '部屋からの退出中にエラーが発生しました' });
              }
            });
            
            // プレイヤーの準備状態の変更
            socket.on('player:ready', (data) => {
              try {
                const { roomId, userId, isReady } = data;
                const room = activeRooms.get(roomId);
                
                if (!room) {
                  socket.emit('error', { message: '部屋が見つかりません' });
                  return;
                }
                
                // プレイヤーの準備状態を更新
                const playerIndex = room.players.findIndex(p => p.id === userId);
                if (playerIndex !== -1) {
                  room.players[playerIndex].isReady = isReady;
                  room.lastActive = Date.now();
                  
                  // 部屋の状態を更新
                  activeRooms.set(roomId, room);
                  
                  // 部屋の更新を通知
                  io.to(roomId).emit('room:update', room);
                  
                  console.log(`プレイヤーの準備状態が変更されました: ${userId} -> ${isReady ? '準備完了' : '準備中'}`);
                  
                  // 全プレイヤーが準備完了しているかチェック
                  const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);
                  if (allReady && room.status === 'waiting') {
                    // カウントダウン開始
                    const countdown = 3; // 3秒カウントダウン
                    room.countdown = countdown;
                    
                    // 全プレイヤーにカウントダウン開始を通知
                    io.to(roomId).emit('game:countdown', { countdown });
                    
                    let currentCount = countdown;
                    const countdownInterval = setInterval(() => {
                      currentCount--;
                      
                      // カウントが0になったらゲーム開始
                      if (currentCount <= 0) {
                        clearInterval(countdownInterval);
                        
                        // 部屋の状態を「プレイ中」に変更
                        room.status = 'playing';
                        room.gameStartTime = Date.now();
                        room.countdown = null;
                        
                        // 部屋の状態を更新
                        activeRooms.set(roomId, room);
                        
                        // ゲーム開始を通知
                        io.to(roomId).emit('game:start', { 
                          roomId, 
                          gameStartTime: room.gameStartTime,
                          players: room.players
                        });
                        io.emit('rooms:update', Array.from(activeRooms.values()));
                        
                        console.log(`ゲームが開始されました: ${room.name} (${roomId})`);
                      } else {
                        // カウントダウン更新を通知
                        io.to(roomId).emit('game:countdown', { countdown: currentCount });
                      }
                    }, 1000);
                  }
                }
              } catch (error) {
                console.error('プレイヤー準備状態変更エラー:', error);
                socket.emit('error', { message: '準備状態の変更中にエラーが発生しました' });
              }
            });
            
            // ゲーム状態の更新
            socket.on('game:update', (data) => {
              try {
                const { roomId, userId, gameState } = data;
                const room = activeRooms.get(roomId);
                
                if (!room) {
                  return;
                }
                
                // 他のプレイヤーにゲーム状態を送信
                socket.to(roomId).emit('game:opponent-update', {
                  userId,
                  gameState
                });
                
                // 部屋のアクティブ時間を更新
                room.lastActive = Date.now();
                activeRooms.set(roomId, room);
              } catch (error) {
                console.error('ゲーム状態更新エラー:', error);
              }
            });
            
            // ゲーム終了
            socket.on('game:over', (data) => {
              try {
                const { roomId, userId, score } = data;
                const room = activeRooms.get(roomId);
                
                if (!room) {
                  return;
                }
                
                // プレイヤーのゲーム終了状態を更新
                const playerIndex = room.players.findIndex(p => p.id === userId);
                if (playerIndex !== -1) {
                  room.players[playerIndex].gameOver = true;
                  room.players[playerIndex].score = score;
                  
                  // 全プレイヤーがゲーム終了しているかチェック
                  const allOver = room.players.every(p => p.gameOver);
                  if (allOver) {
                    // 勝者を決定
                    const winner = [...room.players].sort((a, b) => b.score - a.score)[0];
                    
                    // ゲーム終了
                    room.status = 'waiting';
                    room.gameEndTime = Date.now();
                    room.winner = winner.id;
                    
                    // プレイヤーの準備状態をリセット
                    room.players.forEach(p => {
                      p.isReady = false;
                      p.gameOver = false;
                    });
                    
                    // 部屋の状態を更新
                    activeRooms.set(roomId, room);
                    
                    // ゲーム終了を通知
                    io.to(roomId).emit('game:ended', {
                      roomId,
                      winner: winner,
                      players: room.players
                    });
                    io.emit('rooms:update', Array.from(activeRooms.values()));
                    
                    console.log(`ゲームが終了しました: ${room.name} (${roomId}), 勝者: ${winner.username}`);
                  } else {
                    // 部屋の状態を更新
                    activeRooms.set(roomId, room);
                    
                    // プレイヤーのゲーム状態を通知
                    io.to(roomId).emit('player:game-over', {
                      userId,
                      score
                    });
                  }
                }
              } catch (error) {
                console.error('ゲーム終了エラー:', error);
              }
            });
            
            // 切断イベント
            socket.on('disconnect', () => {
              console.log('クライアント切断:', socket.id);
              
              try {
                if (socket.userId) {
                  // ユーザーをアクティブリストから削除
                  activeUsers.delete(socket.userId);
                  
                  // ユーザーが部屋に参加している場合は退出処理
                  for (const [roomId, room] of activeRooms.entries()) {
                    if (room.players.some(p => p.id === socket.userId)) {
                      // プレイヤーを部屋から削除
                      room.players = room.players.filter(p => p.id !== socket.userId);
                      
                      // 部屋が空になったら削除
                      if (room.players.length === 0) {
                        activeRooms.delete(roomId);
                      } else {
                        // 部屋のホストが退出した場合は新しいホストを設定
                        if (room.hostId === socket.userId && room.players.length > 0) {
                          room.hostId = room.players[0].id;
                        }
                        
                        // 部屋の状態を更新
                        activeRooms.set(roomId, room);
                        
                        // 部屋の更新を通知
                        io.to(roomId).emit('room:update', room);
                      }
                    }
                  }
                  
                  // アクティブユーザーリストと部屋リストを更新して送信
                  io.emit('users:update', Array.from(activeUsers.values()));
                  io.emit('rooms:update', Array.from(activeRooms.values()));
                }
              } catch (error) {
                console.error('切断処理エラー:', error);
              }
            });
          });
          
          console.log('Socket.IOサーバーが初期化されました');
        } catch (error) {
          console.error('Socket.IOサーバー初期化エラー:', error);
          return res.status(500).json({ error: 'Socket server initialization failed' });
        }
      } else {
        console.log('既存のSocket.IOサーバーを再利用します');
      }
    }
    
    // 接続状態とオンラインユーザー情報を返す
    return res.status(200).json({ 
      status: 'ok',
      initialized: isInitialized,
      users: Array.from(activeUsers.values()).length,
      rooms: Array.from(activeRooms.values()).length,
      timestamp: new Date().toISOString()
    });
  } else {
    // GETリクエスト以外は405エラー
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// エンドポイント設定
export const config = {
  api: {
    bodyParser: false,
  },
}; 