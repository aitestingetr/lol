class TimeWarp {
  constructor({ lineWidth, lineColour, speed, videoCanvas, videoCtx, video, imageCanvas, imageCtx }) {
    if (videoCanvas.tagName !== "CANVAS" || imageCanvas.tagName !== "CANVAS") {
      throw new Error("VideoCanvas and ImageCanvas must be a canvas component")
    }

    this.videoCanvas = videoCanvas
    this.videoCtx = videoCtx
    this.video = video
    this.imageCanvas = imageCanvas
    this.imageCtx = imageCtx
    this.lineWidth = lineWidth 
    this.lineColour = lineColour
    this.speed = speed 
    
    // NEW: Scan Direction (vertical or horizontal)
    this.direction = "vertical" 
    
    this.linePos = 0 
    this.imageChunks = [] 
    this.animationId = null 

    this.animate = this.animate.bind(this)
  }

  animate() {
    this.videoCtx.save() 
    this.videoCtx.scale(-1, 1) 
    this.videoCtx.drawImage(this.video, -this.videoCanvas.width, 0, this.videoCanvas.width, this.videoCanvas.height) 
    this.videoCtx.setTransform(1, 0, 0, 1, 0, 0)

    // Draw stored chunks
    this.imageChunks.forEach((chunk) => {
      this.imageCtx.putImageData(chunk.imgData, chunk.x, chunk.y)
    })

    // Draws the Scanner Line based on direction
    this.videoCtx.beginPath()
    this.videoCtx.lineWidth = this.lineWidth
    this.videoCtx.strokeStyle = this.lineColour
    
    if (this.direction === "vertical") {
      this.videoCtx.moveTo(0, this.linePos)
      this.videoCtx.lineTo(this.videoCanvas.width, this.linePos)
    } else {
      this.videoCtx.moveTo(this.linePos, 0)
      this.videoCtx.lineTo(this.linePos, this.videoCanvas.height)
    }
    this.videoCtx.stroke()

    // Logic for capturing pixel slices
    const stepSize = this.speed
    if (this.direction === "vertical") {
      if (this.linePos < this.videoCanvas.height) {
        const imgData = this.videoCtx.getImageData(0, this.linePos, this.videoCanvas.width, stepSize)
        this.imageChunks.push({ imgData, x: 0, y: this.linePos })
      }
    } else {
      if (this.linePos < this.videoCanvas.width) {
        const imgData = this.videoCtx.getImageData(this.linePos, 0, stepSize, this.videoCanvas.height)
        this.imageChunks.push({ imgData, x: this.linePos, y: 0 })
      }
    }

    // Move the line
    this.linePos += this.speed

    // Check if animation is finished
    const limit = this.direction === "vertical" ? this.videoCanvas.height : this.videoCanvas.width
    if (this.linePos >= limit) {
        cancelAnimationFrame(this.animationId)
    } else {
        this.animationId = requestAnimationFrame(this.animate)
    }
  }

  // Helper to change direction from the UI
  setDirection(dir) {
    this.direction = dir
    this.reset()
  }

  reset() {
    cancelAnimationFrame(this.animationId)
    this.videoCtx.clearRect(0, 0, this.videoCanvas.width, this.videoCanvas.height)
    this.imageCtx.clearRect(0, 0, this.videoCanvas.width, this.videoCanvas.height)
    this.linePos = 0
    this.imageChunks = []
    setTimeout(() => {
      this.animate()
    }, 500)
  }

  download() {
    const a = document.createElement("a")
    a.download = "Timewarp_G_GUI.png"
    a.href = this.imageCanvas.toDataURL("image/png")
    a.click()
  }
}
