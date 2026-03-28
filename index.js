const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let players = {}; 
let gameStarted = false;

app.get('/', (req, res) => { res.send('Gobang Server is Running'); });

io.on('connection', (socket) => {
  const occupiedRoles = Object.values(players).map(p => p.role);
  let role = 'spectator';
  let isHost = false;
  if (!occupiedRoles.includes('B')) { role = 'B'; isHost = true; } 
  else if (!occupiedRoles.includes('W')) { role = 'W'; isHost = false; }

  players[socket.id] = { role, isHost };
  socket.emit('player-info', { role, isHost, gameStarted });

  socket.on('start-game-request', () => {
    if (players[socket.id]?.isHost) {
      gameStarted = true;
      io.emit('game-start-broadcast');
    }
  });

  socket.on('send-move', (moveData) => {
    if (gameStarted) io.emit('receive-move', moveData);
  });

  socket.on('reset-game-request', () => {
    if (players[socket.id]?.isHost) {
      gameStarted = false;
      io.emit('game-reset-broadcast');
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    if (Object.keys(players).length === 0) gameStarted = false;
  });
});

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => { console.log(`🚀 Server on port ${PORT}`); });