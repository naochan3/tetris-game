import { useRef, useEffect } from 'react';
import styles from '../styles/TetrisBoard.module.css';

const TetrisBoard = ({ gameState, blockSize = 30 }) => {
  const canvasRef = useRef(null);
  
  // ゲーム状態からデータ抽出
  const { 
    board, 
    currentPiece, 
    currentX, 
    currentY,
    isGameOver
  } = gameState;
  
  // ボードのサイズ
  const width = board[0].length * blockSize;
  const height = board.length * blockSize;
  
  // キャンバスにゲーム状態を描画
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, width, height);
    
    // 背景グリッドの描画
    drawGrid(ctx);
    
    // 固定されたブロックの描画
    drawBoard(ctx);
    
    // 現在落下中のテトリミノ描画
    if (currentPiece && !isGameOver) {
      drawCurrentPiece(ctx);
    }
    
    // ゲームオーバー時の表示
    if (isGameOver) {
      drawGameOver(ctx);
    }
  }, [gameState, blockSize, width, height]);
  
  // グリッドの描画
  const drawGrid = (ctx) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // 横線
    for (let y = 0; y <= board.length; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * blockSize);
      ctx.lineTo(width, y * blockSize);
      ctx.stroke();
    }
    
    // 縦線
    for (let x = 0; x <= board[0].length; x++) {
      ctx.beginPath();
      ctx.moveTo(x * blockSize, 0);
      ctx.lineTo(x * blockSize, height);
      ctx.stroke();
    }
  };
  
  // 固定されたブロックの描画
  const drawBoard = (ctx) => {
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (board[y][x] !== 0) {
          // 色はboardに保存された色を使用
          drawBlock(ctx, x, y, board[y][x]);
        }
      }
    }
  };
  
  // 現在落下中のテトリミノの描画
  const drawCurrentPiece = (ctx) => {
    const shape = currentPiece.shape;
    const color = currentPiece.color;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] === 1) {
          // 現在位置にオフセットを加えて描画
          drawBlock(ctx, currentX + x, currentY + y, color);
        }
      }
    }
  };
  
  // ブロック1つの描画
  const drawBlock = (ctx, x, y, color) => {
    const blockX = x * blockSize;
    const blockY = y * blockSize;
    
    // ブロックの本体
    ctx.fillStyle = color;
    ctx.fillRect(blockX, blockY, blockSize, blockSize);
    
    // ブロックの境界線（立体感を出す）
    ctx.lineWidth = 2;
    
    // 明るい枠（左上）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(blockX, blockY + blockSize);
    ctx.lineTo(blockX, blockY);
    ctx.lineTo(blockX + blockSize, blockY);
    ctx.stroke();
    
    // 暗い枠（右下）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(blockX, blockY + blockSize);
    ctx.lineTo(blockX + blockSize, blockY + blockSize);
    ctx.lineTo(blockX + blockSize, blockY);
    ctx.stroke();
    
    // 内側の枠
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.strokeRect(blockX + 2, blockY + 2, blockSize - 4, blockSize - 4);
  };
  
  // ゲームオーバー表示
  const drawGameOver = (ctx) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', width / 2, height / 2 - 30);
    
    ctx.font = '20px Arial';
    ctx.fillText('Press SPACE to restart', width / 2, height / 2 + 30);
  };
  
  return (
    <div className={styles.tetrisBoard}>
      <canvas 
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
      />
    </div>
  );
};

export default TetrisBoard; 