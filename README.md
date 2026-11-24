# Audio Selective Call

This repository demonstrates a simple **audio‑only** conference where **only the first participant (the host) is heard by everyone**, and all other participants only hear the host. The implementation uses:

- **Node.js + Express** to serve static files.
- **Socket.io** as the signalling server for WebRTC.
- **WebRTC (peer‑to‑peer)** for audio streams.

## Project structure
```
audio-room/
├─ server.js               # signalling server
├─ package.json           # npm metadata
└─ public/
   └─ index.html          # client UI & WebRTC logic
```

## How it works
1. When a user opens the page with a `?room=XYZ` query (or the page generates a random room ID), they join a Socket.io room.
2. The **first** socket that joins becomes the **host** (`room.hostId`).
3. Every subsequent peer establishes a **single** WebRTC connection **only to the host**. The host creates a connection with each peer, but peers do **not** connect to each other.
4. In `attachAudioStream` we only attach remote streams if:
   - we are the host (we hear everyone), **or**
   - the remote stream originates from the current host (`peerId === myRole.hostId`).
5. When the host disconnects, the server promotes the next peer in the set to the new host and notifies everyone.

## Running locally
```bash
# 1. Create a folder (or use the existing one)
mkdir audio-room && cd audio-room
# 2. Initialise npm (the files below already contain the needed dependencies)
npm init -y
npm install express socket.io
# 3. Copy the provided files (server.js, public/index.html, README.md) into the folder.
# 4. Start the server
node server.js
```
Open `http://localhost:3000` in two or more browsers/tabs. The first one becomes the host.

## Production considerations
- **HTTPS**: browsers block `getUserMedia` on insecure origins. Deploy behind TLS (e.g., use nginx with a certificate or a platform that provides HTTPS).
- **TURN server**: a public STUN server works for most LAN/NAT tests, but for restrictive corporate or mobile networks you’ll need a TURN server and add it to `rtcConfig.iceServers`.
- **SFU alternative**: If you need stronger security (prevent a malicious client from modifying the client‑side filter), replace the peer‑to‑peer mesh with an SFU such as *mediasoup* or *LiveKit* that forwards only the allowed audio streams.

## Next steps you may want
- Persist the room ID in the URL (share button already copies the link).
- Add a UI button to mute/unmute your microphone.
- Show the number of participants.
- Record the audio on the server (requires a media server).

Feel free to modify the code to suit your needs. If you have any questions or want additional features, let me know!