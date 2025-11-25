import { connect, disconnect } from "./connection.ts";
import { generateKeyPair, generateSigningKeyPair, generateRandomName, toStringKey, fromStringKey } from "./crypto.ts";
import type { MessageEventType, DataFormat } from "./data";
import { getDataFormat, encodeData, decodeData, MessageType, isArrayOfPosts, Status } from "./data";
import UniqueIDMap from "./unique";
import type { TransferDataType, Post } from "./data";

export class Peer {

    private connection!: WebSocket;

    // private privateKey: Uint8Array;
    // private publicKey: Uint8Array;

    private signingPrivateKey: Uint8Array;
    private signingPublicKey: Uint8Array;

    private name: string;

    private favoriteSubchats: string[] = [];

    private saveRecentPostsPromise: Promise<void> | null = null;

    private requestMap: UniqueIDMap<{ data: TransferDataType, status: Status }> = new UniqueIDMap();

    constructor() {
        this.name = "Unnamed Peer";
        // this.privateKey = new Uint8Array();
        // this.publicKey = new Uint8Array();
        this.signingPrivateKey = new Uint8Array();
        this.signingPublicKey = new Uint8Array();
    }

    async initialize(subchat: string) : Promise<boolean> {
        
        if (localStorage.getItem("signingPublicKey") && localStorage.getItem("signingPrivateKey") && localStorage.getItem("peerName")) {
            
            console.log("Found existing peer keys in localStorage.");
            
            const pubKeyHex = localStorage.getItem("signingPublicKey")!;
            const privKeyHex = localStorage.getItem("signingPrivateKey")!;
            this.signingPublicKey = fromStringKey(pubKeyHex);
            this.signingPrivateKey = fromStringKey(privKeyHex);
            this.name = localStorage.getItem("peerName")!;
            console.log("Peer name:", this.name);
            
            if (localStorage.getItem("favoriteSubchats"))
                this.favoriteSubchats = JSON.parse(localStorage.getItem("favoriteSubchats")!) as string[];
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

        this.connection.send(Uint8Array.of(MessageType.HANDSHAKE, ...this.signingPublicKey, ...new TextEncoder().encode(subchat)));
        
        if (!this.favoriteSubchats.includes(subchat) && subchat !== "root") {
            this.favoriteSubchats.push(subchat);
            localStorage.setItem("favoriteSubchats", JSON.stringify(this.favoriteSubchats));
        }

        return true;
    }

    public setupConnectionHandlers(callback: (data: DataFormat) => void) {
        this.connection.onmessage = async (event: MessageEventType) => {
            const data = await getDataFormat(event.data);
            callback(data);
        }
    }

    public addFavoriteSubchat(subchatId: string): void {
        if (!this.favoriteSubchats.includes(subchatId)) {
            this.favoriteSubchats.push(subchatId);
            localStorage.setItem("favoriteSubchats", JSON.stringify(this.favoriteSubchats));
        }
    }

    public removeFavoriteSubchat(subchatId: string): void {
        this.favoriteSubchats = this.favoriteSubchats.filter(id => id !== subchatId);
        localStorage.setItem("favoriteSubchats", JSON.stringify(this.favoriteSubchats));
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

    public sendData(type: TransferDataType): number | undefined {
        if (this.connected()) {
            const requestId = this.requestMap.set({ data: type, status: Status.PENDING }) as number;
            const data = encodeData(type, this.getDigitArray(requestId));
            this.connection.send(data);
            return requestId;
        }
        throw new Error("Not connected to relay server"); // Debugging purposes only
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

    private getDigitArray(id: number): Uint8Array {
        const digits = [];
        while (id >= 10) {
            digits.push(id % 10);
            id = (id / 10) | 0; // fast floor
        }
        digits.push(id);
        digits.reverse();
        return new Uint8Array(digits);
    }

    private finalize(id: Uint8Array): void {
        let idNum = 0;
        for (let i = 0; i < id.length; i++)
            idNum = (idNum << 8) | id[i];
        const req = this.requestMap.get(idNum);
        if (!req) return;

        this.requestMap.change(idNum, {
            data: req.data,
            status: Status.COMPLETED
        });

    }

    public async getStatus(id: number): Promise<Status> {
        const req = this.requestMap.get(id);
        if (!req) return Status.NON_EXISTENT;

        if (req.status === Status.PENDING) {
            return new Promise<Status>((resolve) => {
                const interval = setInterval(() => {
                    const updated = this.requestMap.get(id);

                    if (!updated) {
                        clearInterval(interval);
                        resolve(Status.NON_EXISTENT);
                        return;
                    }

                    if (updated.status !== Status.PENDING) {
                        clearInterval(interval);
                        this.requestMap.delete(id);
                        resolve(updated.status);
                    }
                }, 100);
            });
        }

        this.requestMap.delete(id);
        return req.status;
    }


    private async onMessage(event: MessageEventType) {

        console.log("Received message in Peer:", event, "type:", event.data instanceof ArrayBuffer);

        let buffer = await getDataFormat(event.data);
        const messageByte = buffer[0];
        buffer = buffer.slice(1); 

        switch (messageByte) {
            
            case MessageType.PONG:
                console.log("Received PONG");
                break;
                
            case MessageType.POSTS:
                console.log("Received POSTS data");
                this.saveRecentPostsPromise = (async () => {
                    const decoded = decodeData(buffer, MessageType.POSTS);
                    console.log("Decoded recent posts:", decoded);
                    if (isArrayOfPosts(decoded))
                        sessionStorage.setItem("recentPosts", JSON.stringify(decoded));
                })();
                return;

            case MessageType.ACK:
                console.log("Received ACK from server");
                const messageId = buffer.slice(1, 5); // bytes 1-4 are the request ID
                const request = this.requestMap.get(messageId); // Possibly early delete of the messageId
                if (request) {
                    this.finalize(messageId);
                }
                    return;
                    // Debugging purposes only

                    /*case MessageType.POST:
                    const decoded = decodeData(buffer, MessageType.POST);
                    console.log("Received POST data:", decoded);
                    break;*/
                    /*case MessageType.PING: 
                        this.connection.send(Uint8Array.of(MessageType.PONG)); 
                        break;*/
                    default:
                        console.log("Unknown message type received:", new TextDecoder().decode(buffer));
                        
        }

        //await this.saveRecentPostsPromise;
    }

    public async disconnect(): Promise<void> {
        if (this.connection) {
            await disconnect(this.connection);
            console.log("Disconnected from relay server");
        }
    }

    /* public sendDataBufferRaw(data: Uint8Array): void {
    if (this.connected()) {
        console.log("Sending data from Peer:", new TextDecoder().decode(data));
        this.connection.send(data);
    }
    }*/
}