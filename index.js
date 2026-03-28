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

// 1. 連接 MongoDB (增加自動重新連線機制)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ 記憶資料庫已連線"))
  .catch(err => console.error("❌ 資料庫連線失敗:", err));

// 2. 定義模型 (將 lastMoves 改為 Mixed 類型，更包容資料)
const MemorySchema = new mongoose.Schema({
  lastMoves: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
}, { collection: 'memories' }); // 強制指定資料表名稱
const Memory = mongoose.model('Memory', MemorySchema);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 3. AI 下棋
app.post('/api/ai-move', async (req, res) => {
  try {
    const { board } = req.body;
    const pastDefeats = await Memory.find().sort({ timestamp: -1 }).limit(5);
    const lessons = pastDefeats.map((m, i) => `教訓 ${i+1}: ${JSON.stringify(m.lastMoves)}`).join('\n');

    const prompt = `你是五子棋大師。你是白棋(2)。目前棋盤：\n${board.map((r, i) => `R${i}: ${r.join(' ')}`).join('\n')}\n歷史教訓：\n${lessons}\n請只回傳 JSON：{"row": x, "col": y}`;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    const jsonMatch = text.match(/\{.*\}/s);
    res.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 關鍵修正：接收失敗報告 API
app.post('/api/report-defeat', async (req, res) => {
  try {
    const { lastMoves } = req.body;
    console.log("嘗試存入教訓:", lastMoves);
    
    // 建立並儲存
    const newMemory = new Memory({ lastMoves: lastMoves });
    await newMemory.save();
    
    res.status(200).send("AI 感到羞恥並記住了教訓");
  } catch (e) {
    console.error("儲存失敗詳細原因:", e);
    res.status(500).send(`紀錄失敗: ${e.message}`);
  }
});

http.listen(PORT, () => console.log(`🚀 大腦運作中`));