import os
from google.cloud import storage
import uuid
from video import get_video_duration, within_range, compress_video
from flask import Blueprint, request, jsonify


blueprint = Blueprint('uploads', __name__)

storage_client = storage.Client()
bucket = storage_client.bucket(os.getenv("GCS_BUCKET_NAME"))


@blueprint.route('/upload', methods=['POST'])
def upload():
    try:
        
        # Get the Content-Type header (like 'image/png' or 'image/jpeg') and reading the raw data
        content_type = request.headers.get('Content-Type', 'application/octet-stream')
        raw_data = request.get_data()

        # Generate a unique file ID and filename
        ext = content_type.split('/')[-1]
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.{ext}"

        # Create a blob (object) in the bucket
        blob = bucket.blob(f"uploads/{filename}")

        metadata = {
            "type": request.headers.get('X-Type'),
            "title": request.headers.get('X-Title'),
            "description": request.headers.get('X-Description'),
        }

        if (request.headers.get("X-Type") == "video"):
            
            # Validate video duration
            real_duration = get_video_duration(raw_data)
            listed_duration = float(request.headers.get("X-Video-Duration"))
            # print(f"Real duration: {real_duration}, Listed duration: {listed_duration}")
            if not within_range(real_duration, listed_duration, 0.2):
                return jsonify({"error": "Video duration mismatch", "real_duration": real_duration}), 400
            
            raw_data = compress_video(raw_data, ext)

            metadata["duration"] = str(real_duration)
        elif not (request.headers.get("X-Type") == "image"):
            return jsonify({"error": "Unspecified video duration"}), 400
        
        blob.metadata = metadata
     
        blob.upload_from_string(raw_data, content_type=content_type)

        # blob.make_public() # Already public by default in this setup

        # Return success JSON with ID + URL
        return jsonify({
            "filename": filename,
            "url": blob.public_url,
            "size": len(raw_data)
        }), 200

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500
