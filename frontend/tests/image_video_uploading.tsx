import { useEffect, useState } from "react";
import "../src/style/core.css";
import { usePeer } from "../src/PeerContext.tsx";
import { fromStringKey } from "../src/crypto.ts";
import { Image, mapExtention } from "../src/images.ts";
import { ViewableType } from "../src/data.ts";


export default function AppFrontendCore() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState("");

    const handleFileChange = (e : any) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);

        // Preview image locally before upload
        if (selectedFile) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        }
    };

    const handleUpload = async () => {
        if (!file) {
        alert("Please select a file first!");
        return;
        }

        setUploadStatus("Uploading...");
        const mimeType = file.type;
        const ext = mimeType.split("/")[1];
        const viewType = mapExtention(ext) || ViewableType.PNG;
        try {
            const image = new Image(viewType, file.name, "Uploaded via Destributed");
            const arrayBuffer = await file.arrayBuffer();
            await image.save(new Uint8Array(arrayBuffer));
            setUploadStatus("✅ Upload successful! Image URL: " + image.url);

        } catch (err) {
            console.error("Upload error:", err);
            setUploadStatus("❌ Upload failed");
        }
    };

    return (
        <>
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>📤 Image Upload Demo</h1>

            <input type="file" accept="image/*" onChange={handleFileChange} />

            {previewUrl && (
            <div style={{ marginTop: "1rem" }}>
                <h3>Preview:</h3>
                <img
                src={previewUrl}
                alt="preview"
                style={{ maxWidth: "300px", borderRadius: "10px" }}
                />
            </div>
            )}

            <button
            onClick={handleUpload}
            style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                cursor: "pointer",
            }}
            >
            Upload
            </button>

            {uploadStatus && (
            <p style={{ marginTop: "1rem" }}>{uploadStatus}</p>
            )}
        </div>
        </>
    );
}