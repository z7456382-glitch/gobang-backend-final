require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

app.use(cors());
app.use(express.json());

// --- 1. 初始化與診斷 ---
const apiKey = (process.env.GEMINI_API_KEY || "").trim();
const genAI = new GoogleGenerativeAI(apiKey);

// 啟動時在 Logs 檢查 Key 是否讀取成功（僅顯示頭尾保護安全）
const keyCheck = apiKey.length > 10 
  ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` 
  : "❌ KEY 格式錯誤或不存在";
console.log(`📡 後端啟動中... 目前讀取的 API Key: ${keyCheck}`);

// --- 2. AI 下棋 API ---
app.post('/api/ai-move', async (req, res) => {
  const { board } = req.body;
  
  try {
    console.log("🧠 正在呼叫 Gemini-1.5-Flash 進行思考...");

    // 使用最標準的型號獲取方式
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `你是五子棋大師，執白(2)。棋盤：${JSON.stringify(board)}。請只回傳 JSON：{"row": x, "col": y}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 解析 JSON 部分
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("AI 回傳格式非 JSON");
    
    const move = JSON.parse(jsonMatch[0]);
    console.log(`✅ AI 思考成功: [${move.row}, ${move.col}]`);
    res.json({ row: move.row, col: move.col });

  } catch (error) {
    // --- 🚨 核心備援邏輯：API 故障時自動隨機下棋 ---
    console.error(`❌ API 錯誤 (${error.message})。切換為隨機下棋模式。`);
    
    let emptyCells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c] === 0) emptyCells.push({ row: r, col: c });
      }
    }

    const fallbackMove = emptyCells.length > 0 
      ? emptyCells[Math.floor(Math.random() * emptyCells.length)] 
      : { row: 7, col: 7 };

    console.log(`⚠️ 備援機制執行座標: [${fallbackMove.row}, ${fallbackMove.col}]`);
    res.json(fallbackMove);
  }
});

app.post('/api/report-defeat', (req, res) => res.send("OK"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 五子棋後端已就緒！Port: ${PORT}`);
});