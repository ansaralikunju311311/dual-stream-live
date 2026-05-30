export const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

/**
 * Helper to create a unified PeerConnection for sending multiple streams.
 */
export const createPeerConnection = (onTrack, onIceCandidate) => {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  if (onTrack) {
    pc.ontrack = (event) => {
      onTrack(event);
    };
  }

  return pc;
};
