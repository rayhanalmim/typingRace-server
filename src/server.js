const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5176",
      "https://typing-race-sage.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
});

app.use(cors());

let countdownStarted = false; 
let participants = [];
let readyToStart = [];
let progressMap = {};
let currentSentence = "";
let winnerDeclared = false;
let readyStatusMap = {};

const sentences = [
  "The quick brown fox jumps over the lazy dog.",
  "Socket.IO makes real-time apps possible.",
  "Typing fast takes practice and patience.",
  "JavaScript is the language of the web.",
];

const getRandomSentence = () => {
  return sentences[Math.floor(Math.random() * sentences.length)];
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (name) => {
    socket.data.name = name;
    if (!participants.includes(name)) {
      participants.push(name);
      progressMap[name] = 0;
      readyStatusMap[name] = false;
      io.emit("user-joined", participants);
      io.emit("ready-status", readyStatusMap);
    }
  });

  socket.on("request-start", (name) => {
    if (!readyToStart.includes(name)) {
      readyToStart.push(name);
      readyStatusMap[name] = true;
    }
    io.emit("ready-status", readyStatusMap);

    if (readyToStart.length === participants.length && !countdownStarted) {
      countdownStarted = true;
      io.emit("start-countdown");
    }
  });

  socket.on("cancel-start", (name) => {
    if (countdownStarted) {
      countdownStarted = false; // Stop the countdown
      io.emit("start-countdown-cancelled"); // Notify clients to reset countdown
      io.emit("ready-status", readyStatusMap);
    }
    readyToStart = readyToStart.filter((n) => n !== name);
    readyStatusMap[name] = false;
    io.emit("ready-status", readyStatusMap);
  });

  socket.on("start-race", () => {
    currentSentence = getRandomSentence();
    winnerDeclared = false;
    Object.keys(progressMap).forEach((name) => {
      progressMap[name] = 0;
    });
    readyToStart = [];
    Object.keys(readyStatusMap).forEach((name) => (readyStatusMap[name] = false));
    countdownStarted = false;
    io.emit("ready-status", readyStatusMap);
    io.emit("start-typing", currentSentence);
  });

  socket.on("typing-progress", ({ name, typed }) => {
    if (!winnerDeclared) {
      progressMap[name] = typed.length;
      io.emit("update-progress", progressMap);

      console.log("",typed);

      if (typed === currentSentence) {
        winnerDeclared = true;
        io.emit("race-complete", name);
      }
    }
  });

  socket.on("disconnect", () => {
    const name = socket.data.name;
    participants = participants.filter((p) => p !== name);
    readyToStart = readyToStart.filter((n) => n !== name);
    delete progressMap[name];
    delete readyStatusMap[name];
    io.emit("user-joined", participants);
    io.emit("ready-status", readyStatusMap);
  });
});


app.get("/", (req, res) => {
  res.send("Serverless Express is running on Vercel!");
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
