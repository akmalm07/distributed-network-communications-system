
# Must go FIRST — before importing google.cloud
import os
from flask import Flask
from flask_cors import CORS
import dotenv

from routes import uploads

dotenv.load_dotenv()

app = Flask(__name__)

app.register_blueprint(uploads.blueprint, url_prefix='/api')

CORS(app, resources={r"*": {
    "origins": "*",
    "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    "allow_headers": ["Content-Type", "X-Type", "X-Title", "X-Description", "X-Video-Duration"],
}})



if __name__ == '__main__':
    app.run(host='localhost', port=int(os.getenv("PORT", 8080)), debug=True)