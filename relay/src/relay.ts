import { WebSocketServer, WebSocket } from "ws";
import { HOST, PORT, MessageType, prependByte } from "./constant.js";
import type { ByteBuffer } from "./constant.js";
import { db, timestamp } from "./db.js";

export class Relay {

    private connections: Set<WebSocket>;

    private server: WebSocketServer;

    private cachedPosts: any = null;
    private lastCacheTime = 0;
    private cacheTTL = 5000; // 5 seconds

    
    public constructor() {
        this.server = new WebSocketServer({ port: PORT });
        this.connections = new Set();
        
        this.server.on("listening", () => {
            console.log(`Relay server listening on wss://${HOST}:${PORT}`);
        });

        this.server.on("connection", (ws: WebSocket) => {
            console.log("New client connected");
        });

        this.server.on("error", (err: Error) => {
            console.error("Relay server error:", err);
        });
        
    /*setInterval(async () => {
        this.cachedPosts = await this.mostRecentPosts();
        this.lastCacheTime = Date.now();
    }, this.cacheTTL);  // Prodution grade */

        this.listenForConnections();
    }

    private async getCachedPosts() { // Tested Cache, works!
        const now = Date.now();

        if (!this.cachedPosts || (now - this.lastCacheTime > this.cacheTTL)) {
            console.log("Refreshing cached posts... (WAS NOT CACHED OR EXPIRED)");
            this.cachedPosts = await this.mostRecentPosts();
            this.lastCacheTime = now;
        }

        return this.cachedPosts;
    }

    private listenForConnections() {
        this.server.on("connection", async (ws: WebSocket) => {
            const posts = this.getCachedPosts();
            
            this.connections.add(ws);

            ws.on("message", (data: Buffer) => {
                if (!(data instanceof Buffer)) return;
                this.onMessage(data, ws);
            });
            
            ws.on("close", () => {
                console.log("Client disconnected");
                this.connections.delete(ws);
            });

            ws.send(await posts);
        });
    }


    private async mostRecentPosts(): Promise<ByteBuffer> {
        
        const recentPosts = await db.collection("posts")
            .orderBy("timestamp", "desc")
            .limit(10)
            .get();

        console.log(`Fetched ${recentPosts.size} recent posts from database.`, recentPosts.docs.map(doc => doc.data()));

        return prependByte(Buffer.from(JSON.stringify(recentPosts.docs.map(doc => doc.data())), "utf-8"), MessageType.POSTS);
    }

    private handleNewPost(sender: WebSocket, postData: ByteBuffer) {

        const jsonData = JSON.parse(postData.toString());

        db.collection("posts").add({
            content: jsonData.content,
            author: jsonData.author,
            timestamp: timestamp.now()
        });

        console.log("Handling new post:", jsonData);
        // Here you can add logic to store the post or process it further
        //this.broadcast(JSON.stringify(jsonData), sender);
    }

    private onMessage(data: ByteBuffer, sender: WebSocket) {            

        switch (data[0]) {
            case MessageType.PING:
                sender.send(Buffer.from([MessageType.PONG]));
                return;
            case MessageType.POST:
                this.handleNewPost(sender, data.subarray(1));
                return;
            case MessageType.GET_POSTS:
                this.getCachedPosts().then((posts) => {
                    sender.send(posts);
                });
            // Add more cases later, as needed
            default:
                break;
        }

        /*
        switch (data[1]) {
        
            case MessageRecipient.ALL:
                break;

            case MessageRecipient.SINGLE:
                // Handle single recipient logic here (not implemented)
                return;
        }

        switch (data[2]) {
            case MessageFormat.TXT:

            default:
                break;
        }
       
        this.broadcast(data, sender);
        */

    }
    

    private broadcast(message: string, sender: WebSocket) {
        const msgBuffer = Buffer.from(message, "utf-8");

        for (const conn of this.connections) {
            if (conn !== sender && conn.readyState === WebSocket.OPEN) {
                conn.send(msgBuffer);
            }
        }
    }

    /* PRODUCTION CODE
    private broadcast(data: ByteBuffer, sender: WebSocket) {
        for (const conn of this.connections) {
            if (conn !== sender && conn.readyState === WebSocket.OPEN) {
                conn.send(data);
            }
        }
    }
    */

}
