export function createTimestampStream(videoElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 1280;
  canvas.height = 720;

  videoElement.addEventListener('loadedmetadata', () => {
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
  });

  let animationFrameId;

  const drawFrame = () => {
    if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false });
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(10, 10, 180, 50);
      
      ctx.font = '30px monospace';
      ctx.fillStyle = 'white';
      ctx.fillText(timeString, 25, 45);
    }
    animationFrameId = requestAnimationFrame(drawFrame);
  };

  drawFrame();

  const stream = canvas.captureStream(30);
  
  stream.cleanup = () => {
    cancelAnimationFrame(animationFrameId);
  };

  return stream;
}
