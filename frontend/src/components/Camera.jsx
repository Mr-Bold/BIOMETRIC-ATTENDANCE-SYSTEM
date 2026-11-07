
import { useEffect, useRef, useState } from 'react'
import * as faceapi from '@vladmandic/face-api'

function Camera() {
  const videoRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelError, setModelError] = useState(false)
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

  async function startCamera() {
    let stream

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
    const descriptor = await captureFace()
    if (!descriptor) return

    setSavedDescriptor(descriptor)
    setDistance(null)
    setResult('First face sample captured successfully.')
  }

  async function verifyFace() {
    if (!savedDescriptor) {
      setResult('Capture the first face sample before comparing.')
      return
    }

    const liveDescriptor = await captureFace()
    if (!liveDescriptor) return

    const calculatedDistance = faceapi.euclideanDistance(
      savedDescriptor,
      liveDescriptor,
    )

    setDistance(calculatedDistance.toFixed(4))
    setResult('Comparison completed. Check the distance below.')
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
          {!cameraActive && (
            <div className="camera-idle">
              <span className="camera-idle-label">LIVE PREVIEW</span>
              <p>{modelError ? 'Camera unavailable until models load.' : 'Camera is off'}</p>
              <button onClick={startCamera} disabled={!modelsLoaded}>
                Start Camera
              </button>
            </div>
          )}
        </div>

        <div className="camera-controls">
          {cameraActive && <button onClick={stopCamera}>Stop Camera</button>}
          <button onClick={enrollFace} disabled={!cameraActive || !modelsLoaded}>
            Capture First Sample
          </button>
          <button
            onClick={verifyFace}
            disabled={!cameraActive || !modelsLoaded || !savedDescriptor}
          >
            Compare Live Face
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
