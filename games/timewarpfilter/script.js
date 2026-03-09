// Constants for the effect
const CONFIG = {
  lineWidth: 2,
  lineColour: "#00d4ff",
  speed: 2
};

let timeWarpEffect;
const canvas = document.getElementById("canvas");
const imageCanvas = document.getElementById("imageCanvas");
const video = document.createElement("video");
const deviceSelect = document.getElementById("deviceList");
const directionBtn = document.getElementById("direction-button");

// 1. Initialize the Effect
const ctx = canvas.getContext("2d");
const imgCtx = imageCanvas.getContext("2d");

// 2. Setup Camera via devices.js
const camera = new Devices({
  selectEl: deviceSelect,
  constraints: { video: { width: 1280, height: 720 } },
  getUserMediaSuccess: (stream) => {
    video.srcObject = stream;
    video.play();
    
    video.onloadedmetadata = () => {
      // Match canvas sizes to video
      canvas.width = imageCanvas.width = video.videoWidth;
      canvas.height = imageCanvas.height = video.videoHeight;
      
      // Start the effect
      if (!timeWarpEffect) {
        timeWarpEffect = new TimeWarp({
          ...CONFIG,
          videoCanvas: canvas,
          videoCtx: ctx,
          video: video,
          imageCanvas: imageCanvas,
          imageCtx: imgCtx
        });
        timeWarpEffect.animate();
      } else {
        timeWarpEffect.reset();
      }
      
      // Remove the "blocked" overlay
      document.querySelector(".canvas-area").classList.remove("blocked");
    };
  },
  getUserMediaError: (err) => console.error("Camera Error:", err)
});

// 3. UI Controls
directionBtn.addEventListener("click", () => {
  if (timeWarpEffect.direction === "vertical") {
    timeWarpEffect.setDirection("horizontal");
    directionBtn.innerText = "Scan: Horizontal";
  } else {
    timeWarpEffect.setDirection("vertical");
    directionBtn.innerText = "Scan: Vertical";
  }
});

document.getElementById("reset-button").addEventListener("click", () => {
  timeWarpEffect.reset();
});

document.getElementById("download-button").addEventListener("click", () => {
  timeWarpEffect.download();
});

// Keyboard Shortcut [D] for Direction
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "d") {
    directionBtn.click();
  }
});
