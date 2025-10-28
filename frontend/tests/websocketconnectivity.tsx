// PeerContext.tsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Peer } from "../src/peer";

type PeerContextType = {
    peer: Peer | null;
};

const PeerContext = createContext<PeerContextType>({
    peer: null,
});

export const usePeer = () => useContext(PeerContext);


export const PeerProvider = ({ children }: { children: ReactNode }) => {
    const peerRef = useRef<Peer | null>(null);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    const [messageGot, setMessageGot] = useState<string>("Lol"); // TESTING

    useEffect(() => {
        const initializePeer = async () => {

            if (peerRef.current) return;

            const peer = new Peer();
            peerRef.current = peer;
            setLoading(true);

            try {
                const success : boolean = await peer.initialize();
                if (success) {
                    setConnected(true);
                    
                    peerRef.current.setupConnectionHandlers((data: Uint8Array) => {
                        const text = new TextDecoder().decode(data);
                        console.log("Data received in PeerContext:", messageGot);
                        setMessageGot(prev => prev + text); // TESTING
                    });
                } else {
                    console.error("Failed to initialize peer.");
                    setConnected(false);
                }
            } catch (err) {
                console.error("Error initializing peer:", err);
                setConnected(false);
            } finally {
                setLoading(false);
            }
        };

        initializePeer();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">
                <h1 className="text-2xl font-bold">Connecting to relay server...</h1>
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">
                <h1 className="text-2xl font-bold">Could not connect to relay server.</h1>
            </div>
        );
    }


    return (
        <PeerContext.Provider value={{ peer: peerRef.current! }}>
            {children}
            <button onClick={() => {
                if (peerRef.current!.connected()) {
                    console.log("Sending test message from PeerContext...");;
                    peerRef.current!.sendDataBufferRaw(new TextEncoder().encode(messageGot));
                }
            }}>Send Test Message</button>
            <p>{messageGot}</p> {/* TESTING */}
        </PeerContext.Provider>
    );
};
