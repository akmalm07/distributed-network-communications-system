import { connect, disconnect } from "./connection.ts";
import { generateKeyPair, generateSigningKeyPair, generateRandomName, toStringKey, fromStringKey } from "./crypto.ts";
import type { MessageEventType, DataFormat } from "./data";
import { getDataFormat, encodeData, decodeData, MessageType, isArrayOfPosts } from "./data";

import type { TransferDataType, Post } from "./data";

export class Peer {

    private connection!: WebSocket;

    // private privateKey: Uint8Array;
    // private publicKey: Uint8Array;

    private signingPrivateKey: Uint8Array;
    private signingPublicKey: Uint8Array;

    private name: string;

    private saveRecentPostsPromise: Promise<void> | null = null;

    constructor() {
        this.name = "Unnamed Peer";
        // this.privateKey = new Uint8Array();
        // this.publicKey = new Uint8Array();
        this.signingPrivateKey = new Uint8Array();
        this.signingPublicKey = new Uint8Array();

    }

    async initialize() : Promise<boolean> {
        
        if (localStorage.getItem("signingPublicKey") && localStorage.getItem("signingPrivateKey") && localStorage.getItem("peerName")) {
            
            console.log("Found existing peer keys in localStorage.");
            
            const pubKeyHex = localStorage.getItem("signingPublicKey")!;
            const privKeyHex = localStorage.getItem("signingPrivateKey")!;
            this.signingPublicKey = fromStringKey(pubKeyHex);
            this.signingPrivateKey = fromStringKey(privKeyHex);
            this.name = localStorage.getItem("peerName")!;
            console.log("Peer name:", this.name);
            
        } else {
        console.log("Initializing new peer...");

        const { publicKey, privateKey } = generateSigningKeyPair();

        this.signingPrivateKey = privateKey;
        this.signingPublicKey = publicKey;

        localStorage.setItem("signingPublicKey", toStringKey(this.signingPublicKey));
        localStorage.setItem("signingPrivateKey", toStringKey(this.signingPrivateKey));
        
        this.name = generateRandomName();
        localStorage.setItem("peerName", this.name);

        console.log("Generated peer name:", this.name);

        // this.publicKey = publicKey;
        // this.privateKey = privateKey;   
        }        
        
        try {
            console.log("Attempting to connect to relay server...");

            let closestServer: string = localStorage.getItem("closestRelayServer") || "";

            console.log("Closest relay server from localStorage:", closestServer);

            if (!closestServer) {
                [ this.connection, closestServer ] = await connect(null, this.onMessage);
                console.log("Storing closest relay server to localStorage:", closestServer);
                localStorage.setItem("closestRelayServer", closestServer);
            } else {
                this.connection = (await connect(closestServer, this.onMessage))[0];
            }
        } catch (error) {
            console.error("Failed to connect:", error);
            return false;
        }
        return true;
    }

    public setupConnectionHandlers(callback: (data: DataFormat) => void) {
        this.connection.onmessage = async (event: MessageEventType) => {
            const data = await getDataFormat(event.data);
            callback(data);
        }
    }

    public connected(): boolean {
        return this.connection && this.connection.readyState === WebSocket.OPEN;
    }

    public getName(): string {
        return this.name;
    }

    public getSigningPublicKey(): Uint8Array {
        return this.signingPublicKey;
    }

    /* public sendDataBufferRaw(data: Uint8Array): void {
        if (this.connected()) {
            console.log("Sending data from Peer:", new TextDecoder().decode(data));
            this.connection.send(data);
        }
    }*/

    public sendData(type: TransferDataType): void {
        if (this.connected()) {
            const data = encodeData(type);
            this.connection.send(data);
        }
    }

    public async getRecentPosts(): Promise<Post[]> {
        if (this.saveRecentPostsPromise) {
            try {
                await Promise.race([
                    this.saveRecentPostsPromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout waiting for saveRecentPosts")), 1000)
                    ),
                ]);
            } catch (e) {
                console.warn(e);
                this.connection.send(Uint8Array.of(MessageType.GET_POSTS));
                await this.saveRecentPostsPromise;
            }
        }
        
        const recentPosts = sessionStorage.getItem("recentPosts");
        return recentPosts ? JSON.parse(recentPosts) : [];
    }


private async onMessage(event: MessageEventType) {

    console.log("Received message in Peer:", event, "type:", event.data instanceof ArrayBuffer);

    let buffer = await getDataFormat(event.data);
    const messageByte = buffer[0];
    buffer = buffer.slice(1); 

    switch (messageByte) {
        case MessageType.PING: 
            this.connection.send(Uint8Array.of(MessageType.PONG)); 
            break;

        case MessageType.PONG:
            console.log("Received PONG");
            break;

        case MessageType.POST:
            const decoded = decodeData(buffer, MessageType.POST);
            console.log("Received POST data:", decoded);
            break;

        case MessageType.POSTS:
            console.log("Received POSTS data");
            this.saveRecentPostsPromise = (async () => {
            const decoded = decodeData(buffer, MessageType.POSTS);
                console.log("Decoded recent posts:", decoded);
                if (isArrayOfPosts(decoded))
                    sessionStorage.setItem("recentPosts", JSON.stringify(decoded));
                
            })();
            break;

        default:
            console.log("Unknown message type received:", buffer);
    }

    //await this.saveRecentPostsPromise;
}

    public async disconnect(): Promise<void> {
        if (this.connection) {
            await disconnect(this.connection);
            console.log("Disconnected from relay server");
        }
    }
}