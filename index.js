require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PORT = process.env.PORT || 10000;
app.use(cors({ origin: "*" }));
app.use(express.json());

// 1. 連接 MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ 記憶資料庫已連線"))
  .catch(err => console.error("❌ 資料庫連線失敗:", err));

// 定義失敗紀錄模型
const MemorySchema = new mongoose.Schema({
  lastMoves: String,
  timestamp: { type: Date, default: Date.now }
});
const Memory = mongoose.model('Memory', MemorySchema);

// 2. 初始化 AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 3. AI 下棋 API (強化大腦版)
app.post('/api/ai-move', async (req, res) => {
  try {
    const { board, playerColor } = req.body;

    // 抓取最近 5 次失敗經驗
    const pastDefeats = await Memory.find().sort({ timestamp: -1 }).limit(5);
    const lessons = pastDefeats.map((m, i) => `教訓 ${i+1}: ${m.lastMoves}`).join('\n');

    const prompt = `
      你是一位極度渴望勝利的五子棋特級大師。你是白棋 (2)，對手是黑棋 (1)。
      
      【座標指南】Row 0~14, Col 0~14。[7,7]是中心。
      
      【歷史慘敗紀錄 - 絕對不准再犯！】
      ${lessons || "目前尚無失敗紀錄，你是無敵的。"}

      【當前棋盤視覺化】
      (1:黑, 2:白, 0:空)
      ${board.map((r, i) => `R${i.toString().padStart(2, ' ')} | ${r.join(' ')}`).join('\n')}
      -------------------------------
      Col: 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14

      【大師級思維】
      - 掃描對手(1)是否有連續 3 或 4 個棋子？有的話立刻擋住！
      - 優先佔領中心區域。
      - 如果你能連成 5 子，立刻下在那裡贏得比賽。

      請分析後，只回傳 JSON：{"row": x, "col": y}
    `;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    const jsonMatch = text.match(/\{.*\}/s);
    res.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI 思考異常" });
  }
});

// 4. 接收失敗報告 API
app.post('/api/report-defeat', async (req, res) => {
  try {
    const { lastMoves } = req.body;
    await Memory.create({ lastMoves });
    console.log("📌 AI 已記下失敗教訓");
    res.send("AI 感到羞恥並記住了教訓");
  } catch (e) {
    res.status(500).send("紀錄失敗");
  }
});

http.listen(PORT, () => console.log(`🚀 大腦啟動於 ${PORT}`));