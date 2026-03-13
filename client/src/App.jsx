import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
import DiseasePrediction from "./components/DiseasePrediction"; // 1. Imported the new component

function App() {
  return (
    <Router>
      <div className="App">
        {/* Navigation Bar can go here later */}
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* 2. Added the new prediction route */}
          <Route path="/predict" element={<DiseasePrediction />} />

          <Route
            path="/"
            element={
              <div style={{ textAlign: "center", marginTop: "50px" }}>
                <h1>StrayCare Dashboard</h1>
                <p>
                  Please <Link to="/login">Login</Link> or{" "}
                  <Link to="/signup">Signup</Link>.
                </p>

                {/* 3. Added a quick shortcut to test the ML model */}
                <div style={{ marginTop: "30px" }}>
                  <h3>Try the AI Diagnosis Tool</h3>
                  <Link to="/predict">
                    <button
                      style={{
                        padding: "10px 20px",
                        cursor: "pointer",
                        backgroundColor: "#007BFF",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                      }}
                    >
                      Go to Disease Prediction
                    </button>
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
