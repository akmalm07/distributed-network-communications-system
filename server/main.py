
# Must go FIRST — before importing google.cloud
import os
from flask import Flask, request, jsonify, send_from_directory, Blueprint;
from flask_cors import CORS
import dotenv
from google.cloud import storage

from routes import viewable

dotenv.load_dotenv()

app = Flask(__name__)

app.register_blueprint(viewable.blueprint)

CORS(app, resources={r"*": {
    "origins": "*",
    "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    "allow_headers": ["Content-Type", "X-Type", "X-Title", "X-Description", "X-Video-Duration"],
}})



if __name__ == '__main__':
    app.run(host='localhost', port=int(os.getenv("PORT", 8080)), debug=True)