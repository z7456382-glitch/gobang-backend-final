require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 1. 基礎設定 ---
const PORT = process.env.PORT || 10000;

// 允許所有網域連線 (解決 Vercel 預覽網址斷線問題)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));
app.use(express.json()); // 必備：讓伺服器看得懂前端傳來的 JSON 棋盤資料

// --- 2. 初始化 Gemini AI ---
const API_KEY = process.env.GEMINI_API_KEY; 

if (!API_KEY) {
  console.error("❌ 錯誤：Render 環境變數中找不到 GEMINI_API_KEY！");
  // 這裡不直接結束程序，讓伺服器能啟動，但 API 會回報錯誤
}

const genAI = new GoogleGenerativeAI(API_KEY || "NO_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 根路徑測試
app.get('/', (req, res) => {
  res.send('五子棋 AI 伺服器已啟動！請確保 Render 環境變數已設定 GEMINI_API_KEY。');
});

// --- 3. AI 下棋 API 接口 ---
app.post('/api/ai-move', async (req, res) => {
  const { board, playerColor } = req.body; 

  if (!board || !playerColor) {
    return res.status(400).json({ error: "缺少棋盤資料或顏色" });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "伺服器未設定 API Key" });
  }

  // 建立訓練 Gemini 的 Prompt
  const prompt = `
    你是一個專業的五子棋（Gobang/Gomoku）AI 對手。
    目前的棋盤狀態是一個 15x15 的二維陣列（0:空位, 1:黑棋, 2:白棋）。
    你是玩家 ${playerColor === 2 ? '白棋 (2)' : '黑棋 (1)'}。
    
    分析規則：
    1. 如果你能連成五子，立刻下在那裡。
    2. 如果對手即將連成五子，立刻擋住。
    3. 盡量佔領中心區域。
    4. 必須在陣列中找一個值為 0 的空位。

    目前棋盤：
    ${JSON.stringify(board)}

    請只回傳 JSON 格式的下一步座標，例如：{"row": 7, "col": 8}。不要有任何解釋文字。
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // 嘗試解析 AI 回傳的 JSON
    // 有時候 AI 會回傳 ```json {...} ```，我們用正則表達式過濾
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
      const aiMove = JSON.parse(jsonMatch[0]);
      console.log(`🤖 AI 下在: [${aiMove.row}, ${aiMove.col}]`);
      res.json(aiMove);
    } else {
      throw new Error("AI 回傳格式非 JSON");
    }

  } catch (error) {
    console.error("❌ Gemini API 發生錯誤:", error);
    
    // 備援方案：如果 AI 壞了，隨機找一個空格下，確保遊戲不卡死
    const emptyCells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c] === 0) emptyCells.push({ row: r, col: c });
      }
    }
    const randomMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    res.json(randomMove);
  }
});

// --- 4. 啟動伺服器 ---
http.listen(PORT, () => {
  console.log(`🚀 伺服器運作中：http://localhost:${PORT}`);
  console.log(`💡 請確保已將此網址填入前端 BACKEND_URL`);
});