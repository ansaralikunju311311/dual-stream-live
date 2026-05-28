# Dual-Stream Live Video Application

## Project Overview

A complete realtime media streaming application that allows a client to capture both webcam and screen share video, embed a realtime timestamp directly into the outgoing video streams using the HTML5 Canvas API, and stream both simultaneously to a host dashboard via WebRTC.

## Features

- **Dual Simultaneous Streams:** Captures webcam and screen share concurrently.
- **Embedded Timestamp Overlay:** The timestamp (HH:MM:SS) is embedded directly into the transmitted video frames on the client side, ensuring it is permanently stamped on the video.
- **Host Dashboard:** Automatically receives and dynamically routes incoming WebRTC tracks to separate video elements.
- **Realtime Streaming (WebRTC):** Uses RTCPeerConnection for low latency peer-to-peer media streaming.
- **Custom Signaling (Socket.IO):** Lightweight signaling server just for coordinating WebRTC connection setup.
- **Modern UI:** Built with React and TailwindCSS for a responsive and visually appealing interface.

## Tech Stack

- **Frontend:** React, Vite, TailwindCSS, Lucide-React
- **Backend:** Node.js, Express.js, Socket.IO
- **Core Technology:** WebRTC, HTML5 Canvas API, MediaDevices API

## Installation Steps

1. Clone or navigate to the project root directory.

### Running the Backend (Signaling Server)

Open a terminal and run the following commands:
```bash
cd server
npm install
node server.js
```

### Running the Frontend (Client App)

Open a new terminal window and run:
```bash
cd client
npm install
npm run dev
```

### Usage

1. Start both servers.
2. Navigate to `http://localhost:5173/host` in your browser.
3. Open a new tab or window and navigate to `http://localhost:5173/client`.
4. Click **Start Streaming** on the Client page.
5. Grant the necessary permissions for the camera and screen sharing.
6. Check the Host Dashboard to see both realtime streams with the embedded timestamp overlay!
# dual-stream-live
