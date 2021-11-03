const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"],
      transports: ['websocket', 'polling'],
      credentials: true
  },
  allowEIO3: true
});
const PORT = process.env.PORT || 5000;


io.on('connection', (socket) => {
    console.log("A user has connected");

    //when server recieves a message
    socket.on('message', (data) => {
      socket.emit('message', data);
    
    });


    socket.on("connect_error", (err) => {
      console.log(`connect_error due to ${err.message}`);
    });


});



app.get('/', (req, res) => {
    res.send('Hello World!')
  })

server.listen(PORT, () => console.log(`server started on port ${PORT}`));