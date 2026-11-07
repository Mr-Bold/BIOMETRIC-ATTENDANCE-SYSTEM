
import { useEffect, useRef, useState } from 'react'
import * as faceapi from '@vladmandic/face-api'

function Camera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelError, setModelError] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [savedDescriptor, setSavedDescriptor] = useState(null)
  const [result, setResult] = useState('')
  const [distance, setDistance] = useState(null)

  useEffect(() => {
    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        setModelsLoaded(true)
      } catch (error) {
        console.error('Model loading error:', error)
        setModelError(true)
        setResult('Could not load face models.')
      }
    }

    loadModels()
  }, [])

  useEffect(() => {
    if (!cameraActive || !modelsLoaded) return

    let cancelled = false
    let timer
    const video = videoRef.current
    const canvas = canvasRef.current

    async function detectFaces() {
      if (cancelled || !video || !canvas) return

      if (video.readyState < 2 || !video.videoWidth) {
        timer = setTimeout(detectFaces, 150)
        return
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const context = canvas.getContext('2d')
      context.clearRect(0, 0, canvas.width, canvas.height)

      try {
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          }),
        )

        if (cancelled) return

        context.clearRect(0, 0, canvas.width, canvas.height)
        context.strokeStyle = '#22e887'
        context.lineWidth = Math.max(3, canvas.width / 240)
        context.shadowColor = 'rgb(34 232 135 / 70%)'
        context.shadowBlur = 10

        detections.forEach(({ box }) => {
          context.strokeRect(box.x, box.y, box.width, box.height)
        })

        context.shadowBlur = 0
        setFaceDetected(detections.length > 0)
      } catch (error) {
        if (!cancelled) {
          console.error('Live face detection error:', error)
          setFaceDetected(false)
          setResult('Live face detection failed. Restart the camera to try again.')
        }
        return
      }

      timer = setTimeout(detectFaces, 120)
    }

    detectFaces()

    return () => {
      cancelled = true
      clearTimeout(timer)
      const context = canvas?.getContext('2d')
      if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
      setFaceDetected(false)
    }
  }, [cameraActive, modelsLoaded])

  async function startCamera() {
    let stream
    setPendingAction('start')
    setResult('Requesting camera access...')

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      video.srcObject = stream
      await video.play()
      setCameraActive(true)
      setResult('')
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop())
      console.error(error)
      setResult('Could not access webcam.')
    } finally {
      setPendingAction(null)
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject
    stream?.getTracks().forEach(track => track.stop())

    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  async function captureFace() {
    const video = videoRef.current

    if (!modelsLoaded || !cameraActive || !video || video.readyState < 2) {
      setResult('Wait until the models and camera are ready.')
      return null
    }

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()

      if (detections.length === 0) {
        setResult('No face detected. Try again.')
        return null
      }

      if (detections.length > 1) {
        setResult('More than one face detected. Only one person should be in view.')
        return null
      }

      return Array.from(detections[0].descriptor)
    } catch (error) {
      console.error('Face capture error:', error)
      setResult('Could not capture a face sample.')
      return null
    }
  }

  async function enrollFace() {
    setPendingAction('capture')
    setResult('Detecting face...')

    try {
      const descriptor = await captureFace()
      if (!descriptor) return

      setSavedDescriptor(descriptor)
      setDistance(null)
      setResult('First face sample captured successfully.')
    } finally {
      setPendingAction(null)
    }
  }

  async function verifyFace() {
    if (!savedDescriptor) {
      setResult('Capture the first face sample before comparing.')
      return
    }

    setPendingAction('compare')
    setResult('Comparing face samples...')

    try {
      const liveDescriptor = await captureFace()
      if (!liveDescriptor) return

      const calculatedDistance = faceapi.euclideanDistance(
        savedDescriptor,
        liveDescriptor,
      )

      setDistance(calculatedDistance.toFixed(4))
      setResult('Comparison completed. Check the distance below.')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="camera-section">
      <p
        className={`model-status ${modelsLoaded ? 'is-ready' : modelError ? 'is-error' : ''}`}
        role="status"
      >
        <span className="model-status-dot" />
        Models {modelsLoaded ? 'Ready' : modelError ? 'Unavailable' : 'Loading'}
      </p>

      <div className="camera-workspace">
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={canvasRef} aria-hidden="true" />
          {!cameraActive && (
            <div className="camera-idle">
              <span className="camera-idle-label">LIVE PREVIEW</span>
              <p>{modelError ? 'Camera unavailable until models load.' : 'Camera is off'}</p>
              <button
                className={pendingAction === 'start' ? 'is-loading' : ''}
                onClick={startCamera}
                disabled={!modelsLoaded || pendingAction !== null}
                aria-busy={pendingAction === 'start'}
              >
                {pendingAction === 'start' && <span className="button-spinner" aria-hidden="true" />}
                {pendingAction === 'start' ? 'Starting camera...' : 'Start Camera'}
              </button>
            </div>
          )}
          {cameraActive && (
            <div className={`face-detection-indicator ${faceDetected ? 'is-found' : ''}`} role="status">
              <span />
              {faceDetected ? 'Face detected' : 'Looking for face'}
            </div>
          )}
        </div>

        <div className="camera-controls">
          {cameraActive && (
            <button onClick={stopCamera} disabled={pendingAction !== null}>
              Stop Camera
            </button>
          )}
          <button
            className={pendingAction === 'capture' ? 'is-loading' : ''}
            onClick={enrollFace}
            disabled={!cameraActive || !modelsLoaded || pendingAction !== null}
            aria-busy={pendingAction === 'capture'}
          >
            {pendingAction === 'capture' && <span className="button-spinner" aria-hidden="true" />}
            {pendingAction === 'capture' ? 'Capturing...' : 'Capture First Sample'}
          </button>
          <button
            className={pendingAction === 'compare' ? 'is-loading' : ''}
            onClick={verifyFace}
            disabled={!cameraActive || !modelsLoaded || !savedDescriptor || pendingAction !== null}
            aria-busy={pendingAction === 'compare'}
          >
            {pendingAction === 'compare' && <span className="button-spinner" aria-hidden="true" />}
            {pendingAction === 'compare' ? 'Comparing...' : 'Compare Live Face'}
          </button>

          <p className="camera-result" aria-live="polite">
            {result || 'Start the camera to begin.'}
          </p>
          {savedDescriptor && (
            <p className="sample-state">First face sample captured</p>
          )}

          {distance !== null && (
            <div className="comparison-result">
              <h3>Comparison distance: {distance}</h3>
              
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Camera
