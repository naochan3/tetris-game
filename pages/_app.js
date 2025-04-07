import '../styles/globals.css'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useRouter } from 'next/router'

// Socket.IOエンドポイントを指定
const SOCKET_SERVER_URL = '/api/socketio'

function MyApp({ Component, pageProps }) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const [useLocalFallback, setUseLocalFallback] = useState(false)
  const router = useRouter()

  // Socket.IO接続の初期化
  useEffect(() => {
    // サーバーサイドレンダリング時は実行しない
    if (typeof window === 'undefined') return

    // グローバル変数の初期化（フォールバック用）
    window.globalOnlineUsers = window.globalOnlineUsers || []
    window.globalActiveRooms = window.globalActiveRooms || []
    window.useLocalFallback = false

    let socketIo = null
    let connectionTimeoutId = null

    // ローカルモードを有効にする関数
    const enableLocalMode = () => {
      console.log('ローカルモードに切り替えます')
      setUseLocalFallback(true)
      window.useLocalFallback = true
      setConnectionAttempted(true)
      
      // ダミーデータ生成（ローカルモード用）
      window.globalOnlineUsers = Array(5).fill().map((_, i) => ({
        id: `local_${i}`,
        username: `ユーザー${i+1}`,
        isReady: false,
        currentRoom: null
      }))
      
      window.globalActiveRooms = Array(3).fill().map((_, i) => ({
        id: `room_${i}`,
        name: `ルーム ${i+1}`,
        players: [],
        createdBy: `local_${i}`,
        gameState: 'waiting'
      }))
    }

    // ソケットのクリーンアップ
    const cleanupSocket = (socket) => {
      if (!socket) return
      socket.offAny()
      socket.disconnect()
    }

    // 接続のセットアップ
    const setupConnection = async () => {
      try {
        // 既に接続がある場合はクリーンアップ
        if (socketIo) {
          cleanupSocket(socketIo)
        }
        
        // Socket.IO接続オプション
        const options = {
          path: SOCKET_SERVER_URL,
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000,
          autoConnect: true
        }
        
        // Socket.IO接続 - 同一オリジンに接続
        socketIo = io(options)
        
        // 接続タイムアウト処理 (20秒)
        connectionTimeoutId = setTimeout(() => {
          if (socketIo && !socketIo.connected) {
            console.log('接続タイムアウト (20秒経過)。ローカルモードに切り替えます')
            enableLocalMode()
          }
        }, 20000)
        
        // イベントリスナーの設定
        setupEventListeners(socketIo)
        
        setSocket(socketIo)
        return socketIo
      } catch (err) {
        console.error('Socket.IO初期化エラー:', err)
        enableLocalMode()
        return null
      }
    }
    
    // イベントリスナーの設定
    const setupEventListeners = (socket) => {
      if (!socket) return
      
      // 接続イベント
      socket.on('connect', () => {
        console.log('Socket.IOサーバーに接続しました:', socket.id)
        setIsConnected(true)
        setConnectionAttempted(true)
        setUseLocalFallback(false)
        window.useLocalFallback = false
        
        // タイムアウトをクリア
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId)
          connectionTimeoutId = null
        }
      })
      
      // 接続エラーイベント
      socket.on('connect_error', (err) => {
        console.error('Socket.IO接続エラー:', err.message)
        
        // 接続が一度も確立されていない場合のみローカルモードを有効化
        if (!isConnected) {
          enableLocalMode()
        }
      })
      
      // 切断イベント
      socket.on('disconnect', (reason) => {
        console.log('Socket.IOサーバーから切断されました:', reason)
        setIsConnected(false)
        
        // サーバー都合の切断の場合は再接続を試みる
        if (reason === 'io server disconnect') {
          socket.connect()
        }
      })
      
      // 再接続イベント
      socket.on('reconnect', (attemptNumber) => {
        console.log(`再接続に成功しました (${attemptNumber}回目)`)
        setIsConnected(true)
        setUseLocalFallback(false)
        window.useLocalFallback = false
      })
      
      // 再接続失敗イベント
      socket.on('reconnect_failed', () => {
        console.log('再接続に失敗しました')
        enableLocalMode()
      })
    }
    
    // ブラウザ終了時の処理
    const handleBeforeUnload = () => {
      if (socket && socket.connected && socket.userId) {
        socket.emit('user:logout')
      }
    }
    
    // イベントリスナーの登録
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // 接続開始
    setupConnection()
    
    // クリーンアップ
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId)
      }
      
      if (socketIo) {
        cleanupSocket(socketIo)
      }
    }
  }, [])
  
  // ローカルモード用のダミーデータ初期化
  useEffect(() => {
    if (useLocalFallback && typeof window !== 'undefined') {
      // ダミーデータがない場合のみ初期化
      if (!window.globalOnlineUsers || window.globalOnlineUsers.length === 0) {
        window.globalOnlineUsers = Array(5).fill().map((_, i) => ({
          id: `local_${i}`,
          username: `ユーザー${i+1}`,
          status: 'online',
          joinedAt: new Date()
        }))
      }
      
      if (!window.globalActiveRooms || window.globalActiveRooms.length === 0) {
        window.globalActiveRooms = Array(3).fill().map((_, i) => ({
          id: `room_${i}`,
          name: `ルーム ${i+1}`,
          players: [],
          hostId: `local_${i}`,
          status: 'waiting'
        }))
      }
    }
  }, [useLocalFallback])
  
  return (
    <Component 
      {...pageProps} 
      socket={socket}
      isConnected={isConnected}
      connectionAttempted={connectionAttempted}
      useLocalFallback={useLocalFallback}
    />
  )
}

export default MyApp