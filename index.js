require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 中間件 ---
app.use(cors());
app.use(express.json());

// --- 1. 初始化 Google AI (自動去除前後空格) ---
const apiKey = (process.env.GEMINI_API_KEY || "").trim();
const genAI = new GoogleGenerativeAI(apiKey);

// --- 2. AI 下棋 API ---
app.post('/api/ai-move', async (req, res) => {
  const { board } = req.body;
  
  try {
    console.log("🧠 正在嘗試呼叫 Gemini API...");

    // 使用最基礎且支援度最高的型號名稱
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `你是五子棋大師，執白(2)。棋盤：${JSON.stringify(board)}。請只回傳 JSON：{"row": x, "col": y}`;
    
    // 設定 5 秒超時，避免 Render 等太久
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 解析 JSON
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("AI 回傳格式錯誤");
    
    const move = JSON.parse(jsonMatch[0]);
    console.log(`✅ AI 思考成功: [${move.row}, ${move.col}]`);
    res.json({ row: move.row, col: move.col });

  } catch (error) {
    // --- 🚨 自動接管系統：當 API 404 或失效時執行 ---
    console.error("❌ API 故障 (原因: " + error.message + ")。已啟動隨機下棋備援模式。");
    
    let emptyCells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c] === 0) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }

    // 隨機選一個空位，確保遊戲流程不中斷
    const fallbackMove = emptyCells.length > 0 
      ? emptyCells[Math.floor(Math.random() * emptyCells.length)] 
      : { row: 7, col: 7 };

    console.log(`⚠️ 備援機制下棋座標: [${fallbackMove.row}, ${fallbackMove.col}]`);
    res.json(fallbackMove);
  }
});

// --- 3. 失敗報告 API ---
app.post('/api/report-defeat', (req, res) => {
  res.send("OK");
});

// --- 啟動伺服器 ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 五子棋後端已啟動！`);
  console.log(`📡 監聽 Port: ${PORT}`);
});