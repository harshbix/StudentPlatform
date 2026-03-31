import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<div className="p-8 text-center text-4xl font-bold mt-20 text-indigo-600">Student Platform Frontend Scaffolded!</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
