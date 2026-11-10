
import Camera from './components/Camera'
import Fingerprint from './components/Fringerprint'

function App() {
  return (
    <div className="app-layout">
      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>FaceLab</h2>
            <p>Biometric recognition testing platform</p>
          </div>
          <span className="testing-badge">Testing Mode</span>
        </header>

        <section className="camera-dashboard">
          <div className="section-heading">
            <h1>Face comparison</h1>
            <p>
              Capture one face sample, then compare it with a live sample.
            </p>
          </div>

          <Camera />
        </section>

        <section className="camera-dashboard fingerprint-dashboard">
          <div className="section-heading">
            <h1>Fingerprint authentication</h1>
            <p>
              Register and test your phone's built-in biometric
              authenticator.
            </p>
          </div>

          <Fingerprint />
        </section>

        <div className="notice">
          <strong>Research and testing only</strong>
          <p>
            This application is for experimental purposes.
            Face descriptors and fingerprint templates are not
            uploaded by these tests. The server stores a passkey
            public credential for authentication.
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
