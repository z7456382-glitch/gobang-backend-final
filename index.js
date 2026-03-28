require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

app.use(cors());
app.use(express.json());

// 1. 初始化 Gemini (建議確保 API Key 是有效的)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 2. 超強 AI 下棋邏輯
app.post('/api/ai-move', async (req, res) => {
  try {
    const { board } = req.body;
    console.log("🧠 超強 AI 正在計算最優解...");

    // 將棋盤轉換成易讀的文字格式給 AI 看
    const boardString = board.map((row, i) => 
      `Row ${i.toString().padStart(2, ' ')}: ${row.join(' ')}`
    ).join('\n');

    const prompt = `
      你是世界頂級五子棋 AI 大師。你現在執白子 (2)，對手執黑子 (1)。
      棋盤大小是 15x15，空位為 0。

      【當前棋盤狀態】
      (Row 0-14, Col 0-14)
      ${boardString}

      【你的任務】
      分析棋盤，找出最強的下一步。你的目標是贏球並絕對阻止對手贏。

      【必勝規則與優先順序】
      1. 絕殺：如果你下一手能達成「五連」，立刻執行，不要猶豫！
      2. 緊急防禦：如果對手已經有「活四」或「跳四」，你下一手必須去堵住，否則你必輸！
      3. 雙三/雙四：預判對手的意圖，不要讓對方形成「雙三」陷阱。
      4. 佈局：佔領中心區域 (Row 7, Col 7 附近)，建立連貫的棋型。
      
      【回傳格式】
      請只回傳 JSON 格式，不要有任何解釋文字：
      {"row": x, "col": y, "reason": "簡短說明理由"}
    `;
    
    const result = await aiModel.generateContent(prompt);
    const text = result.response.text();
    
    // 擷取 JSON 並回傳
    const jsonMatch = text.match(/\{.*\}/s);
    const moveData = JSON.parse(jsonMatch[0]);
    
    console.log(`✅ AI 下在 [${moveData.row}, ${moveData.col}]，理由: ${moveData.reason}`);
    
    // 只傳給前端座標
    res.json({ row: moveData.row, col: moveData.col });
  } catch (error) {
    console.error("AI 思考出錯:", error);
    // 萬一 AI 耍笨，隨機找個空位下，保證遊戲繼續
    res.json({ row: 7, col: 7 }); 
  }
});

// 3. 簡化版失敗報告（僅供日誌查看）
app.post('/api/report-defeat', (req, res) => {
  console.log("🏳️ AI 戰敗，請檢查日誌分析棋局。");
  res.send("AI 已記下教訓。");
});

app.listen(process.env.PORT || 10000, () => console.log("🚀 超強 AI 後端已就緒！"));