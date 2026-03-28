require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 中間件設定 ---
app.use(cors());
app.use(express.json());

// 1. 初始化 Google AI (請確保 Render 環境變數 GEMINI_API_KEY 已填寫)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 2. AI 下棋 API ---
app.post('/api/ai-move', async (req, res) => {
  const { board } = req.body;
  
  try {
    console.log("🧠 Gemini AI 正在思考中...");

    // 使用最穩定的型號名稱
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      你是五子棋大師，執白子(2)，對手執黑子(1)。
      棋盤狀態如下 (15x15)：
      ${JSON.stringify(board)}
      
      請分析棋盤，給出你的下一步位置。
      規定：
      1. 必須下在為 0 的空位。
      2. 只回傳 JSON 格式：{"row": x, "col": y, "reason": "理由"}
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 擷取並解析 JSON
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("AI 回傳格式不符合 JSON");
    
    const move = JSON.parse(jsonMatch[0]);
    console.log(`✅ AI 成功下棋: [${move.row}, ${move.col}] - ${move.reason}`);
    res.json({ row: move.row, col: move.col });

  } catch (error) {
    // --- 🚨 備用接管系統：如果 Google API 壞掉，就執行這段 ---
    console.error("❌ AI 思考失敗 (原因: " + error.message + ")，啟用隨機接管模式。");
    
    let emptyCells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c] === 0) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }

    // 從所有空位中隨機選一個，確保遊戲能繼續
    const fallbackMove = emptyCells.length > 0 
      ? emptyCells[Math.floor(Math.random() * emptyCells.length)] 
      : { row: 7, col: 7 };

    console.log(`⚠️ 已自動切換至隨機座標: [${fallbackMove.row}, ${fallbackMove.col}]`);
    res.json(fallbackMove);
  }
});

// --- 3. 失敗報告 API ---
app.post('/api/report-defeat', (req, res) => {
  console.log("🏳️ 玩家回報 AI 輸了。");
  res.send("AI 已收到教訓");
});

// --- 啟動伺服器 ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 五子棋後端已啟動！`);
  console.log(`📡 監聽 Port: ${PORT}`);
});