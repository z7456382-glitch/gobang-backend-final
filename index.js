require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const Groq = require('groq-sdk');

// --- 中間件設定 ---
app.use(cors());
app.use(express.json());

// --- 1. 初始化 Groq AI ---
// 請確保你在 Render 的 Environment Variables 中設定了 GROQ_API_KEY
const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY 
});

// --- 2. AI 下棋 API (Groq Llama-3 版) ---
app.post('/api/ai-move', async (req, res) => {
  const { board } = req.body;
  
  try {
    console.log("🚀 Groq Llama-3 正在急速思考...");

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "你是五子棋特級大師，執白子(2)。請分析 15x15 棋盤（0是空位，1是黑子，2是白子）。找出最強的下一步以贏得比賽或擋住對手。你必須『只回傳』JSON 格式，不要有任何廢話：{\"row\": x, \"col\": y}"
        },
        {
          role: "user",
          content: `當前棋盤狀態：${JSON.stringify(board)}`
        }
      ],
      model: "llama3-70b-8192", 
      temperature: 0.5,
      response_format: { type: "json_object" } 
    });

    // 解析 AI 回傳的座標
    const content = completion.choices[0].message.content;
    const move = JSON.parse(content);
    
    console.log(`✅ AI 思考成功，落子座標: [${move.row}, ${move.col}]`);
    res.json({ row: move.row, col: move.col });

  } catch (error) {
    // --- 🚨 核心備援邏輯：若 API 出錯，自動執行隨機下棋 ---
    console.error("❌ Groq 引擎報錯:", error.message);
    
    let emptyCells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c] === 0) emptyCells.push({ row: r, col: c });
      }
    }

    const fallbackMove = emptyCells.length > 0 
      ? emptyCells[Math.floor(Math.random() * emptyCells.length)] 
      : { row: 7, col: 7 };

    console.log(`⚠️ 已執行備援座標: [${fallbackMove.row}, ${fallbackMove.col}]`);
    res.json(fallbackMove);
  }
});

// --- 3. 戰敗報告 API ---
app.post('/api/report-defeat', (req, res) => {
  console.log("🏳️ AI 承認失敗。");
  res.send("OK");
});

// --- 啟動伺服器 ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Groq 飛速版後端已啟動！`);
  console.log(`📡 正在監聽 Port: ${PORT}`);
});