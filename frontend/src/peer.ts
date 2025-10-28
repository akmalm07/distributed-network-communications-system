import { connect, disconnect } from "./connection.ts";
import { generateKeyPair, generateSigningKeyPair, generateRandomName, toStringKey, fromStringKey } from "./crypto.ts";
import type { MessageEventType, DataFormat } from "./data.ts";
import { getDataFormat } from "./data.ts";

export class Peer {

    private connection!: WebSocket;

    // private privateKey: Uint8Array;
    // private publicKey: Uint8Array;

    private signingPrivateKey: Uint8Array;
    private signingPublicKey: Uint8Array;

    private name: string;

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
                [ this.connection, closestServer ] = await connect();
                console.log("Storing closest relay server to localStorage:", closestServer);
                localStorage.setItem("closestRelayServer", closestServer);
            } else {
                this.connection = (await connect(closestServer))[0];
            }

            console.log("Connected to relay server");

            

            return true;
        } catch (error) {
            console.error("Failed to connect:", error);
            return false;
        }
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

    public sendDataBufferRaw(data: Uint8Array): void {
        if (this.connected()) {
            console.log("Sending data from Peer:", new TextDecoder().decode(data));
            this.connection.send(data);
        }
    }

    public async disconnect(): Promise<void> {
        if (this.connection) {
            await disconnect(this.connection);
            console.log("Disconnected from relay server");
        }
    }
}