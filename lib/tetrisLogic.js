import { getRandomTetrimino, rotateTetrimino } from './tetriminos';

/**
 * テトリスのゲームロジックを管理するクラス
 */
export class TetrisGame {
  constructor(width = 10, height = 20) {
    // ゲームフィールドのサイズ
    this.width = width;
    this.height = height;
    
    // ゲームの状態
    this.isGameOver = false;
    this.isPaused = false;
    this.score = 0;
    this.level = 1;
    this.linesCleared = 0;
    
    // 現在のテトリミノと位置
    this.currentPiece = null;
    this.currentX = 0;
    this.currentY = 0;
    
    // ホールド中のテトリミノ
    this.heldPiece = null;
    this.canHold = true;
    
    // 次のテトリミノのキュー
    this.nextPieces = [];
    
    // ゲームフィールド（0が空、1以上がブロック）
    this.board = this.createEmptyBoard();
    
    // 次のテトリミノをキューに追加
    this.fillNextPiecesQueue();
    
    // 新しいテトリミノを生成
    this.spawnNewPiece();
  }
  
  /**
   * 空のゲームボードを作成
   */
  createEmptyBoard() {
    return Array(this.height).fill().map(() => Array(this.width).fill(0));
  }
  
  /**
   * 次のテトリミノキューを埋める
   */
  fillNextPiecesQueue(count = 3) {
    while (this.nextPieces.length < count) {
      this.nextPieces.push(getRandomTetrimino());
    }
  }
  
  /**
   * 新しいテトリミノを生成
   */
  spawnNewPiece() {
    // 次のテトリミノをキューから取り出し
    this.currentPiece = this.nextPieces.shift();
    
    // キューに新しいテトリミノを追加
    this.fillNextPiecesQueue();
    
    // 初期位置を設定（フィールドの上端中央）
    this.currentX = Math.floor(this.width / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
    this.currentY = 0;
    
    // ホールドが再度可能に
    this.canHold = true;
    
    // 衝突チェック（ゲームオーバー判定）
    if (this.checkCollision(this.currentX, this.currentY, this.currentPiece.shape)) {
      this.isGameOver = true;
    }
  }
  
  /**
   * 衝突チェック
   */
  checkCollision(x, y, shape) {
    const size = shape.length;
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        // テトリミノの形状が1（ブロックあり）の場合のみチェック
        if (shape[row][col] !== 1) continue;
        
        const boardX = x + col;
        const boardY = y + row;
        
        // ボード外か、既にブロックがある場合は衝突
        if (
          boardX < 0 || 
          boardX >= this.width || 
          boardY >= this.height || 
          (boardY >= 0 && this.board[boardY][boardX] !== 0)
        ) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * テトリミノを左に移動
   */
  moveLeft() {
    if (this.isPaused || this.isGameOver) return false;
    
    if (!this.checkCollision(this.currentX - 1, this.currentY, this.currentPiece.shape)) {
      this.currentX--;
      return true;
    }
    
    return false;
  }
  
  /**
   * テトリミノを右に移動
   */
  moveRight() {
    if (this.isPaused || this.isGameOver) return false;
    
    if (!this.checkCollision(this.currentX + 1, this.currentY, this.currentPiece.shape)) {
      this.currentX++;
      return true;
    }
    
    return false;
  }
  
  /**
   * テトリミノを下に移動（自然落下）
   */
  moveDown() {
    if (this.isPaused || this.isGameOver) return false;
    
    if (!this.checkCollision(this.currentX, this.currentY + 1, this.currentPiece.shape)) {
      this.currentY++;
      return true;
    } else {
      // 衝突した場合はテトリミノを固定
      this.lockPiece();
      return false;
    }
  }
  
  /**
   * ハードドロップ（一気に落下）
   */
  hardDrop() {
    if (this.isPaused || this.isGameOver) return;
    
    let dropDistance = 0;
    
    // 衝突するまで下に移動
    while (!this.checkCollision(this.currentX, this.currentY + 1 + dropDistance, this.currentPiece.shape)) {
      dropDistance++;
    }
    
    // 対象位置までドロップ
    this.currentY += dropDistance;
    
    // テトリミノを固定
    this.lockPiece();
  }
  
  /**
   * テトリミノを回転
   */
  rotate(clockwise = true) {
    if (this.isPaused || this.isGameOver) return false;
    
    const rotatedShape = rotateTetrimino(this.currentPiece.shape, clockwise);
    
    // 回転後の形状が衝突しないかチェック
    if (!this.checkCollision(this.currentX, this.currentY, rotatedShape)) {
      this.currentPiece.shape = rotatedShape;
      return true;
    }
    
    // 壁蹴り対応（回転が壁と衝突する場合、横にずらして再試行）
    const wallKickTests = [
      { x: 1, y: 0 },  // 右に1マス
      { x: -1, y: 0 }, // 左に1マス
      { x: 2, y: 0 },  // 右に2マス
      { x: -2, y: 0 }, // 左に2マス
      { x: 0, y: -1 }, // 上に1マス
      { x: 1, y: -1 }, // 右上に1マス
      { x: -1, y: -1 }, // 左上に1マス
      { x: 0, y: -2 }, // 上に2マス
    ];
    
    for (const test of wallKickTests) {
      if (!this.checkCollision(this.currentX + test.x, this.currentY + test.y, rotatedShape)) {
        this.currentX += test.x;
        this.currentY += test.y;
        this.currentPiece.shape = rotatedShape;
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * テトリミノを固定し、行の消去をチェック
   */
  lockPiece() {
    const shape = this.currentPiece.shape;
    const color = this.currentPiece.color;
    
    // ボードにテトリミノを固定
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 1) continue;
        
        const boardY = this.currentY + row;
        const boardX = this.currentX + col;
        
        // ボードの範囲内の場合のみ固定
        if (boardY >= 0 && boardY < this.height && boardX >= 0 && boardX < this.width) {
          // 色情報も保存（描画用）
          this.board[boardY][boardX] = color;
        }
      }
    }
    
    // 行の消去処理
    this.clearLines();
    
    // 新しいテトリミノを生成
    this.spawnNewPiece();
  }
  
  /**
   * 埋まった行を消去
   */
  clearLines() {
    let linesCleared = 0;
    
    // 下から順に各行をチェック
    for (let row = this.height - 1; row >= 0; row--) {
      // 行が完全に埋まっているかチェック
      const isLineFull = this.board[row].every(cell => cell !== 0);
      
      if (isLineFull) {
        // 行を消去（上の行を下に移動）
        for (let y = row; y > 0; y--) {
          this.board[y] = [...this.board[y - 1]];
        }
        
        // 最上段を空にする
        this.board[0] = Array(this.width).fill(0);
        
        // 消去行カウント
        linesCleared++;
        
        // 下に移動したため、同じ行を再チェック
        row++;
      }
    }
    
    // スコア計算
    if (linesCleared > 0) {
      this.updateScore(linesCleared);
    }
  }
  
  /**
   * スコア更新
   */
  updateScore(linesCleared) {
    // 消した行数を加算
    this.linesCleared += linesCleared;
    
    // レベル計算（10行ごとにレベルアップ）
    this.level = Math.floor(this.linesCleared / 10) + 1;
    
    // スコア計算
    const linePoints = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4行消し
    const pointsEarned = linePoints[linesCleared] * this.level;
    
    this.score += pointsEarned;
  }
  
  /**
   * ホールド機能
   */
  holdPiece() {
    if (this.isPaused || this.isGameOver || !this.canHold) return false;
    
    if (this.heldPiece === null) {
      // 初回ホールド
      this.heldPiece = { ...this.currentPiece };
      this.spawnNewPiece();
    } else {
      // ホールド交換
      const temp = { ...this.currentPiece };
      this.currentPiece = { ...this.heldPiece };
      this.heldPiece = temp;
      
      // 初期位置を設定
      this.currentX = Math.floor(this.width / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
      this.currentY = 0;
    }
    
    // 一度のみホールド可能
    this.canHold = false;
    
    return true;
  }
  
  /**
   * 現在のゲーム状態を取得
   */
  getGameState() {
    return {
      board: this.board,
      currentPiece: this.currentPiece,
      currentX: this.currentX,
      currentY: this.currentY,
      nextPieces: this.nextPieces,
      heldPiece: this.heldPiece,
      score: this.score,
      level: this.level,
      linesCleared: this.linesCleared,
      isGameOver: this.isGameOver,
      isPaused: this.isPaused
    };
  }
  
  /**
   * ゲームの状態リセット
   */
  resetGame() {
    this.board = this.createEmptyBoard();
    this.isGameOver = false;
    this.isPaused = false;
    this.score = 0;
    this.level = 1;
    this.linesCleared = 0;
    this.heldPiece = null;
    this.canHold = true;
    this.nextPieces = [];
    this.fillNextPiecesQueue();
    this.spawnNewPiece();
  }
  
  /**
   * 一時停止/再開
   */
  togglePause() {
    if (!this.isGameOver) {
      this.isPaused = !this.isPaused;
    }
    return this.isPaused;
  }
} 