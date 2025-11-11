import imageCompression from 'browser-image-compression';
import { BACKEND_URL } from "./constants";
import { ViewableType } from "./data";

export interface Viewable {
    type: ViewableType;
    url: string | null;
    title: string | null;
    description: string | null;
    size: number | null;

    save(rawData: Uint8Array): Promise<void>;
}

export function isViewable(item: object): item is Viewable {
    return item && 'url' in item && 'type' in item && 'title' in item && 'description' in item && 'size' in item && item.url !== null && item.type !== undefined;
}


export class Image implements Viewable {

    public url: string | null = null;
    public type: ViewableType;
    public title: string | null;
    public description: string | null;
    public size: number | null;

    constructor(
        type: ViewableType,
        title: string | null = null,
        description: string | null = null,
    ) {
        this.type = type;
        this.title = title;
        this.description = description;
        this.url = null;
        this.size = null;
    }

    public async save(rawData: Uint8Array) {

        const blob = new Blob([rawData], { type: this.type }); // or "image/jpeg"

        console.log("Original image size:", blob.size / 1024, "KB");
        const startTime = performance.now(); // because compression takes so long, do lazy loading!!!
        const compressedBlob = await imageCompression(blob, { maxSizeMB: 1, maxWidthOrHeight: 1920, fileType: this.type }); // maxWidthOrHeight: 1280
        console.log("Compressed image size:", compressedBlob.size / 1024, "KB");
        console.log("Compression took:", performance.now() - startTime, "ms");
        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: "POST",
            headers: {
                "Content-Type": this.type,
                "X-Type": "image",
                "X-Title": this.title || "",
                "X-Description": this.description || ""
            },
            body: compressedBlob
        });
        if (!response.ok) {
            throw new Error("Failed to upload image");
        }

        const responseData = await response.json();
        this.url = responseData.url;
    }
}


export class Video implements Viewable {

    public type: ViewableType;
    public url: string | null;
    public title: string | null;
    public description: string | null;
    public size: number | null;
    public duration: number | null = null;

    constructor(
        type: ViewableType,
        title: string | null = null,
        description: string | null = null,
    ) {
        this.type = type;
        this.title = title;
        this.description = description;
        this.url = null;
        this.size = null;
    }
    public async save(rawData: Uint8Array) {

        const blob = new Blob([rawData], { type: this.type }); 
        const duration = await getVideoDuration(blob);

        this.duration = duration;

        if (duration > 300.01) { // 5 minutes limit
            throw new Error("Video duration exceeds the 5 minutes limit");
        }
        
        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: "POST",
            headers: {
                "Content-Type": this.type,
                "X-Type": "video",
                "X-Title": this.title || "",
                "X-Description": this.description || "",
                "X-Video-Duration": duration.toString() // Finish the video uplaod storage!!!
            },
            body: blob
        }); 
        if (!response.ok) {
            throw new Error("Failed to upload video");
        }
        const responseData = await response.json();
        this.url = responseData.url;
    }
}


export async function getVideoDuration(rawData: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(rawData);

        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;

        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(video.duration); // duration in seconds (float)
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load video metadata"));
        };
    });
}


export function mapExtention(ext: string) : ViewableType | null {
    switch (ext.toLowerCase()) {
        case "png":
            return ViewableType.PNG;
        case "jpg":
        case "jpeg":
            return ViewableType.JPG;
        // case "gif":
        //     return ViewableType.GIF;
        // case "bmp":
        //     return ViewableType.BMP;
        case "webp":
            return ViewableType.WEBP;
        case "mp4":
            return ViewableType.MP4;
        default:
            return null;
    }
}