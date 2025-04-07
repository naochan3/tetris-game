import { useRef, useEffect } from 'react';
import styles from '../styles/TetrisDisplay.module.css';

const NextPieceDisplay = ({ piece, blockSize = 20, title = "NEXT" }) => {
  const canvasRef = useRef(null);
  
  // キャンバスのサイズ
  const width = 6 * blockSize;  // 余白を含めた適切なサイズ
  const height = 6 * blockSize;
  
  // キャンバスにテトリミノを描画
  useEffect(() => {
    if (!piece) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, width, height);
    
    // テトリミノを描画
    drawPiece(ctx);
  }, [piece, blockSize, width, height]);
  
  // テトリミノの描画
  const drawPiece = (ctx) => {
    if (!piece) return;
    
    const shape = piece.shape;
    const color = piece.color;
    const shapeWidth = shape[0].length;
    const shapeHeight = shape.length;
    
    // テトリミノを中央に配置するためのオフセットを計算
    const offsetX = Math.floor((width - shapeWidth * blockSize) / 2);
    const offsetY = Math.floor((height - shapeHeight * blockSize) / 2);
    
    for (let y = 0; y < shapeHeight; y++) {
      for (let x = 0; x < shapeWidth; x++) {
        if (shape[y][x] === 1) {
          // ブロックを描画
          drawBlock(ctx, offsetX + x * blockSize, offsetY + y * blockSize, color);
        }
      }
    }
  };
  
  // ブロック1つの描画
  const drawBlock = (ctx, x, y, color) => {
    // ブロックの本体
    ctx.fillStyle = color;
    ctx.fillRect(x, y, blockSize, blockSize);
    
    // ブロックの境界線（立体感を出す）
    ctx.lineWidth = 1;
    
    // 明るい枠（左上）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x, y + blockSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + blockSize, y);
    ctx.stroke();
    
    // 暗い枠（右下）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(x, y + blockSize);
    ctx.lineTo(x + blockSize, y + blockSize);
    ctx.lineTo(x + blockSize, y);
    ctx.stroke();
    
    // 内側の枠
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.strokeRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
  };
  
  return (
    <div className={styles.pieceDisplay}>
      <div className={styles.title}>{title}</div>
      <div className={styles.canvasContainer}>
        <canvas 
          ref={canvasRef}
          width={width}
          height={height}
          className={styles.canvas}
        />
      </div>
    </div>
  );
};

export default NextPieceDisplay; 