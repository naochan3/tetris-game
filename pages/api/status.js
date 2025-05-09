// サーバーステータスチェック用APIエンドポイント
export default function handler(req, res) {
  // 現在の時刻を取得
  const timestamp = new Date().toISOString();
  
  // サーバーのステータス情報
  const status = {
    status: "ok",
    timestamp: timestamp,
    environment: process.env.NODE_ENV || "development",
    railway: process.env.RAILWAY_STATIC_URL ? true : false,
    // socket.ioが利用可能かどうかを確認
    socketio: !!(req.socket && req.socket.server && req.socket.server.io),
    // Socket.IOインスタンスからオンラインユーザー数を取得
    users: req.socket && req.socket.server && req.socket.server.io 
      ? req.socket.server.io.engine.clientsCount 
      : 0
  };
  
  // レスポンスヘッダーの設定
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");
  
  // 200 OKレスポンスを返す
  res.status(200).json(status);
} 