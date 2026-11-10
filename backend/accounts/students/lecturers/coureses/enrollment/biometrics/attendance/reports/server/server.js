
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

const app = express()

const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173'
const rpID = process.env.WEBAUTHN_RP_ID || new URL(origin).hostname
const corsOrigins = (process.env.CORS_ORIGINS || origin)
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)

app.use(cors({ origin: corsOrigins }))
app.use(express.json())

const PORT = Number(process.env.PORT) || 5000

const rpName = 'FaceLab'

// Temporary test account
const testUser = {
  id: 'student-001',
  username: 'teststudent',
  displayName: 'FaceLab Test Student',
}

// Temporary storage for this experiment
let credential = null
let registrationChallenge = null
let authenticationChallenge = null

app.get('/', (req, res) => {
  res.json({ message: 'FaceLab biometric server is running.' })
})

// Generate registration challenge
app.get('/register/options', async (req, res) => {
  try {
    if (credential) {
      return res.status(409).json({
        error: 'A device has already been registered.',
      })
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(testUser.id),
      userName: testUser.username,
      userDisplayName: testUser.displayName,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
    })

    registrationChallenge = options.challenge

    res.json(options)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

// Verify device registration
app.post('/register/verify', async (req, res) => {
  try {
    if (!registrationChallenge) {
      return res.status(400).json({
        error: 'Registration challenge expired. Try again.',
      })
    }

    const challenge = registrationChallenge
    registrationChallenge = null

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    })

    if (!verification.verified) {
      return res.status(400).json({
        verified: false,
        error: 'Device registration was not verified.',
      })
    }

    const info = verification.registrationInfo

    credential = {
      id: info.credential.id,
      publicKey: info.credential.publicKey,
      counter: info.credential.counter,
      transports: info.credential.transports,
    }

    res.json({
      verified: true,
      message: 'Device registered successfully!',
    })
  } catch (error) {
    console.error(error)
    res.status(400).json({ error: error.message })
  }
})

// Generate authentication challenge
app.get('/authenticate/options', async (req, res) => {
  try {
    if (!credential) {
      return res.status(400).json({
        error: 'Register a device first.',
      })
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [
        {
          id: credential.id,
          transports: credential.transports,
        },
      ],
      userVerification: 'required',
    })

    authenticationChallenge = options.challenge

    res.json(options)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

// Verify authentication
app.post('/authenticate/verify', async (req, res) => {
  try {
    if (!credential || !authenticationChallenge) {
      return res.status(400).json({
        error: 'No active authentication request. Try again.',
      })
    }

    const challenge = authenticationChallenge
    authenticationChallenge = null

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential,
      requireUserVerification: true,
    })

    if (verification.verified) {
      credential.counter =
        verification.authenticationInfo.newCounter
    }

    res.json({
      verified: verification.verified,
      message: verification.verified
        ? 'Device authentication successful!'
        : 'Authentication failed.',
    })
  } catch (error) {
    console.error(error)
    res.status(400).json({ error: error.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FaceLab server running at http://localhost:${PORT}`)
})
