import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Game.module.css';
import botStyles from '../../styles/BotGame.module.css';
import TetrisBoard from '../../components/TetrisBoard';
import NextPieceDisplay from '../../components/NextPieceDisplay';
import HoldPieceDisplay from '../../components/HoldPieceDisplay';
import ScoreDisplay from '../../components/ScoreDisplay';
import { TetrisGame } from '../../lib/tetrisLogic';

// 難易度レベル
const DIFFICULTY_LEVELS = [
  { id: 'beginner', name: '初級者（弱い）', color: '#4CAF50', moveInterval: 800, thinkTime: 600, strategy: 'random' },
  { id: 'easy', name: '中級者', color: '#8BC34A', moveInterval: 600, thinkTime: 400, strategy: 'basic' },
  { id: 'normal', name: '上級者', color: '#FFC107', moveInterval: 400, thinkTime: 300, strategy: 'intermediate' },
  { id: 'hard', name: 'プロ級', color: '#FF9800', moveInterval: 250, thinkTime: 200, strategy: 'advanced' },
  { id: 'expert', name: '達人級', color: '#F44336', moveInterval: 150, thinkTime: 100, strategy: 'master' }
];

// 制限時間オプション（秒）
const TIME_OPTIONS = [
  { id: '1min', name: '1分', seconds: 60 },
  { id: '2min', name: '2分', seconds: 120 },
  { id: '3min', name: '3分', seconds: 180 }
];

export default function BotGame() {
  const router = useRouter();
  const [gamePhase, setGamePhase] = useState('setup'); // setup, playing, gameover
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS[2]); // デフォルトは「普通」
  const [selectedTimeOption, setSelectedTimeOption] = useState(TIME_OPTIONS[1]); // デフォルトは2分
  const [gameState, setGameState] = useState(null);
  const [botGameState, setBotGameState] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [username, setUsername] = useState('プレイヤー');
  
  // ゲームインスタンスの参照
  const gameRef = useRef(null);
  const botGameRef = useRef(null);
  // ゲームループのタイマーID
  const gameLoopRef = useRef(null);
  // 落下タイマーID
  const dropTimerRef = useRef(null);
  // Bot用タイマーIDの参照
  const botTimerRef = useRef(null);
  // キー入力状態
  const keyStateRef = useRef({});
  // 最後のキー処理時刻（連続入力制御用）
  const lastMoveTimeRef = useRef({ left: 0, right: 0, down: 0 });

  // GPT-4を使用した計画立案システムの参照
  const gptPlanRef = useRef({
    apiKey: null,
    nextPiecePlan: null,
    isPlanningInProgress: false,
    planningQueue: [],
    lastBoardState: null
  });

  // コンポーネントマウント時の処理
  useEffect(() => {
    // ユーザー名の取得
    const storedUsername = sessionStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }

    // イベントリスナーの設定
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // コンポーネントアンマウント時のクリーンアップ
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      // 全てのタイマーをクリア
      if (gameLoopRef.current) clearAnimationFrame(gameLoopRef.current);
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
      if (botTimerRef.current) clearInterval(botTimerRef.current);
    };
  }, []);

  // キーダウンイベントハンドラ
  const handleKeyDown = (e) => {
    keyStateRef.current[e.code] = true;
  };

  // キーアップイベントハンドラ
  const handleKeyUp = (e) => {
    keyStateRef.current[e.code] = false;
  };
  
  // ゲームの初期化
  const initializeGame = () => {
    // プレイヤーのゲームインスタンスを作成
    const game = new TetrisGame();
    gameRef.current = game;
    
    // Botのゲームインスタンスを作成
    const botGame = new TetrisGame();
    botGameRef.current = botGame;
    
    // 初期状態を設定
    setGameState(game.getGameState());
    setBotGameState(botGame.getGameState());
    setRemainingTime(selectedTimeOption.seconds);
    
    // ゲームフェーズを「プレイ中」に変更
    setGamePhase('playing');
    
    // ゲームループを開始
    startGameLoop();
    
    // Botの動作を開始
    startBotActions();
  };
  
  // Botアクションの開始
  const startBotActions = () => {
    if (botTimerRef.current) {
      clearInterval(botTimerRef.current);
    }
    
    // 難易度に応じたBotの思考間隔を設定
    const thinkInterval = selectedDifficulty.moveInterval;
    
    // GPT-4を使用した高度な思考ロジックの初期化
    initializeGPT4Planning();
    
    botTimerRef.current = setInterval(() => {
      if (botGameRef.current && !botGameRef.current.isGameOver && !botGameRef.current.isPaused) {
        const botAction = decideBotAction();
        executeBotAction(botAction);
        
        // Bot状態の更新
        setBotGameState(botGameRef.current.getGameState());
        
        // 連続的な行動を維持するために、次のピースが生成されたらすぐに行動を続ける
        if (botGameRef.current.currentPiece) {
          // 追加の行動（より頻繁に意思決定を行うことで反応性を向上）
          setTimeout(() => {
            if (botGameRef.current && !botGameRef.current.isGameOver && !botGameRef.current.isPaused) {
              const followUpAction = decideBotAction();
              executeBotAction(followUpAction);
              setBotGameState(botGameRef.current.getGameState());
            }
          }, thinkInterval / 2);
        }
      } else if (botGameRef.current && botGameRef.current.isGameOver) {
        clearInterval(botTimerRef.current);
      }
    }, thinkInterval);
  };
  
  // GPT-4による事前計画システムの初期化
  const initializeGPT4Planning = async () => {
    try {
      // セッションストレージからAPIキーを取得（管理者ページで設定されたもの）
      const apiKey = sessionStorage.getItem('openaiApiKey');
      
      if (!apiKey) {
        console.log('GPT-4 APIキーが設定されていません。標準のBotロジックを使用します。');
        return;
      }
      
      // APIキーを設定
      gptPlanRef.current.apiKey = apiKey;
      
      // 初期盤面の計算を開始
      if (botGameRef.current) {
        const gameState = botGameRef.current.getGameState();
        // 最初のピースが配置されたら次のピースの計画を立てる
        scheduleNextPiecePlanning(gameState);
      }
      
      console.log('GPT-4による事前計画システムが初期化されました');
    } catch (error) {
      console.error('GPT-4計画システム初期化エラー:', error);
    }
  };

  // 次のピース配置の計画をスケジュール
  const scheduleNextPiecePlanning = (gameState) => {
    if (!gptPlanRef.current.apiKey) return;
    
    // 現在のボードの状態を保存
    const currentBoardState = JSON.stringify(gameState.board);
    
    // 既に同じボード状態でプランニングが予定されている場合はスキップ
    if (gptPlanRef.current.lastBoardState === currentBoardState) {
      return;
    }
    
    gptPlanRef.current.lastBoardState = currentBoardState;
    
    // 計画キューに追加
    gptPlanRef.current.planningQueue.push({
      board: gameState.board,
      currentPiece: gameState.currentPiece,
      nextPieces: gameState.nextPieces
    });
    
    // 計画実行が進行中でなければ開始
    if (!gptPlanRef.current.isPlanningInProgress) {
      processPlanningQueue();
    }
  };

  // プランニングキューの処理
  const processPlanningQueue = async () => {
    if (gptPlanRef.current.planningQueue.length === 0) {
      gptPlanRef.current.isPlanningInProgress = false;
      return;
    }
    
    gptPlanRef.current.isPlanningInProgress = true;
    
    const planData = gptPlanRef.current.planningQueue.shift();
    try {
      const plan = await calculateOptimalPlacement(planData);
      
      // 計画を保存
      gptPlanRef.current.nextPiecePlan = plan;
      
      // 次の計画を処理
      processPlanningQueue();
    } catch (error) {
      console.error('ピース配置計画エラー:', error);
      gptPlanRef.current.isPlanningInProgress = false;
    }
  };

  // GPT-4を使用して最適な配置を計算
  const calculateOptimalPlacement = async (planData) => {
    if (!gptPlanRef.current.apiKey) return null;
    
    try {
      const { board, currentPiece, nextPieces } = planData;
      
      // ボード状態とピース情報をJSON形式に変換
      const boardData = JSON.stringify(board);
      const currentPieceData = JSON.stringify(currentPiece);
      const nextPiecesData = JSON.stringify(nextPieces);
      
      // GPT-4に送信するプロンプト
      const prompt = `
テトリスの最適な配置を計算してください。以下は現在の状態です：

ボード状態:
${boardData}

現在のピース:
${currentPieceData}

次のピース:
${nextPiecesData}

最適な配置計画を返してください。計画には以下の情報を含めてください：
1. 最終的なX座標
2. 最終的な回転状態
3. アクションの順序（left, right, rotate, hardDrop）

評価基準:
- ライン消去
- 穴の最小化
- 高さの均一化
- テトリス（4ライン消去）の可能性
`;

      // GPT-4 APIリクエスト
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gptPlanRef.current.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'あなたはテトリスの最適配置を計算するAIアシスタントです。ボード状態とピース情報から最適な配置計画をJSON形式で出力してください。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GPT-4 API エラー:', errorData);
        return null;
      }

      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('無効なAPIレスポース:', data);
        return null;
      }

      // JSONレスポンスをパース
      try {
        const planContent = data.choices[0].message.content;
        const planObject = JSON.parse(planContent);
        return planObject;
      } catch (parseError) {
        console.error('計画データのパースエラー:', parseError);
        return null;
      }
    } catch (error) {
      console.error('GPT-4計算エラー:', error);
      return null;
    }
  };

  // Botの次の行動を決定
  const decideBotAction = () => {
    const botGame = botGameRef.current;
    const gameState = botGame.getGameState();
    
    // GPT-4の計画が利用可能かつ有効な場合はそれを使用
    if (gptPlanRef.current.apiKey && gptPlanRef.current.nextPiecePlan) {
      const plan = gptPlanRef.current.nextPiecePlan;
      
      // 現在のピースが変わった場合は新しい計画を立てる
      if (gameState.currentPiece && plan.currentPieceType !== gameState.currentPiece.type) {
        scheduleNextPiecePlanning(gameState);
        
        // 計画がない場合は通常のロジックにフォールバック
        const boardState = analyzeBoardState(gameState.board);
        return decideBotActionByDifficulty(gameState, boardState);
      }
      
      // 計画に基づいてアクションを実行
      return executeGPTPlan(plan, gameState);
    }
    
    // APIキーがない場合や計画がない場合は通常のBot決定ロジックを使用
    const boardState = analyzeBoardState(gameState.board);
    return decideBotActionByDifficulty(gameState, boardState);
  };

  // GPT計画に基づいてアクションを実行
  const executeGPTPlan = (plan, gameState) => {
    if (!plan || !plan.actions || plan.actions.length === 0) {
      return 'down'; // 計画がない場合はデフォルトアクション
    }
    
    // 現在のX座標と目標座標を比較
    const currentX = gameState.currentPiece.x;
    
    // 回転状態を確認
    const currentRotation = gameState.currentPiece.rotation;
    const targetRotation = plan.targetRotation || 0;
    
    // 位置合わせが必要か
    if (currentRotation !== targetRotation) {
      return 'rotate';
    }
    
    // X座標の調整
    if (currentX < plan.targetX) {
      return 'right';
    } else if (currentX > plan.targetX) {
      return 'left';
    }
    
    // 位置が合っていればドロップ
    if (Math.random() < 0.7) {
      // 計画が完了したのでクリア
      gptPlanRef.current.nextPiecePlan = null;
      return 'hardDrop';
    }
    
    return 'down';
  };

  // 難易度に応じたBotアクション決定ロジック
  const decideBotActionByDifficulty = (gameState, boardState) => {
    // 選択された難易度のインデックスを取得
    const difficultyIndex = DIFFICULTY_LEVELS.findIndex(d => d.id === selectedDifficulty.id);
    
    // 難易度に応じた戦略選択
    switch (selectedDifficulty.strategy) {
      case 'random':
        return decideRandomAction();
      case 'basic':
        return decideBasicAction(gameState, boardState);
      case 'intermediate':
        return decideIntermediateAction(gameState, boardState);
      case 'advanced':
        return decideAdvancedAction(gameState, boardState);
      case 'master':
        return decideMasterAction(gameState, boardState);
      default:
        return decideRandomAction();
    }
  };
  
  // 盤面状態を分析
  const analyzeBoardState = (board) => {
    // 盤面の高さプロファイルを計算
    const heights = new Array(10).fill(0);
    
    // 各列の高さを計算
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 20; y++) {
        if (board[y][x] && heights[x] === 0) {
          heights[x] = 20 - y;
        }
      }
    }
    
    // 平均高さを計算
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / 10;
    
    // 隣接する列の高さの差の合計（凹凸の度合い）
    let bumpiness = 0;
    for (let i = 0; i < 9; i++) {
      bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }
    
    // 穴の数を計算（上にブロックがあり、下が空いている箇所）
    let holes = 0;
    for (let x = 0; x < 10; x++) {
      let blockFound = false;
      for (let y = 0; y < 20; y++) {
        if (board[y][x]) {
          blockFound = true;
        } else if (blockFound) {
          holes++;
        }
      }
    }
    
    // Iピース用の溝（4列消し用）を探す
    const hasISlot = heights.some((h, i) => 
      i < 7 && // 右端3列は除外
      heights[i] > avgHeight + 3 &&
      heights[i+1] < avgHeight - 2 &&
      heights[i+2] > avgHeight + 3 &&
      heights[i+3] > avgHeight + 3
    );
    
    // Tスピン用の形状を探す
    const hasTSpinSetup = detectTSpinSetup(board, heights);
    
    return {
      heights,
      avgHeight,
      bumpiness,
      holes,
      hasISlot,
      hasTSpinSetup
    };
  };
  
  // Tスピン用のセットアップを検出
  const detectTSpinSetup = (board, heights) => {
    // 簡易的なTスピンセットアップの検出
    // 実際のゲームではもっと複雑なパターン検出が必要
    for (let x = 1; x < 9; x++) {
      for (let y = 1; y < 19; y++) {
        // TSDのパターンを探す
        // 形状: □□□
        //       □◻□
        //       □□□
        const hasPattern = !board[y][x] &&
                           board[y-1][x-1] && board[y-1][x] && board[y-1][x+1] &&
                           board[y+1][x-1] && board[y+1][x+1];
        
        if (hasPattern) {
          return true;
        }
      }
    }
    return false;
  };
  
  // ランダムな行動を選択（初級者レベル）
  const decideRandomAction = () => {
    const actions = ['left', 'right', 'rotate', 'down', 'hardDrop'];
    
    // 基本的なライン消去戦略を追加（20%の確率で実行）
    const botGame = botGameRef.current;
    const gameState = botGame.getGameState();
    
    // 現在のピースを水平に置くことを優先（初級者でもライン消しの基本）
    if (Math.random() < 0.3) {
      const currentPiece = gameState.currentPiece?.type;
      
      // Iピースは水平に置く方が効果的
      if (currentPiece === 'I' && Math.random() < 0.5) {
        return 'rotate'; // Iピースを水平に回転させる確率を高く
      }
      
      // 左右に移動してラインを作りやすいポジションを探す
      if (Math.random() < 0.6) {
        return Math.random() < 0.5 ? 'left' : 'right';
      }
    }

    // 基本的にはランダムな動き
    if (Math.random() < 0.15) {
      return 'hardDrop'; // たまにハードドロップ
    }
    
    return actions[Math.floor(Math.random() * (actions.length - 1))];
  };
  
  // 基本的な行動を選択（中級者レベル）
  const decideBasicAction = (gameState, boardState) => {
    // 現在のピースを確認
    const currentPiece = gameState.currentPiece?.type;
    
    // 基本的なライン消去戦略：なるべく平らに積む
    
    // 盤面が高くなりすぎている場合は整地を優先
    if (boardState.avgHeight > 8) {
      // 最も低い列を見つけてその方向に移動
      const minHeightIndex = boardState.heights.indexOf(Math.min(...boardState.heights));
      
      if (minHeightIndex < 4) {
        return 'left';
      } else if (minHeightIndex > 5) {
        return 'right';
      }
    }
    
    // Iピース（棒）は横向きに置いてライン消去を狙う
    if (currentPiece === 'I') {
      // 水平に置く（90度回転させた状態）
      if (Math.random() < 0.7) {
        return 'rotate';
      }
      
      // 左右の高さを見て低い方に移動
      const leftHeight = boardState.heights.slice(0, 5).reduce((a, b) => a + b, 0);
      const rightHeight = boardState.heights.slice(5).reduce((a, b) => a + b, 0);
      
      if (leftHeight < rightHeight) {
        return 'left';
      } else {
        return 'right';
      }
    }
    
    // その他のピースも基本的に平らになるように配置
    // 高さの差が大きい場合は低い方へ移動
    if (boardState.bumpiness > 4) {
      const leftHeight = boardState.heights.slice(0, 5).reduce((a, b) => a + b, 0);
      const rightHeight = boardState.heights.slice(5).reduce((a, b) => a + b, 0);
      
      if (leftHeight > rightHeight + 3) {
        return 'right';
      } else if (rightHeight > leftHeight + 3) {
        return 'left';
      }
    }
    
    // 基本的な動き
    const rand = Math.random();
    
    // 回転の確率を上げる（良い形を探す）
    if (rand < 0.4) return 'rotate';
    
    // 左右移動
    if (rand < 0.7) return Math.random() < 0.5 ? 'left' : 'right';
    
    // 下方向
    if (rand < 0.85) return 'down';
    
    // 時々ハードドロップ
    return 'hardDrop';
  };
  
  // 中級の行動を選択（上級者レベル）
  const decideIntermediateAction = (gameState, boardState) => {
    // 現在のピースを確認
    const currentPiece = gameState.currentPiece?.type;
    const nextPiece = gameState.nextPieces[0]?.type;
    
    // 盤面が危険な高さになっている場合は整地を優先
    if (boardState.avgHeight > 12 || Math.max(...boardState.heights) > 15) {
      // 最も低い列を見つけてその方向に移動
      const minHeightIndex = boardState.heights.indexOf(Math.min(...boardState.heights));
      
      if (minHeightIndex < 5) {
        return 'left';
      } else {
        return 'right';
      }
    }
    
    // ライン消去を積極的に狙う

    // Iピースの場合
    if (currentPiece === 'I') {
      // 横一列に揃えるために回転（90度回した状態）
      if (Math.random() < 0.7) {
        return 'rotate';
      }
      
      // ほぼ揃っているラインを探して埋める戦略
      const almostCompleteRow = findAlmostCompleteRow(gameState.board);
      if (almostCompleteRow > -1) {
        // 穴の位置によって左右移動を決定
        const holePosition = findHoleInRow(gameState.board[almostCompleteRow]);
        
        if (holePosition < 5) {
          return 'left';
        } else {
          return 'right';
        }
      }
    }
    
    // その他のピースでもライン消去を意識
    // 高さの均一化を図る
    if (boardState.bumpiness > 3) {
      // 各列の高さから最適な置き場所を判断
      const optimalColumn = findOptimalColumn(boardState.heights, currentPiece);
      
      // 左に移動すべきか右に移動すべきか
      const currentX = gameState.currentPiece?.x || 5;
      if (currentX > optimalColumn) {
        return 'left';
      } else if (currentX < optimalColumn) {
        return 'right';
      } else {
        // 位置が合っているならハードドロップ
        if (Math.random() < 0.3) {
          return 'hardDrop';
        }
      }
    }
    
    // 基本的な動き
    const rand = Math.random();
    
    // 回転の確率を上げる（より良い形を探す）
    if (rand < 0.35) return 'rotate';
    
    // 左右移動
    if (rand < 0.7) return Math.random() < 0.5 ? 'left' : 'right';
    
    // 下方向
    if (rand < 0.85) return 'down';
    
    // 適切なタイミングでハードドロップ
    return 'hardDrop';
  };
  
  // ほぼ揃っている行を見つける（1〜2マス空いているような行）
  const findAlmostCompleteRow = (board) => {
    for (let y = 19; y >= 0; y--) {
      let blockCount = 0;
      for (let x = 0; x < 10; x++) {
        if (board[y][x]) blockCount++;
      }
      
      // 8〜9ブロックある行を見つける（ほぼ揃っている行）
      if (blockCount >= 8) {
        return y;
      }
    }
    return -1;
  };
  
  // 行の中の穴の位置を見つける
  const findHoleInRow = (row) => {
    for (let x = 0; x < 10; x++) {
      if (!row[x]) return x;
    }
    return -1;
  };
  
  // 最適な列を見つける
  const findOptimalColumn = (heights, pieceType) => {
    // 最も低い列を基本として、ピースタイプに応じた調整
    let minHeight = Math.min(...heights);
    let candidates = [];
    
    // 最も低い高さの列をすべて取得
    for (let i = 0; i < heights.length; i++) {
      if (heights[i] === minHeight || heights[i] === minHeight + 1) {
        candidates.push(i);
      }
    }
    
    // ピースタイプに応じた最適位置
    switch (pieceType) {
      case 'I':
        // Iピースは端よりも中央に置いた方が良い
        return candidates.filter(i => i > 1 && i < 8)[0] || 5;
      case 'O':
        // Oピースは位置調整があまり必要ない
        return candidates[0] || 4;
      case 'T':
      case 'L':
      case 'J':
        // T,L,Jピースは端に寄せない方が良い
        return candidates.filter(i => i > 0 && i < 9)[0] || 4;
      case 'S':
      case 'Z':
        // S,Zピースは隙間ができにくい位置に
        return candidates.filter(i => i > 1 && i < 8)[0] || 4;
      default:
        return candidates[0] || 4;
    }
  };
  
  // 高度な行動を選択（プロ級レベル）
  const decideAdvancedAction = (gameState, boardState) => {
    // 現在のピースとNEXTを活用した戦略
    const currentPiece = gameState.currentPiece?.type;
    const nextPieces = gameState.nextPieces.map(p => p?.type);
    
    // 危険な状況かチェック（高さが高すぎる）
    const maxHeight = Math.max(...boardState.heights);
    if (maxHeight > 16 || boardState.avgHeight > 14) {
      // 緊急モード：空いているスペースを探して埋める
      const minHeightIndex = boardState.heights.indexOf(Math.min(...boardState.heights));
      
      if (minHeightIndex < 5) {
        return 'left';
      } else {
        return 'right';
      }
    }
    
    // 1. ライン消し優先戦略を強化
    const completableRows = countNearlyCompleteRows(gameState.board);
    if (completableRows > 0) {
      // ライン消しに適したピースの配置
      return optimizeForLineClear(gameState, boardState);
    }

    // 2. ピース別最適化戦略
    switch (currentPiece) {
      case 'I':
        // 4ライン消し狙い
        if (findTetrispotential(gameState, boardState)) {
          return 'rotate'; // まずは横向きにする
        }
        return optimizeIPiece(gameState, boardState);
      case 'O':
        // O型は最も低い位置に配置
        return optimizeFlatSurface(gameState, boardState);
      case 'T':
        // Tスピン狙い
        return optimizeTSpinPotential(gameState, boardState);
      default:
        // その他のピースは平坦化優先
        return optimizeGeneric(gameState, boardState);
    }
  };
  
  // 4ライン消しの可能性を検出
  const findTetrispotential = (gameState, boardState) => {
    // I型ピースでテトリス（4ライン消し）ができそうか判定
    // 穴が揃っている形を探す
    const board = gameState.board;
    
    // 各列で連続してブロックがある高さを計算
    let potentialCol = -1;
    let maxFilledRows = 0;
    
    for (let x = 0; x < 10; x++) {
      let consecutiveFilled = 0;
      for (let y = 19; y >= 0; y--) {
        if (board[y][x]) {
          consecutiveFilled++;
        } else {
          break;
        }
      }
      
      if (consecutiveFilled >= 8 && consecutiveFilled > maxFilledRows) {
        potentialCol = x;
        maxFilledRows = consecutiveFilled;
      }
    }
    
    // 高さが揃った4列を見つける
    if (potentialCol >= 0) {
      return true;
    }
    
    return false;
  };
  
  // ライン消し最適化を強化
  const optimizeForLineClear = (gameState, boardState) => {
    const board = gameState.board;
    const currentPiece = gameState.currentPiece;
    
    // 最も消しやすい行を見つける
    let bestRow = -1;
    let maxBlocks = 0;
    let holePositions = [];
    
    for (let y = 19; y >= 0; y--) {
      let blockCount = 0;
      let rowHoles = [];
      
      for (let x = 0; x < 10; x++) {
        if (board[y][x]) {
          blockCount++;
        } else {
          rowHoles.push(x);
        }
      }
      
      // より多くのブロックがある行を優先（完成に近い行）
      if (blockCount > maxBlocks && blockCount < 10) {
        maxBlocks = blockCount;
        bestRow = y;
        holePositions = rowHoles;
      }
    }
    
    // 消せる行が見つかった場合
    if (bestRow >= 0 && holePositions.length > 0 && holePositions.length <= 4) {
      // 最初の穴の位置に移動を試みる
      const targetX = holePositions[0];
      const currentX = currentPiece?.x || 5;
      
      // 正確に位置合わせする
      if (Math.abs(currentX - targetX) <= 1) {
        if (currentX < targetX) return 'right';
        if (currentX > targetX) return 'left';
        
        // 位置が合っていれば回転して最適な形を探し、そして落とす
        if (Math.random() < 0.3) return 'rotate';
        if (Math.random() < 0.5) return 'hardDrop';
        return 'down';
      }
      
      // 遠ければ移動
      if (currentX < targetX) return 'right';
      return 'left';
    }
    
    // デフォルト行動
    if (Math.random() < 0.4) return 'rotate';
    return Math.random() < 0.5 ? 'left' : 'right';
  };
  
  // Iピース最適化
  const optimizeIPiece = (gameState, boardState) => {
    // Iピースは横向きに置いてライン消去を狙う
    // または4つ同時消し（テトリス）を狙う
    
    // 横向き配置
    if (Math.random() < 0.8) {
      return 'rotate';
    }
    
    // 空いているスペースを探す
    const lowSpotIndex = boardState.heights.indexOf(Math.min(...boardState.heights));
    const currentX = gameState.currentPiece?.x || 5;
    
    if (Math.abs(currentX - lowSpotIndex) <= 1) {
      // 位置が近ければハードドロップも検討
      if (Math.random() < 0.3) return 'hardDrop';
    }
    
    // 移動方向
    if (currentX < lowSpotIndex) return 'right';
    if (currentX > lowSpotIndex) return 'left';
    
    return 'down';
  };
  
  // Tスピンポテンシャル最適化
  const optimizeTSpinPotential = (gameState, boardState) => {
    // 基本はTスピンを狙わず、ライン消去を優先
    return optimizeGeneric(gameState, boardState);
  };
  
  // 汎用ピース最適化
  const optimizeGeneric = (gameState, boardState) => {
    // 基本的に平坦化と高さ最小化を図る
    const heights = boardState.heights;
    const currentX = gameState.currentPiece?.x || 5;
    
    // 最も低い列の近くに配置
    const lowestX = heights.indexOf(Math.min(...heights));
    
    // 回転して最適な形を探す
    if (Math.random() < 0.35) return 'rotate';
    
    // 移動
    if (currentX < lowestX) return 'right';
    if (currentX > lowestX) return 'left';
    
    // 位置が良ければ落とす
    if (Math.random() < 0.2) return 'hardDrop';
    
    return 'down';
  };
  
  // 達人レベルの行動を選択
  const decideMasterAction = (gameState, boardState) => {
    // 達人レベルではより複雑な戦略を組み合わせる
    
    // スコア、ライン数、レベルから状況判断
    const score = gameState.score;
    const linesCleared = gameState.linesCleared;
    const level = gameState.level;
    
    // 危機状態かどうか判断
    const isDangerous = Math.max(...boardState.heights) > 15 || boardState.avgHeight > 12;
    
    if (isDangerous) {
      // 危機回避モード
      return masterEmergencyAction(gameState, boardState);
    }
    
    // 序盤、中盤、終盤で戦略を変える
    if (linesCleared < 20) {
      // 序盤：基礎固め
      return masterEarlyGameAction(gameState, boardState);
    } else if (linesCleared < 50) {
      // 中盤：攻撃的に
      return masterMidGameAction(gameState, boardState);
    } else {
      // 終盤：安定性重視
      return masterLateGameAction(gameState, boardState);
    }
  };
  
  // 達人の危機回避行動
  const masterEmergencyAction = (gameState, boardState) => {
    // もっとも低い位置にピースを置く
    const lowestX = boardState.heights.indexOf(Math.min(...boardState.heights));
    const currentX = gameState.currentPiece?.x || 5;
    
    // 低い場所に急いで移動
    if (Math.abs(currentX - lowestX) <= 1) {
      // 位置が近ければ落とす
      if (Math.random() < 0.5) return 'hardDrop';
    }
    
    // 移動方向
    if (currentX < lowestX) return 'right';
    if (currentX > lowestX) return 'left';
    
    // 適切な回転を探す
    if (Math.random() < 0.3) return 'rotate';
    
    return 'down';
  };
  
  // 達人の序盤戦略
  const masterEarlyGameAction = (gameState, boardState) => {
    // 序盤は平坦な地形を作ることに集中
    const currentPiece = gameState.currentPiece?.type;
    
    // ピース別の最適配置
    switch (currentPiece) {
      case 'I':
        // Iピースは平らに置く
        if (Math.random() < 0.8) return 'rotate';
        break;
      case 'O':
        // Oピースは調整不要
        break;
      default:
        // その他のピースは回転して最適形を探す
        if (Math.random() < 0.4) return 'rotate';
    }
    
    // 均一な高さを保つ
    const heights = boardState.heights;
    const avgHeight = boardState.avgHeight;
    const currentX = gameState.currentPiece?.x || 5;
    
    // 低い場所を優先
    const targetX = heights.findIndex(h => h < avgHeight);
    
    if (targetX >= 0) {
      if (currentX < targetX) return 'right';
      if (currentX > targetX) return 'left';
    }
    
    // デフォルト動作
    return Math.random() < 0.7 ? 'down' : 'hardDrop';
  };
  
  // 達人の中盤戦略
  const masterMidGameAction = (gameState, boardState) => {
    // 中盤はライン消去効率を重視
    const currentPiece = gameState.currentPiece?.type;
    
    // ライン消去の機会を探る
    const completableRows = countNearlyCompleteRows(gameState.board);
    
    if (completableRows > 0) {
      // ライン消去チャンス
      return optimizeForLineClear(gameState, boardState);
    }
    
    // ピース別戦略
    if (currentPiece === 'I') {
      if (Math.random() < 0.7) {
        // 横向きでライン消去
        return 'rotate';
      }
    }
    
    // 平坦化を維持
    if (boardState.bumpiness > 3) {
      return optimizeForFlatSurface(gameState, boardState);
    }
    
    // デフォルト
    const rand = Math.random();
    if (rand < 0.3) return 'rotate';
    if (rand < 0.7) return rand < 0.5 ? 'left' : 'right';
    return rand < 0.8 ? 'down' : 'hardDrop';
  };
  
  // 達人の終盤戦略
  const masterLateGameAction = (gameState, boardState) => {
    // 終盤は安全性を重視
    const currentPiece = gameState.currentPiece?.type;
    
    // 高さが心配なレベルか
    if (boardState.avgHeight > 8) {
      // 危険を回避する積み方
      const lowestX = boardState.heights.indexOf(Math.min(...boardState.heights));
      const currentX = gameState.currentPiece?.x || 5;
      
      // 低い場所に素早く置く
      if (Math.abs(currentX - lowestX) <= 1) {
        if (Math.random() < 0.3) return 'hardDrop';
      }
      
      // 移動方向
      if (currentX < lowestX) return 'right';
      if (currentX > lowestX) return 'left';
    }
    
    // 基本的にはラインを消していく
    const nearComplete = findAlmostCompleteRow(gameState.board);
    if (nearComplete >= 0) {
      // 行が見つかったらその行を埋める
      return optimizeForLineClear(gameState, boardState);
    }
    
    // デフォルト
    return Math.random() < 0.4 ? 'rotate' : (Math.random() < 0.5 ? 'left' : 'right');
  };
  
  // Botアクションの実行
  const executeBotAction = (action) => {
    const botGame = botGameRef.current;
    
    switch (action) {
      case 'left':
        botGame.moveLeft();
        break;
      case 'right':
        botGame.moveRight();
        break;
      case 'rotate':
        botGame.rotate(true);
        break;
      case 'down':
        botGame.moveDown();
        break;
      case 'hardDrop':
        botGame.hardDrop();
        break;
      case 'hold':
        botGame.holdPiece();
        break;
    }
  };
  
  // ゲームループの開始
  const startGameLoop = () => {
    // 前回のタイマーをクリア
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    
    // アニメーションフレームを使用したゲームループ
    const gameLoop = () => {
      const game = gameRef.current;
      
      // キー入力の処理
      handleInputs();
      
      // ゲーム状態を更新
      setGameState(game.getGameState());
      
      // ゲームオーバーでなければループを継続
      if (!game.isGameOver) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      } else {
        // ゲームオーバー時の処理
        setGamePhase('gameover');
        stopDropTimer();
        
        // Botのタイマーも停止
        if (botTimerRef.current) {
          clearInterval(botTimerRef.current);
        }
      }
    };
    
    // 初回ループ開始
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    // 自然落下タイマーの開始
    startDropTimer();
    
    // タイマーのカウントダウン開始
    startGameTimer();
  };
  
  // 自然落下タイマーの開始
  const startDropTimer = () => {
    if (dropTimerRef.current) {
      clearInterval(dropTimerRef.current);
    }
    
    // ゲームのレベルに応じた落下速度を計算
    const getDropInterval = () => {
      const level = gameRef.current.level;
      // レベルが上がるほど速くなる（ミリ秒）
      return Math.max(100, 1000 - (level - 1) * 100);
    };
    
    // 落下処理を定期的に実行
    dropTimerRef.current = setInterval(() => {
      const game = gameRef.current;
      
      if (game && !game.isPaused && !game.isGameOver) {
        game.moveDown();
        
        // 速度更新（レベルアップ時）
        clearInterval(dropTimerRef.current);
        dropTimerRef.current = setInterval(() => {
          if (game && !game.isPaused && !game.isGameOver) {
            game.moveDown();
          }
        }, getDropInterval());
      }
    }, getDropInterval());
  };
  
  // 自然落下タイマーの停止
  const stopDropTimer = () => {
    if (dropTimerRef.current) {
      clearInterval(dropTimerRef.current);
      dropTimerRef.current = null;
    }
  };
  
  // ゲーム時間のカウントダウン
  const startGameTimer = () => {
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          // 時間切れでゲーム終了
          clearInterval(timer);
          if (gameRef.current) {
            gameRef.current.isGameOver = true;
          }
          
          // Botのタイマーも停止
          if (botTimerRef.current) {
            clearInterval(botTimerRef.current);
          }
          
          setGamePhase('gameover');
          stopDropTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // コンポーネントのアンマウント時やゲーム終了時にタイマーをクリア
    return () => clearInterval(timer);
  };
  
  // キー入力の処理
  const handleInputs = () => {
    const game = gameRef.current;
    const now = Date.now();
    
    // キー入力の間隔（ミリ秒）
    const moveDelay = 100;
    
    // 左移動
    if (keyStateRef.current.ArrowLeft && now - lastMoveTimeRef.current.left > moveDelay) {
      game.moveLeft();
      lastMoveTimeRef.current.left = now;
    }
    
    // 右移動
    if (keyStateRef.current.ArrowRight && now - lastMoveTimeRef.current.right > moveDelay) {
      game.moveRight();
      lastMoveTimeRef.current.right = now;
    }
    
    // 下移動（ソフトドロップ）
    if (keyStateRef.current.ArrowDown && now - lastMoveTimeRef.current.down > moveDelay / 2) {
      game.moveDown();
      lastMoveTimeRef.current.down = now;
    }
  };
  
  // 難易度選択の処理
  const handleDifficultySelect = (difficulty) => {
    setSelectedDifficulty(difficulty);
  };
  
  // 制限時間選択の処理
  const handleTimeSelect = (timeOption) => {
    setSelectedTimeOption(timeOption);
  };
  
  // ゲーム開始の処理
  const handleStartGame = () => {
    initializeGame();
  };
  
  // ゲームメニューに戻る
  const handleBackToMenu = () => {
    router.push('/game');
  };
  
  // 再プレイの処理
  const handlePlayAgain = () => {
    setGamePhase('setup');
  };
  
  // ゲーム設定画面
  const renderSetupScreen = () => {
    return (
      <div className={botStyles.setupScreen}>
        <h1 className={botStyles.title}>Bot対戦モード</h1>
        
        <div className={botStyles.setupSection}>
          <h2>難易度選択</h2>
          <div className={botStyles.optionsGrid}>
            {DIFFICULTY_LEVELS.map((difficulty) => (
              <div
                key={difficulty.id}
                className={`${botStyles.optionCard} ${selectedDifficulty.id === difficulty.id ? botStyles.selected : ''}`}
                onClick={() => handleDifficultySelect(difficulty)}
                style={{ borderColor: difficulty.color }}
              >
                <div className={botStyles.optionName}>{difficulty.name}</div>
                <div 
                  className={botStyles.difficultyIndicator}
                  style={{ backgroundColor: difficulty.color }}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className={botStyles.setupSection}>
          <h2>制限時間</h2>
          <div className={botStyles.optionsGrid}>
            {TIME_OPTIONS.map((timeOption) => (
              <div
                key={timeOption.id}
                className={`${botStyles.optionCard} ${selectedTimeOption.id === timeOption.id ? botStyles.selected : ''}`}
                onClick={() => handleTimeSelect(timeOption)}
              >
                <div className={botStyles.optionName}>{timeOption.name}</div>
                <div className={botStyles.optionTime}>{timeOption.seconds}秒</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className={botStyles.buttonContainer}>
          <button className={botStyles.startButton} onClick={handleStartGame}>
            ゲームスタート
          </button>
          <button className={botStyles.backButton} onClick={handleBackToMenu}>
            メニューに戻る
          </button>
        </div>
      </div>
    );
  };
  
  // ゲームプレイ画面
  const renderGameScreen = () => {
    if (!gameState || !botGameState) return null;
    
    return (
      <div className={botStyles.gameScreen}>
        <div className={botStyles.gameRow}>
          <div className={botStyles.playerSection}>
            <div className={botStyles.sectionHeader}>
              <h2>プレイヤー</h2>
            </div>
            
            <div className={botStyles.gameContainer}>
              <div className={botStyles.sidePanel}>
                <HoldPieceDisplay 
                  piece={gameState.heldPiece} 
                  canHold={gameState.canHold} 
                />
                <ScoreDisplay 
                  score={gameState.score} 
                  level={gameState.level} 
                  linesCleared={gameState.linesCleared}
                  remainingTime={remainingTime}
                />
              </div>
              
              <div className={botStyles.mainBoard}>
                <TetrisBoard gameState={gameState} />
              </div>
              
              <div className={botStyles.sidePanel}>
                <NextPieceDisplay piece={gameState.nextPieces[0]} title="NEXT" />
                {gameState.nextPieces[1] && (
                  <NextPieceDisplay piece={gameState.nextPieces[1]} title="NEXT+1" />
                )}
                {gameState.nextPieces[2] && (
                  <NextPieceDisplay piece={gameState.nextPieces[2]} title="NEXT+2" />
                )}
              </div>
            </div>
          </div>
          
          <div className={botStyles.botSection}>
            <div className={botStyles.sectionHeader}>
              <h2>Bot: {selectedDifficulty.name}</h2>
            </div>
            
            <div className={botStyles.botDisplay}>
              {/* Bot のゲーム状況を表示 */}
              <div className={botStyles.botGame}>
                <TetrisBoard gameState={botGameState} />
                
                <div className={botStyles.botInfo}>
                  <div className={botStyles.botInfoRow}>
                    <div className={botStyles.botInfoLabel}>スコア:</div>
                    <div className={botStyles.botInfoValue}>{botGameState.score}</div>
                  </div>
                  <div className={botStyles.botInfoRow}>
                    <div className={botStyles.botInfoLabel}>レベル:</div>
                    <div className={botStyles.botInfoValue}>{botGameState.level}</div>
                  </div>
                  <div className={botStyles.botInfoRow}>
                    <div className={botStyles.botInfoLabel}>ライン:</div>
                    <div className={botStyles.botInfoValue}>{botGameState.linesCleared}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={botStyles.controls}>
          <div className={botStyles.controlsInfo}>
            <h3>操作方法</h3>
            <div className={botStyles.controlsList}>
              <div className={botStyles.controlItem}>
                <span>← →</span>
                <span>左右移動</span>
              </div>
              <div className={botStyles.controlItem}>
                <span>↓</span>
                <span>下に移動</span>
              </div>
              <div className={botStyles.controlItem}>
                <span>↑ / X</span>
                <span>回転</span>
              </div>
              <div className={botStyles.controlItem}>
                <span>Shift / C</span>
                <span>ホールド</span>
              </div>
              <div className={botStyles.controlItem}>
                <span>スペース</span>
                <span>ハードドロップ</span>
              </div>
              <div className={botStyles.controlItem}>
                <span>ESC</span>
                <span>一時停止</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // ゲームオーバー画面
  const renderGameOverScreen = () => {
    if (!gameState || !botGameState) return null;
    
    // 勝敗判定（スコアで比較）
    const playerWins = gameState.score > botGameState.score;
    const isTie = gameState.score === botGameState.score;
    
    return (
      <div className={botStyles.gameOverScreen}>
        <h1 className={botStyles.gameOverTitle}>ゲーム終了</h1>
        
        <div className={botStyles.resultAnnouncement}>
          {playerWins ? (
            <h2 className={botStyles.playerWins}>あなたの勝利！</h2>
          ) : isTie ? (
            <h2 className={botStyles.tie}>引き分け</h2>
          ) : (
            <h2 className={botStyles.botWins}>Botの勝利</h2>
          )}
        </div>
        
        <div className={botStyles.gameResults}>
          <div className={botStyles.resultColumn}>
            <h3>プレイヤー</h3>
            <div className={botStyles.gameStats}>
              <div className={botStyles.statItem}>
                <div className={botStyles.statLabel}>スコア</div>
                <div className={botStyles.statValue}>{gameState.score}</div>
              </div>
              
              <div className={botStyles.statItem}>
                <div className={botStyles.statLabel}>レベル</div>
                <div className={botStyles.statValue}>{gameState.level}</div>
              </div>
              
              <div className={botStyles.statItem}>
                <div className={botStyles.statLabel}>消したライン</div>
                <div className={botStyles.statValue}>{gameState.linesCleared}</div>
              </div>
            </div>
          </div>
          
          <div className={botStyles.resultColumn}>
            <h3>Bot: {selectedDifficulty.name}</h3>
            <div className={botStyles.gameStats}>
              <div className={botStyles.statItem}>
                <div className={botStyles.statLabel}>スコア</div>
                <div className={botStyles.statValue}>{botGameState.score}</div>
              </div>
              
              <div className={botStyles.statItem}>
                <div className={botStyles.statLabel}>レベル</div>
                <div className={botStyles.statValue}>{botGameState.level}</div>
              </div>
              
              <div className={botStyles.statItem}>
                <div className={botStyles.statLabel}>消したライン</div>
                <div className={botStyles.statValue}>{botGameState.linesCleared}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={botStyles.buttonContainer}>
          <button className={botStyles.playAgainButton} onClick={handlePlayAgain}>
            もう一度プレイ
          </button>
          <button className={botStyles.backButton} onClick={handleBackToMenu}>
            メニューに戻る
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Bot対戦 | Torihada Training</title>
        <meta name="description" content="Bot対戦モード" />
      </Head>
      
      <header className={styles.header}>
        <h1 className={styles.logo}>Torihada Training</h1>
        <div className={styles.version}>v0.1</div>
        <button onClick={handleBackToMenu} className={styles.backButton}>
          メニューに戻る
        </button>
      </header>
      
      <main className={styles.main}>
        {gamePhase === 'setup' && renderSetupScreen()}
        {gamePhase === 'playing' && renderGameScreen()}
        {gamePhase === 'gameover' && renderGameOverScreen()}
      </main>
      
      <footer className={styles.footer}>
        <p>Torihada Training &copy; 2025</p>
      </footer>
    </div>
  );
} 