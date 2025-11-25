import { WebSocketServer, WebSocket } from "ws";
import Subchat from "./subchats.js";
import { HOST, PORT, MessageType, prependByte, SubchatError } from "./constant.js";
import type { ByteBuffer } from "./constant.js";
import { db, timestamp, documentExists } from "./db.js";

interface ClientSocket extends WebSocket {
    signingPublicKey?: Uint8Array;
}

interface PostData {
    subchat: string;
    content: any;
}

export class Relay {

    private connections: Set<ClientSocket>;

    private server: WebSocketServer;

    private cachedPosts: PostData[] = [];
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

    private async getCachedPosts(subchat: string) { // Tested Cache, works!
        const now = Date.now();

        if (!this.cachedPosts || (now - this.lastCacheTime > this.cacheTTL)) {
            console.log("Refreshing cached posts... (WAS NOT CACHED OR EXPIRED)");
            this.cachedPosts = await this.mostRecentPosts(subchat);
            this.lastCacheTime = now;
        }

        return this.cachedPosts;
    }

    private async handleCreateSubchat(sender: WebSocket, postData: ByteBuffer, requestId: ByteBuffer) : Promise<void> {
        const jsonData = JSON.parse(postData.toString());
        const subchat = new Subchat(jsonData.embadding, jsonData.name); // The embadding is for AI intergration later
        const error = await subchat.initalize(postData);
        if (error !== SubchatError.NONE) {
            sender.send(Buffer.from([MessageType.SUBCHAT_ERR, error]));
            return;
        }
        
        sender.send(Buffer.from([MessageType.ACK, ...requestId])); // Return a receipt for the creation so the user is aware
    }

    private listenForConnections() {
        this.server.on("connection", async (ws: ClientSocket) => {
            const posts = this.getCachedPosts("root"); // Default to root subchat for now
            
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


    private async mostRecentPosts(subchat: string): Promise<ByteBuffer> {
        
        let realSubchat = "root";
        if (subchat !== "root")
            realSubchat = `root-<${subchat}>`;
        
        const recentPosts = await db.collection("posts")
            .doc(realSubchat)
            .collection("posts")
            .orderBy("timestamp", "desc")
            .limit(10)
            .get();
        
        console.log(`Fetched ${recentPosts.size} recent posts from database.`, recentPosts.docs.map(doc => doc.data()));

        return prependByte(Buffer.from(JSON.stringify(recentPosts.docs.map(doc => doc.data())), "utf-8"), MessageType.POSTS);
    }

    private async handleNewPost(postData: ByteBuffer) : Promise<SubchatError> {

        /** Notation for subchats will be:
            `root-<${jsonData.subchat}>`
            root-<subchat_name>
        */

        const jsonData = JSON.parse(postData.toString());

        let subchatName : string = "root";
        if (jsonData.subchat !== "root") {
            console.log("Non-root subchat post detected.");
            subchatName = `root-<${jsonData.subchat}>`;
        }

        if (!await documentExists(`posts/${subchatName}`)) {
            console.log("Subchat does not exist:", subchatName);
            return SubchatError.NONE_EXISTANT_SUBCHAT;
        }

        
        await db.collection("posts")
        .doc(subchatName)
        .collection("posts").add({
            content: jsonData.content,
            author: jsonData.author,
            timestamp: timestamp.now()
        });
        console.log("Handling new post:", jsonData);
        
        // Here you can add logic to store the post or process it further
        //this.broadcast(JSON.stringify(jsonData), sender);
    
        return SubchatError.NONE;
    }

    private async onMessage(data: ByteBuffer, sender: WebSocket) {            

        const requestId = data.subarray(1, 5); // bytes 1-4
        const requestData = data.subarray(5); 

        console.log("Received message of type:", data[0]);
        console.log("Request ID:", requestId);
        console.log("Request Data:", new TextDecoder().decode(requestData));

        switch (data[0]) {
            case MessageType.PING:
                sender.send(Buffer.from([MessageType.PONG]));
                return;
            case MessageType.POST:
                console.log("Handling new post...");
                const error = await this.handleNewPost(requestData);
                if (error !== SubchatError.NONE) {
                    console.log("Error handling new post:", error);
                    sender.send(Buffer.from([MessageType.ERR, SubchatError.NONE_EXISTANT_SUBCHAT]));
                    return;
                }
                sender.send(Buffer.from([MessageType.ACK, ...requestId]));
                return;
            case MessageType.GET_POSTS:
                
                this.getCachedPosts(requestData.toString()).then((posts) => {
                    sender.send(posts);
                });
                return;
            case MessageType.CREATE_SUBCHAT:
                this.handleCreateSubchat(sender, requestData, requestId);
                return;
            case MessageType.HANDSHAKE: 
                console.log("Handling HANDSHAKE...");

                // requestData contains: [publicKey..., subchatString...]
                const publicKey = requestData.subarray(0, 32); // CHANGE if your key is a different length
                const subchatBytes = requestData.subarray(32);

                const subchat = new TextDecoder().decode(subchatBytes);

                // Store metadata on this client connection
                (sender as ClientSocket).signingPublicKey = publicKey;

                console.log("Client public key:", publicKey);
                console.log("Client selected subchat:", subchat);

                // Send back ACK + requestId
                sender.send(Buffer.from([MessageType.ACK, ...requestId]));

                return;

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
