
import { useEffect, useState } from 'react'

import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

function Fingerprint() {
  const [supported, setSupported] = useState(false)
  const [platformAvailable, setPlatformAvailable] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('Ready to test.')
  const [status, setStatus] = useState('Not registered')

  useEffect(() => {
    async function checkDevice() {
      const available = browserSupportsWebAuthn()
      setSupported(available)

      if (available) {
        try {
          const platform = await platformAuthenticatorIsAvailable()
          setPlatformAvailable(platform)
        } catch (error) {
          console.error(error)
        }
      }
    }

    checkDevice()
  }, [])

  async function registerDevice() {
    setLoading(true)
    setResult('Preparing device registration...')

    try {
      const response = await fetch(`${API}/register/options`)
      const optionsJSON = await response.json()

      if (!response.ok) {
        throw new Error(optionsJSON.error)
      }

      const registrationResponse = await startRegistration({
        optionsJSON,
      })

      const verificationResponse = await fetch(
        `${API}/register/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registrationResponse),
        },
      )

      const verification = await verificationResponse.json()

      if (!verificationResponse.ok || !verification.verified) {
        throw new Error(verification.error || 'Registration failed.')
      }

      setRegistered(true)
      setStatus('Device registered')
      setResult(verification.message)
    } catch (error) {
      console.error(error)
      setResult(error.message || 'Could not register this device.')
    } finally {
      setLoading(false)
    }
  }

  async function authenticateDevice() {
    setLoading(true)
    setResult('Waiting for device authentication...')

    try {
      const response = await fetch(`${API}/authenticate/options`)
      const optionsJSON = await response.json()

      if (!response.ok) {
        throw new Error(optionsJSON.error)
      }

      const authenticationResponse = await startAuthentication({
        optionsJSON,
      })

      const verificationResponse = await fetch(
        `${API}/authenticate/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(authenticationResponse),
        },
      )

      const verification = await verificationResponse.json()

      if (!verificationResponse.ok || !verification.verified) {
        throw new Error(verification.error || 'Authentication failed.')
      }

      setStatus('Authentication successful')
      setResult(verification.message)
    } catch (error) {
      console.error(error)
      setStatus('Not authenticated')
      setResult(error.message || 'Authentication was not completed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fingerprint-section">
      <div className="fingerprint-heading">
        <div>
          <span className="fingerprint-label">BIOMETRIC TEST 02</span>
          <h2>Fingerprint Authentication</h2>
          <p>
            Test your phone's built-in biometric authentication.
          </p>
        </div>

        <div className="fingerprint-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            width="35"
            height="35"
          >
            <path d="M12 11a2 2 0 0 0-2 2c0 2-.3 4-1 6" />
            <path d="M14 13c0 3-.3 5-1 7" />
            <path d="M8 13a4 4 0 0 1 8 0c0 3-.3 5-1 7" />
            <path d="M6 13a6 6 0 0 1 12 0c0 4-.5 6-1.5 8" />
            <path d="M12 3a10 10 0 0 0-10 10c0 2 .3 4 1 6" />
            <path d="M12 3a10 10 0 0 1 10 10" />
          </svg>
        </div>
      </div>

      <div className="fingerprint-device-info">
        <div className="fingerprint-info-row">
          <span>WebAuthn support</span>
          <strong>{supported ? 'Available' : 'Unavailable'}</strong>
        </div>

        <div className="fingerprint-info-row">
          <span>Built-in authenticator</span>
          <strong>
            {platformAvailable ? 'Available' : 'Not detected'}
          </strong>
        </div>

        <div className="fingerprint-info-row">
          <span>Registration</span>
          <strong>{registered ? 'Registered' : 'Not registered'}</strong>
        </div>
      </div>

      <div className="fingerprint-actions">
        <button
          onClick={registerDevice}
          disabled={!supported || !platformAvailable || loading || registered}
        >
          {loading ? 'Please wait...' : 'Register This Device'}
        </button>

        <button
          className="fingerprint-secondary"
          onClick={authenticateDevice}
          disabled={!registered || loading}
        >
          Test Fingerprint Authentication
        </button>
      </div>

      <div className="fingerprint-result" role="status" aria-live="polite">
        <span className="fingerprint-result-dot" />
        <div>
          <strong>{status}</strong>
          <p>{result}</p>
        </div>
      </div>

      <p className="fingerprint-disclaimer">
        Your fingerprint data stays on your device. Face ID,
        device PIN or another supported authentication method
        may be used instead of a fingerprint.
      </p>
    </div>
  )
}

export default Fingerprint
