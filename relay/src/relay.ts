import { WebSocketServer, WebSocket } from "ws";
import { HOST, PORT, MessageType, MessageFormat, MessageRecipient } from "./constant.js";
import type { ByteBuffer } from "./constant.js";

export class Relay {

    private connections: Set<WebSocket>;

    private server: WebSocketServer;

    
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
        
        this.listenForConnections();
    }
    


    private listenForConnections() {
        this.server.on("connection", (ws: WebSocket) => {
            this.connections.add(ws);
            ws.on("message", (data: ByteBuffer) => {
                if (!(data instanceof Buffer)) return;
                this.onMessage(data, ws);
            });
            ws.on("close", () => {
                console.log("Client disconnected");
                this.connections.delete(ws);
            });
        });
    }
    
    private onMessage(data: ByteBuffer, sender: WebSocket) {    

        if (data[0] === MessageType.PING) {
            console.log("Received PING, sending PONG");
            sender.send(Buffer.from([MessageType.PONG]));
            return;
        }

        this.broadcast(data.toString(), sender); //TESTING
        

        switch (data[0]) {
            case MessageType.PING:
                sender.send(Buffer.from([MessageType.PONG]));
                return;
            case MessageType.TEST:


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
