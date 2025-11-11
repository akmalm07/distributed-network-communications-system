import { useState } from "react";
import "../src/style/core.css";
import { usePeer } from "../src/PeerContext.tsx";
// import { fromStringKey } from "./crypto.ts";
// import { Image, Video, mapExtention, getVideoDuration } from "./images.ts";
// import type { Viewable } from "./images.ts";
import type { Post } from "../src/data.ts";
import { MessageType, ViewableType } from "../src/data";


export default function AppFrontendCore() {
    const [message, setMessage] = useState("");

    const { peer } = usePeer();

    const handleClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!peer || !peer.connected()) {
            alert("Peer not initialized yet!");
            return;
        }
        console.log("Posting message:", message);

        const post : Post = {
            author: peer.getName(),
            type: MessageType.POST,
            content: [{ attributes: [], content: message }],
        };
        peer.sendData(post);
    };

    return (
        <>
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>Make Post</h1>
            <form>
                <input value={message} onChange={(e) => setMessage(e.target.value)} />
                <button type="submit" onClick={handleClick}>Post</button>
            </form>
        </div>
        </>
    );
}