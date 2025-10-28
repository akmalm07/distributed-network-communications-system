import imageCompression from "browser-image-compression";
import { BACKEND_URL } from "./constant";

interface Image {
    id: string;
    title: string;
    description: string;
    type: string;

    save(rawData: Uint8Array): Promise<Image>;
}

export class ImagePNG implements Image {

    public type: string = "image/png";
    public id: string;
    public title: string;
    public description: string;

    constructor(
        id: string,
        title: string,
        description: string
    ) {
        this.id = id;
        this.title = title;
        this.description = description;
    }
    public async save(rawData: Uint8Array) : Promise<Image> {

        const blob = new Blob([rawData], { type: this.type }); // or "image/jpeg"

        const compressedBlob = await imageCompression(blob, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
        const arrayBuffer = await compressedBlob.arrayBuffer();

        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: "POST",
            headers: {
                "Content-Type": this.type
            },
            body: compressedBlob
        });

        if (!response.ok) {
            throw new Error("Failed to upload image");
        }

        const responseData = await response.json();

        return new ImagePNG(
            responseData.id,
            this.title,
            this.description
        );  
    }
}