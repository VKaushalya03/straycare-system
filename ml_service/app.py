from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = Flask(__name__)
# CORS allows your React app (running on port 5173) to securely talk to this API
CORS(app) 

# Load the trained model you downloaded from Colab
MODEL_PATH = 'straycare_4_classes_mobilenet.keras'
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model. Make sure the .keras file is in this folder! Details: {e}")

# The 4 classes the model was trained on (in exact alphabetical order)
CLASS_NAMES = ['bacterial dermatosis', 'fungal infections', 'healthy', 'hypersensitivity dermatitis']

def prepare_image(image_bytes):
    """Resizes and formats the raw image for the MobileNet model"""
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    img_array = tf.keras.utils.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0) # Create a batch size of 1
    return img_array

@app.route('/predict', methods=['POST'])
def predict():
    # 1. Check if an image was actually sent
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # 2. Read and process the image
        image_bytes = file.read()
        processed_image = prepare_image(image_bytes)
        
        # 3. Run the prediction
        predictions = model.predict(processed_image)
        score = tf.nn.softmax(predictions[0]) # Convert raw outputs to percentages
        
        predicted_class = CLASS_NAMES[np.argmax(score)]
        confidence = float(np.max(score)) * 100
        
        # 4. Apply a safety threshold (If the AI is guessing, tell the user)
        if confidence < 60.0:
            return jsonify({
                'prediction': 'Uncertain',
                'confidence': round(confidence, 2),
                'message': 'Confidence is too low. Please upload a clearer photo of the affected area.'
            })

        # 5. Return the successful result!
        return jsonify({
            'prediction': predicted_class,
            'confidence': round(confidence, 2),
            'message': 'Diagnosis complete.'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run on port 5001 so it doesn't collide with your Node.js backend on 5000
    app.run(port=5001, debug=True)