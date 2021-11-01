const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
      origin: "https://localhost:6613",
      methods: ["GET", "POST"],
      transports: ['websocket', 'polling'],
      credentials: true
  },
  allowEIO3: true
});
const PORT = process.env.PORT || 5000;


io.on('connection', () => {
    console.log("A user has connected")
});

io.on('message', () => {
  print(message);
});

app.get('/', (req, res) => {
    res.send('Hello World!')
  })

server.listen(PORT, () => console.log(`server started on port ${PORT}`));