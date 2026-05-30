/**
 * Draws a video element's current frame to a canvas, overlays a timestamp,
 * and captures the result as a MediaStream.
 * 
 * @param {HTMLVideoElement} videoElement - The source video element (hidden)
 * @returns {MediaStream} The captured media stream with timestamp overlay
 */
export function createTimestampStream(videoElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set a default resolution, could be updated based on video metadata
  canvas.width = 1280;
  canvas.height = 720;

  // We need to sync canvas resolution with video when it starts playing
  videoElement.addEventListener('loadedmetadata', () => {
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
  });

  let animationFrameId;

  const drawFrame = () => {
    if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
      // Draw the video frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Draw the timestamp
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false });
      
      // Timestamp styling
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(10, 10, 180, 50);
      
      ctx.font = '30px monospace';
      ctx.fillStyle = 'white';
      ctx.fillText(timeString, 25, 45);
    }
    animationFrameId = requestAnimationFrame(drawFrame);
  };

  // Start the drawing loop
  drawFrame();

  // Capture the stream at 30 FPS
  const stream = canvas.captureStream(30);
  
  // Add a cleanup method to the stream object for convenience
  stream.cleanup = () => {
    cancelAnimationFrame(animationFrameId);
  };

  return stream;
}
