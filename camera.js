async function bindPage() {
  // We create an object with the parameters that we want for the model. 
  const poseNetState = {
    algorithm: 'single-pose',
    input: {
      architecture: 'MobileNetV1',
      outputStride: 16,
      inputResolution: 513,
      multiplier: 0.75,
      quantBytes: 2
    },
    singlePoseDetection: {
      minPoseConfidence: 0.1,
      minPartConfidence: 0.5
    },
    output: {
      showVideo: true,
      showPoints: true
    }
  }

  // Wair for the posenet model to load
  const poseNetModel = await posenet.load({
    architecture: poseNetState.input.architecture,
    outputStride: poseNetState.input.outputStride,
    inputResolution: poseNetState.input.inputResolution,
    multiplier: poseNetState.input.multiplier,
    quantBytes: poseNetState.input.quantBytes
  })

  // Initiate the video stream

  let video
  const videoWidth = 1728
  const videoHeight = 1026

  try {
    video = await setupCamera()
    video.play()
  } catch (e) {
    throw e
  }

  async function setupCamera() {
    const video = document.getElementById('video')
    video.width = videoWidth
    video.height = videoHeight

    const stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        width: videoWidth,
        height: videoHeight
      }
    })
    video.srcObject = stream

    return new Promise((resolve) => {
      video.onloadedmetadata = () => resolve(video)
    })
  }

  // functions to draw the hammer over the hand on the canvas. 

  function drawPoint(ctx, y, x, r, image) {
    ctx.beginPath()
    ctx.drawImage(image, x, y, 150, 150)
  }

  function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
    const rightWrist = keypoints.find(point => point.part === 'rightWrist')
    const imageRight = document.querySelector('#right')

    if (rightWrist.score > minConfidence) {
      const { y, x } = rightWrist.position
      drawPoint(ctx, y * scale, x * scale, 10, imageRight)
    }
  }

  // draw a mole
  function drawOneMole(ctx, x, y, scale) {
    // const rightWrist = keypoints.find(point => point.part === 'rightWrist')
    const imageMole = document.querySelector('#mole')
    drawPoint(ctx, y * scale, x * scale, 10, imageMole)
  }

  let hole = null
  let hide = true

  // choose a random hole every 2 seconds for the mole to pop up from
  setInterval(() => {
    if (hide) {
      hole = Math.floor(Math.random() * Math.floor(7))
    } else {
      hole = 7
    }
    hide = !hide
  }, 1000) 

  // Once the video stream is ready, we start detecting poses:

  function detectPoseInRealTime(video) {
    const canvas = document.getElementById('output')
    const ctx = canvas.getContext('2d')
    const flipPoseHorizontal = true

    canvas.width = videoWidth
    canvas.height = videoHeight

    async function poseDetectionFrame() {
      let poses = []
      let minPoseConfidence
      let minPartConfidence

      switch (poseNetState.algorithm) {
        case 'single-pose':
          const pose = await poseNetModel.estimatePoses(video, {
            flipHorizontal: flipPoseHorizontal,
            decodingMethod: 'single-person'
          })
          poses = poses.concat(pose)
          minPoseConfidence = +poseNetState.singlePoseDetection.minPoseConfidence
          minPartConfidence = +poseNetState.singlePoseDetection.minPartConfidence
          break
      }

      ctx.clearRect(0, 0, videoWidth, videoHeight)

      if (poseNetState.output.showVideo) {
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-videoWidth, 0)
        ctx.restore()
      }

      // calling the drawKeyPoints function for each pose
      const moleCoordinates = [
        { 
          x: 645,
          y: 460
        },
        {
          x: 290,
          y: 460
        },
        {
          x: 1000,
          y: 460
        }, 
        {
          x: 1180,
          y: 560
        },
        {
          x: 825,
          y: 560
        },
        {
          x: 470,
          y: 560
        },
        {
          x: 115,
          y: 560
        },
        {
          x: -500,
          y: -500
        }
      ]

      

      poses.forEach(({ score, keypoints }) => {
        if (score >= minPoseConfidence) {
          if (poseNetState.output.showPoints) {
            const { x, y } = moleCoordinates[hole]
            drawOneMole(ctx, x, y, 1)
            drawKeypoints(keypoints, minPartConfidence, ctx)
            
          }
        }
      })
      requestAnimationFrame(poseDetectionFrame)
      
    }
    
    poseDetectionFrame()
  }
  
  detectPoseInRealTime(video)
}

bindPage()
