require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const Groq = require('groq-sdk');

app.use(cors());
app.use(express.json());

// 這裡加上一個防錯檢測
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
    console.error("🚨 錯誤：Render 環境變數中找不到 GROQ_API_KEY！");
}

const groq = new Groq({ apiKey: apiKey });

app.post('/api/ai-move', async (req, res) => {
    const { board } = req.body;
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "你是五子棋大師，執白子(2)。只回傳 JSON：{\"row\": x, \"col\": y}" },
                { role: "user", content: JSON.stringify(board) }
            ],
            model: "llama3-70b-8192",
            response_format: { type: "json_object" }
        });
        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error("❌ Groq 報錯:", error.message);
        // 隨機下棋備援
        let empty = [];
        for(let r=0; r<15; r++) for(let c=0; c<15; c++) if(board[r][c]===0) empty.push({row:r, col:c});
        res.json(empty[Math.floor(Math.random() * empty.length)] || {row:7, col:7});
    }
});

app.listen(process.env.PORT || 10000, () => {
    console.log("🚀 Groq 後端已就緒，API Key 狀態:", apiKey ? "✅ 已讀取" : "❌ 未讀取");
});