import Camera from './components/Camera'

function App() {
  return (
    <div className="app-layout">
      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>FaceLab</h2>
            <p>Face recognition testing platform</p>
          </div>
          <span className="testing-badge">Testing Mode</span>
        </header>

        <section className="camera-dashboard">
          <div className="section-heading">
            <h1>Face comparison</h1>
            <p>Capture one face sample, then compare it with a live sample.</p>
          </div>
          <Camera />
        </section>

        <div className="notice">
          <strong>Research and testing only</strong>
          <p>
            This application is for research and testing purposes only.
            Your data is not stored or shared, and the face recognition model is not
            intended for production use.
            let just help our bro to achieve his goal.
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
