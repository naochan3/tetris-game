# Railwayデプロイ手順

## 前提条件
- Railwayアカウント
- Railway CLI (`npm install -g @railway/cli`)
- Git

## デプロイ手順

### 1. Railwayへのログイン
```bash
railway login
```

### 2. プロジェクト作成
Railwayダッシュボード(https://railway.app/dashboard)で新しいプロジェクトを作成するか、以下のコマンドで作成:
```bash
railway project create
```

### 3. プロジェクトのリンク
```bash
cd tetris-game-master
railway link
```

### 4. 環境変数の設定
```bash
# Supabase環境変数
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://zwzlxicxzpwsidrrqbvv.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3emx4aWN4enB3c2lkcnJxYnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NTYzMDUsImV4cCI6MjA1OTUzMjMwNX0.YRg4jra_YsW4UChLePKNdLw4gk-afCNLHlkh4S8nY34
```

### 5. デプロイ
```bash
railway up
```

### 6. デプロイステータスの確認
```bash
railway status
```

### 7. アプリのURL確認
```bash
railway open
```

## トラブルシューティング

### Socket.IO接続エラー
- Socket.IOのパス設定が正しいか確認（`/api/socketio`）
- Railway環境で使用されるポートは自動的に設定されるため、package.jsonのstartスクリプトが`next start -p ${PORT:-3000}`となっていることを確認
- ブラウザのコンソールでネットワークエラーを確認

### デプロイエラー
```bash
railway logs
```
でエラーログを確認

### パフォーマンス問題
- Railway管理画面でリソース使用量（CPU/メモリ）を確認
- 必要に応じてスケールアップ

## デプロイフロー図

```
ローカル開発 -> git push -> Railway自動デプロイ
                       |
                       v
                ビルド (npm run build)
                       |
                       v
                 起動 (npm start)
                       |
                       v
               アプリケーション公開
```
