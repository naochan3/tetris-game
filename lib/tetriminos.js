/**
 * テトリスのピース（テトリミノ）の定義
 * 各ピースは4x4のグリッドで表現され、1が実際のブロック、0が空白を表す
 */

// Iピース（水色）
export const TETRIMINO_I = {
  shape: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  color: '#00FFFF' // シアン
};

// Jピース（青）
export const TETRIMINO_J = {
  shape: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  color: '#0000FF' // ブルー
};

// Lピース（オレンジ）
export const TETRIMINO_L = {
  shape: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  color: '#FF7F00' // オレンジ
};

// Oピース（黄色）
export const TETRIMINO_O = {
  shape: [
    [1, 1],
    [1, 1]
  ],
  color: '#FFFF00' // イエロー
};

// Sピース（緑）
export const TETRIMINO_S = {
  shape: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  color: '#00FF00' // グリーン
};

// Tピース（紫）
export const TETRIMINO_T = {
  shape: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  color: '#800080' // パープル
};

// Zピース（赤）
export const TETRIMINO_Z = {
  shape: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  color: '#FF0000' // レッド
};

// 全テトリミノのリスト
export const TETRIMINOS = [
  TETRIMINO_I,
  TETRIMINO_J,
  TETRIMINO_L,
  TETRIMINO_O,
  TETRIMINO_S,
  TETRIMINO_T,
  TETRIMINO_Z
];

/**
 * ランダムなテトリミノを生成する
 * @returns {Object} テトリミノオブジェクト
 */
export function getRandomTetrimino() {
  const randomIndex = Math.floor(Math.random() * TETRIMINOS.length);
  return { ...TETRIMINOS[randomIndex] };
}

/**
 * テトリミノを回転させる
 * @param {Array} shape テトリミノの形状（2次元配列）
 * @param {boolean} clockwise 時計回りか反時計回りか
 * @returns {Array} 回転後のテトリミノの形状
 */
export function rotateTetrimino(shape, clockwise = true) {
  const size = shape.length;
  const newShape = Array(size).fill().map(() => Array(size).fill(0));

  if (clockwise) {
    // 時計回り
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        newShape[y][x] = shape[size - 1 - x][y];
      }
    }
  } else {
    // 反時計回り
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        newShape[y][x] = shape[x][size - 1 - y];
      }
    }
  }

  return newShape;
} 