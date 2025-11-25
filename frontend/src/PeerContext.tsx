// PeerContext.tsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Peer } from "./peer";

type PeerContextType = {
    peer: Peer | null;
    subchat: string | null;
};

const PeerContext = createContext<PeerContextType>({
    peer: null,
    subchat: "root",
});

export const usePeer = () => useContext(PeerContext);


export const PeerProvider = ({ children }: { children: ReactNode }) => {
    const peerRef = useRef<Peer | null>(null);
    const [subchat, setSubchat] = useState<string | null>("root");
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);

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
        <PeerContext.Provider value={{ peer: peerRef.current!, subchat: subchat }}>
            {children}
        </PeerContext.Provider>
    );
};
