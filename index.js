require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PORT = process.env.PORT || 10000;

// --- 中間件設定 ---
app.use(cors({ origin: "*" }));
app.use(express.json());

// --- 1. MongoDB 連線設定 (強化穩定版) ---
// 這裡會嘗試連線，如果 5 秒沒反應就會報錯，方便我們從 Logs 抓問題
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, 
})
.then(() => console.log("✅ 成功！AI 大腦已接通 MongoDB"))
.catch(err => console.error("❌ MongoDB 連線失敗:", err.message));

// 定義記憶模型 (確保集合名稱為 memories)
const MemorySchema = new mongoose.Schema({
  lastMoves: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});
const Memory = mongoose.model('Memory', MemorySchema, 'memories');

// --- 2. Google Gemini AI 設定 ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- 3. API 路由：AI 下棋 ---
app.post('/api/ai-move', async (req, res) => {
  try {
    const { board } = req.body;

    // A. 從資料庫抓取最近 5 筆失敗教訓
    let lessons = "";
    try {
      const pastDefeats = await Memory.find().sort({ timestamp: -1 }).limit(5);
      lessons = pastDefeats.map((m, i) => `教訓 ${i+1}: ${JSON.stringify(m.lastMoves)}`).join('\n');
    } catch (dbErr) {
      console.log("讀取記憶失敗，改用空紀錄繼續執行");
    }

    // B. 組合給 AI 的大師級 Prompt
    const prompt = `
      你是一位五子棋特級大師。你是白棋 (2)，對手是黑棋 (1)。
      
      【座標指南】Row 0~14, Col 0~14。
      
      【歷史慘敗紀錄 - 絕對不准再犯！】
      ${lessons || "目前尚無失敗紀錄，你是無敵的。"}

      【當前棋盤狀態】
      (1:黑, 2:白, 0:空)
      ${board.map((r, i) => `R${i.toString().padStart(2, ' ')} | ${r.join(' ')}`).join('\n')}
      -------------------------------
      Col: 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14

      【思考指令】
      1. 優先：如果你下一手能達成 5 子連線，立刻贏球！
      2. 防禦：如果對手有 3 或 4 子連線，立刻去擋住！不准讓他贏！
      3. 策略：佔領中心，擴大優勢。

      請分析後，只回傳 JSON 格式：{"row": x, "col": y}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 清理 AI 回傳的文字，只留下 JSON 部分
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("AI 回傳格式不正確");
    
    res.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("AI 思考出錯:", error);
    res.status(500).json({ error: "AI 思考異常", details: error.message });
  }
});

// --- 4. API 路由：儲存失敗教訓 ---
app.post('/api/report-defeat', async (req, res) => {
  try {
    const { lastMoves } = req.body;
    console.log("📌 收到玩家舉報 AI 輸了:", lastMoves);

    // 存入 MongoDB
    const newMemory = new Memory({ lastMoves });
    await newMemory.save();

    res.status(200).send("AI 感到羞恥並記住了教訓");
  } catch (error) {
    console.error("❌ 存入失敗紀錄出錯:", error.message);
    res.status(500).send("紀錄失敗: " + error.message);
  }
});

// --- 啟動伺服器 ---
http.listen(PORT, () => {
  console.log(`🚀 五子棋後端大腦啟動於 Port: ${PORT}`);
});