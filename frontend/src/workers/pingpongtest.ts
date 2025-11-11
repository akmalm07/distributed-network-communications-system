import { MessageType } from "../data.ts";
import type { MessageEventType } from "../data.ts";
import { getDataFormat } from "../data.ts";

async function pingServer(url: string): Promise<number> {
    console.log("Pinging server:", url);
    const start = performance.now();

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);

        ws.onopen = () => {
            ws.send(Uint8Array.of(MessageType.PING));
        };

        ws.onmessage = async (event : MessageEventType) => {

            const blob = await getDataFormat(event.data);

            const data = new Uint8Array(blob);
            
            if (data[0] === MessageType.PONG) {
                const latency = performance.now() - start;
                ws.close();
                resolve(latency);
            }
        };

        ws.onerror = (err) => {
            reject(err);
        };
    });
}

self.onmessage = async (event) => {
    const url: string = event.data;
    try {
        const latency = await pingServer(url);
        self.postMessage(latency);
    } catch (error) {
        self.postMessage(-1);
    }
};