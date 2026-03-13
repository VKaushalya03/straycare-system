import { useState } from "react";
import axios from "axios";

export default function DiseasePrediction() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError("");
    }
  };

  const handlePredict = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError("");

    // Package the file securely
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Send the image to YOUR local Flask server running on port 5001
      const response = await axios.post(
        "http://localhost:5001/predict",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setResult(response.data);
    } catch (err) {
      setError(
        "Failed to connect to the local ML service. Make sure python app.py is running!",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="prediction-container"
      style={{
        padding: "20px",
        maxWidth: "500px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h2>AI Skin Disease Detection</h2>
      <p>Upload a clear photo of the dog's affected skin area.</p>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ marginBottom: "20px" }}
      />

      {preview && (
        <div>
          <img
            src={preview}
            alt="Upload preview"
            style={{
              width: "100%",
              maxHeight: "300px",
              objectFit: "cover",
              borderRadius: "8px",
            }}
          />
        </div>
      )}

      <button
        onClick={handlePredict}
        disabled={!selectedFile || loading}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          cursor: "pointer",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        {loading ? "Analyzing Image..." : "Run Diagnosis"}
      </button>

      {error && <p style={{ color: "red", marginTop: "20px" }}>{error}</p>}

      {result && (
        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h3>
            Diagnosis:{" "}
            <span
              style={{
                color: result.prediction === "Uncertain" ? "red" : "#2c3e50",
              }}
            >
              {result.prediction.replace("_", " ").toUpperCase()}
            </span>
          </h3>
          <p>
            Confidence: <strong>{result.confidence}%</strong>
          </p>
          <p style={{ fontStyle: "italic", color: "#555" }}>{result.message}</p>
        </div>
      )}
    </div>
  );
}
