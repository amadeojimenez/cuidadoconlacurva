const http = require("http");
const express = require("express");
const socketio = require("socket.io");

const app = express();

app.use(express.static(`${__dirname}`));

const server = http.createServer(app);
const io = socketio(server);

io.on("connection", (sock) => {
  sock.on("message", (text) => console.log("ASDASDASDASDASDASD", text));
  //   const color = randomColor();
  //   const cooldown = createCooldown(2000);

  //   sock.emit('board', getBoard());
  //   sock.on("message", (text) => io.emit("message", text));
  //   sock.on('turn', ({ x, y }) => {
  //     if (cooldown()) {
  //       const playerWon = makeTurn(x, y, color);
  //       io.emit('turn', { x, y, color });

  //       if (playerWon) {
  //         sock.emit('message', 'You Won!');
  //         io.emit('message', 'New Round');
  //         clear();
  //         io.emit('board');
  //       }
  //     }
  //   });
});

server.on("error", (err) => {
  console.error(err);
});

server.listen(8080, () => {
  console.log("Server is ready");
});
