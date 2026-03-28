require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 中間件設定 ---
app.use(cors());
app.use(express.json());

// --- 1. 初始化 Gemini AI (使用最穩定的 Pro 型號) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// gemini-pro 是相容性最強的版本，能避開 404 錯誤
const aiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

// --- 2. AI 下棋 API ---
app.post('/api/ai-move', async (req, res) => {
  try {
    const { board } = req.body;
    console.log("🧠 超強 AI (Gemini-Pro) 正在計算棋步...");

    // 將棋盤轉化為文字，協助 AI 辨識
    const boardString = board.map((row, i) => 
      `R${i.toString().padStart(2, ' ')}: ${row.join(' ')}`
    ).join('\n');

    const prompt = `
      你是五子棋大師。你執白子 (2)，對手執黑子 (1)。
      棋盤 15x15，0 是空位。
      
      【棋盤狀態】
      ${boardString}

      【指令】
      1. 優先達成五連。
      2. 必須擋住對手的活三或活四。
      3. 只能下在 0 的位置。
      
      請只回傳 JSON：{"row": x, "col": y, "reason": "說明"}
    `;
    
    const result = await aiModel.generateContent(prompt);
    const text = result.response.text();
    
    // 擷取 JSON
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("格式錯誤");
    
    const moveData = JSON.parse(jsonMatch[0]);
    console.log(`✅ AI 下在 [${moveData.row}, ${moveData.col}]`);
    
    res.json({ row: moveData.row, col: moveData.col });
  } catch (error) {
    console.error("❌ AI 思考失敗:", error.message);
    // 保險機制：如果 AI 失敗，隨機找個中心點位置下棋，不讓遊戲卡住
    res.json({ row: 7, col: 7 }); 
  }
});

// --- 3. 失敗報告 API ---
app.post('/api/report-defeat', (req, res) => {
  console.log("📌 收到戰敗訊息。");
  res.send("AI 已收到教訓");
});

// --- 啟動伺服器 ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 穩定版 AI 後端已啟動！Port: ${PORT}`);
});