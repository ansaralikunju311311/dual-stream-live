# Methodology

This document outlines the architectural decisions, challenges, and implementation strategies used to build the Dual-Stream Live Video Application.

## 1. Architecture Decisions
The architecture is split into three main parts:
- **Client Producer:** A React application responsible for capturing raw media, manipulating it via the Canvas API to embed the timestamp, and sending it over WebRTC.
- **Signaling Server:** A minimal Node.js/Express application using Socket.IO purely for orchestrating the connection between peers.
- **Host Consumer:** A React view acting as a passive receiver that displays the incoming tracks.

## 2. Why WebRTC was Chosen
WebRTC is the industry standard for realtime, peer-to-peer media streaming. 
Unlike WebSockets or chunk uploading (which are built over TCP and suffer from head-of-line blocking and higher latency), WebRTC uses RTP/UDP for media transport. This guarantees the lowest possible latency which is crucial for a "live dashboard" experience.

## 3. Why Socket.IO was Used
WebRTC requires a mechanism to exchange connection data (SDP offers/answers and ICE candidates) before a direct peer-to-peer connection can be established. This process is called signaling. 
Socket.IO was chosen for the signaling layer because it is robust, handles reconnects gracefully, and its event-driven nature (`socket.emit` and `socket.on`) perfectly matches the asynchronous message exchange required by WebRTC.

## 4. Timestamp Overlay Implementation
A core requirement was that the timestamp must be embedded *inside* the outgoing video stream, rather than simply overlaid using CSS on the receiving end.
- **Canvas API:** We solved this by playing the raw media streams into hidden `<video>` elements. We then draw the current frame of those videos onto a hidden `<canvas>` using `requestAnimationFrame`.
- **Overlay:** Immediately after drawing the frame, we use the canvas 2D context (`ctx.fillText`) to draw the current timestamp (HH:MM:SS) directly over the video frame.
- **Capture:** Finally, we use `canvas.captureStream(30)` to generate a new `MediaStream` running at 30 FPS. This resulting stream is what gets added to the `RTCPeerConnection` and transmitted.

## 5. Challenges Faced
- **Track Identification:** WebRTC multiplexes tracks over a single connection. The host dashboard receives `ontrack` events, but needs to know which track belongs to the webcam and which belongs to the screen share.
- **Canvas Syncing:** Ensuring the canvas dimensions dynamically match the incoming raw video dimensions so the aspect ratio isn't distorted.

## 6. Solutions Implemented
- **Out-of-band Metadata:** To solve track identification, we emit a custom `track-metadata` Socket.IO event just before creating the WebRTC offer. This message maps the native `stream.id` of the outgoing canvas streams to their respective source types (webcam vs screen). The host stores this mapping and uses it to route incoming tracks to the correct UI video elements.
- **Unified Peer Connection:** Both the webcam stream and screen stream are added to a single `RTCPeerConnection` using `addTransceiver`. This reduces the overhead and signaling complexity compared to managing two separate peer connections.

## 7. Performance Optimizations
- **RequestAnimationFrame:** The canvas drawing loop uses `requestAnimationFrame` instead of `setInterval`, ensuring we only draw frames when the browser is ready to paint, saving CPU cycles.
- **Single Connection:** Transmitting two streams over a single WebRTC connection saves network ports and reduces ICE candidate gathering time.

## 8. Future Improvements
- **TURN Servers:** For production deployment, a TURN server (like Coturn) should be added to the ICE servers list to guarantee connectivity for users behind strict symmetric NATs or corporate firewalls.
- **Adaptive Bitrate:** Implementing WebRTC simulcast or dynamically adjusting the canvas capture frame rate based on network conditions.
- **Authentication:** Implementing room passwords and secure host pairing via the signaling server.
