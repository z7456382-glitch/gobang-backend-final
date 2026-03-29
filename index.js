require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const Groq = require('groq-sdk');

app.use(cors());
app.use(express.json());

// 1. 初始化 Groq (讀取新的環境變數)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 2. AI 下棋 API
app.post('/api/ai-move', async (req, res) => {
  const { board } = req.body;
  
  try {
    console.log("🚀 Groq Llama-3 正在急速思考...");

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "你是五子棋大師，執白子(2)。請分析 15x15 棋盤（0是空位，1是黑，2是白），找出最強的一手。你必須只回傳 JSON 格式：{\"row\": x, \"col\": y}"
        },
        {
          role: "user",
          content: `目前棋盤狀態：${JSON.stringify(board)}`
        }
      ],
      model: "llama3-70b-8192", // 這是目前最聰明且免費的型號
      response_format: { type: "json_object" }
    });

    // 解析 Groq 回傳的內容
    const content = completion.choices[0].message.content;
    const move = JSON.parse(content);
    
    console.log(`✅ AI 成功下棋: [${move.row}, ${move.col}]`);
    res.json({ row: move.row, col: move.col });

  } catch (error) {
    console.error("❌ Groq 思考失敗:", error.message);
    
    // 備援：如果連 Groq 都掛了，隨機找個空位下棋
    let emptyCells = [];
    for(let r=0; r<15; r++) {
      for(let c=0; c<15; c++) {
        if(board[r][c] === 0) emptyCells.push({row: r, col: c});
      }
    }
    const fallback = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    res.json(fallback || { row: 7, col: 7 });
  }
});

app.post('/api/report-defeat', (req, res) => res.send("OK"));

// 啟動監聽
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Groq AI 後端已啟動！監聽 Port: ${PORT}`));