import styles from '../styles/TetrisDisplay.module.css';

const ScoreDisplay = ({ score, level, linesCleared, remainingTime }) => {
  // 残り時間をフォーマット
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  return (
    <div className={styles.scoreDisplay}>
      <div className={styles.scoreItem}>
        <div className={styles.scoreTitle}>SCORE</div>
        <div className={styles.scoreValue}>{score}</div>
      </div>
      
      <div className={styles.scoreItem}>
        <div className={styles.scoreTitle}>LEVEL</div>
        <div className={styles.scoreValue}>{level}</div>
      </div>
      
      <div className={styles.scoreItem}>
        <div className={styles.scoreTitle}>LINES</div>
        <div className={styles.scoreValue}>{linesCleared}</div>
      </div>
      
      {remainingTime !== undefined && (
        <div className={styles.scoreItem}>
          <div className={styles.scoreTitle}>TIME</div>
          <div className={`${styles.scoreValue} ${remainingTime < 30 ? styles.warning : ''}`}>
            {formatTime(remainingTime)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay; 