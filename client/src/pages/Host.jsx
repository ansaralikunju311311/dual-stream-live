import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { MonitorUp, Camera, LayoutDashboard, Radio } from 'lucide-react';
import { createPeerConnection } from '../utils/webrtc';

const ROOM_ID = 'live-video-room';
const SIGNALING_SERVER = 'http://localhost:3000';

export default function Host() {
  const [status, setStatus] = useState('Waiting for streams...');
  
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  
  const webcamVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  
  // To keep track of mapping from streamId to type
  const trackMetadataRef = useRef({ webcam: null, screen: null });

  useEffect(() => {
    connectToSignaling();
    return () => {
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const connectToSignaling = () => {
    setStatus('Connecting to signaling server...');
    socketRef.current = io(SIGNALING_SERVER);

    socketRef.current.on('connect', () => {
      setStatus('Connected. Waiting for host connection...');
      socketRef.current.emit('join-room', ROOM_ID);
    });

    socketRef.current.on('track-metadata', (data) => {
      console.log('Received track metadata:', data);
      trackMetadataRef.current = {
        webcam: data.webcamStreamId,
        screen: data.screenStreamId
      };
    });

    socketRef.current.on('offer', async (data) => {
      setStatus('Receiving streams...');
      console.log('Received offer');
      
      // Update metadata if sent with offer
      if (data.webcamStreamId) {
        trackMetadataRef.current.webcam = data.webcamStreamId;
        trackMetadataRef.current.screen = data.screenStreamId;
      }
      
      if (!pcRef.current) {
        pcRef.current = createPeerConnection((event) => {
          console.log('Track received:', event.track.kind, event.streams[0]?.id);
          
          const stream = event.streams[0];
          
          // Identify which video element to use
          if (stream) {
            if (stream.id === trackMetadataRef.current.webcam) {
              if (webcamVideoRef.current && webcamVideoRef.current.srcObject !== stream) {
                webcamVideoRef.current.srcObject = stream;
              }
            } else if (stream.id === trackMetadataRef.current.screen) {
              if (screenVideoRef.current && screenVideoRef.current.srcObject !== stream) {
                screenVideoRef.current.srcObject = stream;
              }
            } else {
              // Fallback if metadata is missing or mismatched (e.g. just assigning first to webcam, second to screen)
              if (!webcamVideoRef.current.srcObject) {
                 webcamVideoRef.current.srcObject = stream;
              } else if (!screenVideoRef.current.srcObject && webcamVideoRef.current.srcObject.id !== stream.id) {
                 screenVideoRef.current.srcObject = stream;
              }
            }
          }
        }, (candidate) => {
          socketRef.current.emit('ice-candidate', {
            roomId: ROOM_ID,
            candidate,
            sender: socketRef.current.id
          });
        });
      }

      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        
        socketRef.current.emit('answer', {
          roomId: ROOM_ID,
          answer: pcRef.current.localDescription,
          sender: socketRef.current.id
        });
        
        setStatus('Streams connected (Realtime)');
      } catch (e) {
        console.error('Error handling offer', e);
        setStatus('Error connecting streams');
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
    
    socketRef.current.on('user-connected', (id) => {
        console.log('Another user joined:', id);
        // We could reset state if a new client connects
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-emerald-400" />
              Host Dashboard
            </h1>
            <p className="text-slate-400 mt-1">Realtime Dual-Stream Viewer</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
            <Radio className={`w-4 h-4 ${status.includes('connected') || status.includes('Streaming') ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-sm font-medium text-slate-300">{status}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Camera className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-200">Webcam Feed</h2>
                <p className="text-sm text-slate-400">Live with embedded timestamp</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl aspect-video relative">
              <video 
                ref={webcamVideoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-2xl"></div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <MonitorUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-200">Screen Share Feed</h2>
                <p className="text-sm text-slate-400">Live with embedded timestamp</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl aspect-video relative">
              <video 
                ref={screenVideoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-2xl"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
