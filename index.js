require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 設定 ---
const PORT = process.env.PORT || 10000;
// 重要：將 CORS 設定改成 "*" (全網域開放)，一勞永逸解決預覽網址連線問題
app.use(cors({ origin: "*" })); 
app.use(express.json()); // 允許接收 JSON 資料

// 從環境變數讀取 Gemini API Key
const API_KEY = process.env.GEMINI_API_KEY; 

if (!API_KEY) {
  console.error("❌ 錯誤：未偵測到 GEMINI_API_KEY 環境變數！");
  process.exit(1);
}

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.get('/', (req, res) => res.send('Gobang AI Server (PVE) is Running'));

// --- AI 下棋接口 ---
app.post('/api/ai-move', async (req, res) => {
  const { board, playerColor } = req.body; // 接收棋盤和 AI 的顏色

  if (!board || !playerColor) {
    return res.status(400).json({ error: "缺少棋盤資料或玩家顏色" });
  }

  // 1. 建立給 Gemini 的 Prompt (加入更嚴格的指令)
  const prompt = `
    你是一個專業的五子棋（Gobang/Gomoku）AI 對手。
    目前的棋盤狀態是一個 15x15 的二維陣列（0:空位, 1:黑棋, 2:白棋）。
    你是玩家 ${playerColor === 2 ? '白棋 (2)' : '黑棋 (1)'}。
    請分析目前的局勢，找出最有利的下一步。優先順序：
    1. 如果你能連成五子，立刻下在那裡。
    2. 如果對手即將連成五子，立刻擋住。
    3. 嘗試建立連四或連三。
    4. 必須在陣列中找一個空位 (0)。

    這是目前的棋盤陣列：
    ${JSON.stringify(board)}

    請只回傳下一個座標，格式為：{"row": x, "col": y}。不要包含任何其他文字。
  `;

  try {
    // 2. 呼叫 Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 3. 解析 JSON 座標
    let aiMove;
    try {
      aiMove = JSON.parse(text);
    } catch (e) {
      // 如果 AI 回傳格式不正確，強制使用隨機位置避免崩潰
      console.warn("⚠️ AI 回傳格式錯誤:", text);
      const emptyCells = [];
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          if (board[r][c] === 0) emptyCells.push({row: r, col: c});
        }
      }
      aiMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    console.log(`🤖 AI (${playerColor === 2 ? '白棋' : '黑棋'}) 下在:`, aiMove);
    res.json(aiMove); // 回傳給前端

  } catch (error) {
    console.error("❌ Gemini API 錯誤:", error);
    res.status(500).json({ error: "AI 思考時發生錯誤" });
  }
});

http.listen(PORT, () => console.log(`🚀 AI Server on port ${PORT}`));