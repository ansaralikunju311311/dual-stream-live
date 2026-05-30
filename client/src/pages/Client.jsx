import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Camera, MonitorUp, StopCircle, RadioTower } from 'lucide-react';
import { createTimestampStream } from '../utils/canvas';
import { createPeerConnection } from '../utils/webrtc';

const ROOM_ID = 'live-video-room'; // Global room for MVP
const SIGNALING_SERVER = 'http://localhost:3000';

export default function Client() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  
  // Hidden video elements to play the raw media
  const rawWebcamRef = useRef(null);
  const rawScreenRef = useRef(null);

  // Visible video elements to preview the canvas stream
  const previewWebcamRef = useRef(null);
  const previewScreenRef = useRef(null);

  // Track raw streams for cleanup
  const localWebcamStreamRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  
  // Track canvas streams for cleanup
  const canvasWebcamStreamRef = useRef(null);
  const canvasScreenStreamRef = useRef(null);

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  const startStreaming = async () => {
    try {
      setStatus('Requesting permissions...');
      
      // 1. Get raw media
      const webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      
      localWebcamStreamRef.current = webcamStream;
      localScreenStreamRef.current = screenStream;

      // Play raw media in hidden elements so they can be drawn to canvas
      if (rawWebcamRef.current) rawWebcamRef.current.srcObject = webcamStream;
      if (rawScreenRef.current) rawScreenRef.current.srcObject = screenStream;

      // 2. Setup Socket.IO Signaling
      setStatus('Connecting to signaling server...');
      socketRef.current = io(SIGNALING_SERVER);

      socketRef.current.on('connect', () => {
        setStatus('Connected. Setting up WebRTC...');
        socketRef.current.emit('join-room', ROOM_ID);
        setupWebRTC();
      });

      socketRef.current.on('answer', async (data) => {
        if (pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            setStatus('Streaming to Host');
            setIsStreaming(true);
          } catch (e) {
            console.error('Error setting remote description', e);
          }
        }
      });

      socketRef.current.on('ice-candidate', async (data) => {
        if (pcRef.current && data.candidate) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding ICE candidate', e);
          }
        }
      });

    } catch (err) {
      console.error('Error starting streams:', err);
      setStatus('Error accessing media devices.');
    }
  };

  const setupWebRTC = async () => {
    // 3. Apply Timestamp via Canvas and get new streams
    const outWebcamStream = createTimestampStream(rawWebcamRef.current);
    const outScreenStream = createTimestampStream(rawScreenRef.current);

    canvasWebcamStreamRef.current = outWebcamStream;
    canvasScreenStreamRef.current = outScreenStream;

    // Show previews locally
    if (previewWebcamRef.current) previewWebcamRef.current.srcObject = outWebcamStream;
    if (previewScreenRef.current) previewScreenRef.current.srcObject = outScreenStream;

    // 4. Create Peer Connection
    pcRef.current = createPeerConnection(null, (candidate) => {
      socketRef.current.emit('ice-candidate', {
        roomId: ROOM_ID,
        candidate,
        sender: socketRef.current.id
      });
    });

    // 5. Add tracks to PeerConnection
    // WebRTC uses transceivers. We add tracks and optionally give them a stream ID 
    // to group them, but the host will receive them via ontrack event.
    
    // Adding webcam tracks
    outWebcamStream.getTracks().forEach(track => {
      pcRef.current.addTransceiver(track, { streams: [outWebcamStream] });
    });
    
    // Including the original audio track from the raw webcam stream so audio is sent
    localWebcamStreamRef.current.getAudioTracks().forEach(track => {
      pcRef.current.addTransceiver(track, { streams: [outWebcamStream] });
    });

    // Adding screen tracks
    outScreenStream.getTracks().forEach(track => {
      pcRef.current.addTransceiver(track, { streams: [outScreenStream] });
    });

    // We can also signal the track metadata to the host via a custom socket message so the host knows which track is which.
    socketRef.current.emit('track-metadata', {
      roomId: ROOM_ID,
      webcamStreamId: outWebcamStream.id,
      screenStreamId: outScreenStream.id
    });

    // 6. Create and send offer
    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      
      socketRef.current.emit('offer', {
        roomId: ROOM_ID,
        offer: pcRef.current.localDescription,
        sender: socketRef.current.id,
        webcamStreamId: outWebcamStream.id,
        screenStreamId: outScreenStream.id
      });
      
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
    }
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    setStatus('Disconnected');

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Stop raw streams
    [localWebcamStreamRef, localScreenStreamRef].forEach(ref => {
      if (ref.current) {
        ref.current.getTracks().forEach(track => track.stop());
        ref.current = null;
      }
    });

    // Stop canvas streams
    [canvasWebcamStreamRef, canvasScreenStreamRef].forEach(ref => {
      if (ref.current) {
        if (ref.current.cleanup) ref.current.cleanup();
        ref.current.getTracks().forEach(track => track.stop());
        ref.current = null;
      }
    });

    if (previewWebcamRef.current) previewWebcamRef.current.srcObject = null;
    if (previewScreenRef.current) previewScreenRef.current.srcObject = null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
              <Camera className="w-8 h-8 text-blue-400" />
              Stream Client
            </h1>
            <p className="text-slate-400 mt-1">Capture and broadcast with live timestamping</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
              <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-sm font-medium text-slate-300">{status}</span>
            </div>
            
            {!isStreaming ? (
              <button 
                onClick={startStreaming}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 transition-colors rounded-full font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              >
                <RadioTower className="w-5 h-5" />
                Start Streaming
              </button>
            ) : (
              <button 
                onClick={stopStreaming}
                className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 transition-colors rounded-full font-semibold text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]"
              >
                <StopCircle className="w-5 h-5" />
                Stop Streaming
              </button>
            )}
          </div>
        </header>

        {/* Hidden video elements for raw capture */}
        <video ref={rawWebcamRef} autoPlay playsInline muted className="hidden" />
        <video ref={rawScreenRef} autoPlay playsInline muted className="hidden" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-slate-200">Webcam Preview</h2>
            </div>
            <div className="aspect-video bg-black relative">
              <video 
                ref={previewWebcamRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-contain"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <p>Webcam off</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <MonitorUp className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-slate-200">Screen Share Preview</h2>
            </div>
            <div className="aspect-video bg-black relative">
              <video 
                ref={previewScreenRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-contain"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <p>Screen share off</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
