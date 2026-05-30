const { io } = require("socket.io-client");
const socket = io("http://127.0.0.1:5000", {
  auth: { token: "Bearer test-token" },
  reconnection: false
});

socket.on("connect", () => {
  console.log("Connected successfully with id:", socket.id);
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.log("Connection failed:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("Timeout waiting for connection");
  process.exit(1);
}, 5000);
