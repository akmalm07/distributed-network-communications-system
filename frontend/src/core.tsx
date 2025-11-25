import { useEffect, useState } from "react";
import "./style/core.css";
import { usePeer } from "./PeerContext";
import { Image, Video, mapExtention, isViewable } from "./images";
import type { Viewable,  } from "./images";
import type { Post, PostItems } from "./data";
import { MessageType, ViewableType, RenderContent, Status } from "./data";
import { th } from "@faker-js/faker";


export default function AppFrontendCore() {
    const [message, setMessage] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState("");

    const { peer, subchat } = usePeer();
    const [posts, setPosts] = useState<Post[]>([]);

    /** TEST */
    useEffect(() => { // TESTING PURPOSES ONLY
        window.peer = peer;
    }, [peer]);
    /** TEST */
    
    // Handle file selection + local preview
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setFile(selectedFile || null);

        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!peer || !peer.connected()) {
            alert("Peer not initialized yet!");
            return;
        }

        const content: PostItems[] = [];

        // Add text message if present
        if (message.trim() !== "") {
            content.push({ attributes: [], content: message });
        }

        // Handle media (image or video)
        if (file) {
            try {
                setUploadStatus("Uploading media...");
                const mimeType = file.type;
                const ext = mimeType.split("/")[1];
                const viewType = mapExtention(ext);

                if (!viewType) {
                    throw new Error(`Unsupported file type: ${mimeType}`);
                }

                const arrayBuffer = await file.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);

                let viewable: Viewable;
                if (mimeType.startsWith("image/")) {
                    viewable = new Image(viewType, file.name, "Uploaded via Distributed Post");
                } else if (mimeType.startsWith("video/")) {
                    viewable = new Video(viewType, file.name, "Uploaded via Distributed Post");
                } else {
                    throw new Error("Unsupported media type");
                }

                await viewable.save(data);
                content.push(viewable);

                setUploadStatus("✅ Upload successful!");
            } catch (err) {
                console.error("Upload failed:", err);
                setUploadStatus("❌ Upload failed");
                return;
            }
        }

        if (subchat === null) 
            throw new Error("No subchat selected, Do you want to post to 'root' subchat?");

        // Construct and send post
        const post: Post = {
            author: peer.getName(),
            type: MessageType.POST,
            subchat: subchat,
            content,
            timestamp: Date.now()
        };

        const id = peer.sendData(post);
        const status = await peer.getStatus(id!);

        if (!status) {
            setUploadStatus("Failed to send post.");
            return;
        } else {
            setUploadStatus("WOW!!");
            console.log("Post send status YAY!!! :", Status[status]);
        }

        // Reset state
        setMessage("");
        setFile(null);
        setPreviewUrl(null);
        setUploadStatus("");

        if (await status === Status.COMPLETED) {
            setUploadStatus("Post sent successfully!");
            // Update local posts immediately
            setPosts((prevPosts) => [post, ...prevPosts]);
        } else {
            setUploadStatus("Failed to send post.");
        }
    };


    // Load recent posts
    useEffect(() => {
        if (!peer || !peer.connected()) return;
        let cancelled = false;

        (async () => {
            const posts = await peer.getRecentPosts();
            if (!cancelled) setPosts(posts);
        })();

        return () => { cancelled = true; };
    }, [peer]);

    return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>📝 Make Post</h1>
            <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a message..."
                    style={{ marginRight: "0.5rem" }}
                />
                <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    style={{ marginRight: "0.5rem" }}
                />
                <button type="submit">Post</button>
            </form>

            {previewUrl && (
                <div style={{ marginBottom: "1rem" }}>
                    <h3>Preview:</h3>
                    <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ maxWidth: "300px", borderRadius: "10px" }}
                    />
                </div>
            )}
            {uploadStatus && <p>{uploadStatus}</p>}

            <h1>📜 Recent Posts</h1>
            <div>
                {posts.map((post, i) => (
                    <div key={i} style={{ marginBottom: "1rem" }}>
                        <h2>{post.author}</h2>
                        {post.content.map((item, j) => {
                            if (isViewable(item)) {
                                if (item.type.startsWith("video")) {
                                    return (
                                        <video key={j} controls width="400">
                                            <source src={item.url!} type={item.type} />
                                        </video>
                                    );
                                } else {
                                    return (
                                        <img
                                            key={j}
                                            src={item.url!}
                                            alt={item.title ?? "image"}
                                            width="400"
                                        />
                                    );
                                }
                            } else {
                                // Text message
                                return <p key={j}>{item.content}</p>;
                            }
                        })}
                    </div>
                ))}
            </div>
        </div>
        );      
}
