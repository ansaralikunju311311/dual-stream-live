const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user joins a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    // Notify others in the room
    socket.to(roomId).emit('user-connected', socket.id);
  });

  // Relay WebRTC Offer
  socket.on('offer', (data) => {
    // data should contain { target: socketId, offer: sdp, sender: socketId, roomId }
    socket.to(data.roomId).emit('offer', data);
  });

  // Relay WebRTC Answer
  socket.on('answer', (data) => {
    // data should contain { target: socketId, answer: sdp, sender: socketId, roomId }
    socket.to(data.roomId).emit('answer', data);
  });

  // Relay ICE Candidate
  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Room disconnect is handled automatically by socket.io
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
