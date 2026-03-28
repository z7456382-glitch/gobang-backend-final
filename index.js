require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient } = require('mongodb'); // 改用官方原生驅動，更穩定
const { GoogleGenerativeAI } = require('@google/generative-ai');

app.use(cors());
app.use(express.json());

// 1. MongoDB 官方原生連線
const client = new MongoClient(process.env.MONGODB_URI);
let dbMemory = null;

async function connectDB() {
  try {
    await client.connect();
    dbMemory = client.db("gobang").collection("memories");
    console.log("✅ MongoDB 原生連線成功！");
  } catch (e) {
    console.error("❌ DB 連不上，但沒關係，AI 繼續運作:", e.message);
  }
}
connectDB();

// 2. Gemini 設定
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 3. AI 下棋 API
app.post('/api/ai-move', async (req, res) => {
  try {
    const { board } = req.body;
    let lessons = "尚無歷史紀錄";
    
    if (dbMemory) {
      const past = await dbMemory.find().sort({ timestamp: -1 }).limit(3).toArray();
      lessons = JSON.stringify(past);
    }

    const prompt = `你是五子棋大師。你是白棋(2)。目前棋盤：\n${JSON.stringify(board)}\n歷史教訓：\n${lessons}\n請只回傳 JSON：{"row": x, "col": y}`;
    
    const result = await aiModel.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    res.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("AI 錯誤:", error);
    res.status(200).json({ row: 7, col: 7 }); // 報錯時至少回傳一個中心點
  }
});

// 4. 存入失敗 API
app.post('/api/report-defeat', async (req, res) => {
  try {
    if (!dbMemory) throw new Error("資料庫未就緒");
    const { lastMoves } = req.body;
    await dbMemory.insertOne({ lastMoves, timestamp: new Date() });
    res.send("AI 感到羞恥並記住了教訓");
  } catch (e) {
    res.status(500).send("紀錄失敗: " + e.message);
  }
});

app.listen(process.env.PORT || 10000, () => console.log("🚀 後端已啟動"));