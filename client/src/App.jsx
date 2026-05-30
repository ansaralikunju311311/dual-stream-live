import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Client from './pages/Client';
import Host from './pages/Host';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <nav className="p-4 bg-slate-900 border-b border-slate-800 flex gap-4">
          <Link to="/" className="text-blue-400 hover:text-blue-300 font-semibold">Home</Link>
          <Link to="/client" className="text-emerald-400 hover:text-emerald-300 font-semibold">Client</Link>
          <Link to="/host" className="text-indigo-400 hover:text-indigo-300 font-semibold">Host</Link>
        </nav>
        
        <div className="flex-1">
          <Routes>
            <Route path="/" element={
              <div className="flex flex-col items-center justify-center h-[80vh] gap-6 text-center">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                  Dual-Stream Live Video
                </h1>
                <p className="text-xl text-slate-400 max-w-lg">
                  A realtime WebRTC application that streams webcam and screen sharing simultaneously with an embedded timestamp overlay.
                </p>
                <div className="flex gap-4 mt-8">
                  <Link to="/client" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold transition-colors">
                    Go to Client
                  </Link>
                  <Link to="/host" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold transition-colors">
                    Go to Host Dashboard
                  </Link>
                </div>
              </div>
            } />
            <Route path="/client" element={<Client />} />
            <Route path="/host" element={<Host />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
