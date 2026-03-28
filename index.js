require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 中間件設定 ---
app.use(cors());
app.use(express.json());

// --- 1. 初始化 Gemini AI (修正型號名稱) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// 使用 gemini-1.5-flash-latest 確保連線最穩定
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- 2. AI 下棋 API (最強 Prompt 版) ---
app.post('/api/ai-move', async (req, res) => {
  try {
    const { board } = req.body;
    console.log("🧠 超強 AI 正在計算棋步...");

    // 將棋盤轉化為易讀的字串，幫助 AI 辨識座標
    const boardString = board.map((row, i) => 
      `R${i.toString().padStart(2, ' ')}: ${row.join(' ')}`
    ).join('\n');

    const prompt = `
      你是世界五子棋特級大師。你執白子 (2)，對手執黑子 (1)。
      棋盤為 15x15，0 代表空位。

      【當前棋盤】
      (行 R00-R14, 列 從左到右)
      ${boardString}

      【思考指令】
      1. 優先：如果你下一手能達成「五連」，立刻執行贏下比賽！
      2. 防禦：對手若有活三或活四，必須立刻堵截！
      3. 戰術：佔據中心，創造雙三或雙四的進攻機會。
      
      請嚴格檢查你選擇的座標目前必須是 0。
      
      請只回傳 JSON：{"row": x, "col": y, "reason": "理由"}
    `;
    
    const result = await aiModel.generateContent(prompt);
    const text = result.response.text();
    
    // 擷取 JSON 內容
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("AI 回傳格式有誤");
    
    const moveData = JSON.parse(jsonMatch[0]);
    console.log(`✅ AI 決定下在 [${moveData.row}, ${moveData.col}]，理由: ${moveData.reason}`);
    
    res.json({ row: moveData.row, col: moveData.col });
  } catch (error) {
    console.error("❌ AI 思考出錯:", error.message);
    // 發生錯誤時的保險措施：下在正中間或第一個空位
    res.json({ row: 7, col: 7 }); 
  }
});

// --- 3. 失敗報告 API (純日誌版) ---
app.post('/api/report-defeat', (req, res) => {
  console.log("🏳️ 收到戰敗報告，AI 會在對話中持續進化。");
  res.send("AI 感到羞恥並記住了教訓");
});

// --- 啟動伺服器 ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 超強 AI 後端已啟動！監聽 Port: ${PORT}`);
});