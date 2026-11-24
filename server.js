const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// rooms map: roomId -> { hostId: string | null, peers: Set<string> }
const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId }) => {
    if (!roomId) return;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { hostId: null, peers: new Set() });
    }

    const room = rooms.get(roomId);
    socket.join(roomId);
    room.peers.add(socket.id);

    // First participant becomes the host
    if (!room.hostId) {
      room.hostId = socket.id;
    }

    const isHost = socket.id === room.hostId;

    // Inform the newcomer of their role and the current host
    socket.emit('room-role', {
      isHost,
      hostId: room.hostId,
      peerIds: Array.from(room.peers).filter((id) => id !== socket.id),
    });

    // Notify existing participants of the new peer
    socket.to(roomId).emit('peer-joined', { peerId: socket.id });

    // WebRTC signalling handlers
    socket.on('webrtc-offer', ({ to, offer }) => {
      io.to(to).emit('webrtc-offer', { from: socket.id, offer });
    });
    socket.on('webrtc-answer', ({ to, answer }) => {
      io.to(to).emit('webrtc-answer', { from: socket.id, answer });
    });
    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      room.peers.delete(socket.id);
      socket.to(roomId).emit('peer-left', { peerId: socket.id });

      // If the host left, promote the next peer
      if (room.hostId === socket.id) {
        const nextHost = room.peers.values().next().value || null;
        room.hostId = nextHost;
        if (nextHost) {
          io.to(nextHost).emit('promoted-to-host');
          socket.to(roomId).emit('new-host', { hostId: nextHost });
        }
      }

      if (room.peers.size === 0) {
        rooms.delete(roomId);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
