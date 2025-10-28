import { RELAY_SERVERS } from "./constant.ts";


async function runWorker(id: string): Promise<{ id: string; result: number }> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./workers/pingpongtest.ts', import.meta.url), { type: 'module' });
        worker.postMessage(id);

        console.log("Worker started for", id);

        worker.onmessage = (event) => {
            console.log("Worker result for", id, ":", event.data);
            resolve({ id, result: event.data });
            worker.terminate(); // cleanup
        };
        worker.onerror = (err) => { console.error(err); reject(err); };

    });
}

export async function connect(closestServer: string | null = null): Promise<[WebSocket, string]> {

    let bestServer: string = closestServer || "";

    if (!closestServer) {

        console.log("Size of relay servers to test:", RELAY_SERVERS.length);

        const results = await Promise.all(
            RELAY_SERVERS.map(async (url) => {
            console.log(`Testing relay server: ${url}`);
            return await runWorker(url); // assumes runWorker returns { id, result }
            })
        );
        console.log("Completed ping tests.");

        console.log("Ping results:", results);

        const best = results.reduce((prev, curr) =>
            curr.result < prev.result ? curr : prev
        );

        console.log("Best relay:", best);
        bestServer = best.id;
    }

    return new Promise((resolve, reject) => {
        console.log("Connecting to best relay server:", bestServer);
        const ws = new WebSocket(bestServer); // assuming `id` is the URL
        ws.binaryType = "arraybuffer";
        ws.addEventListener("open", () => { resolve([ws, bestServer]); });
        ws.addEventListener("error", (err) => reject(err));
    });
}


export async function disconnect(ws: WebSocket): Promise<void> {
    return new Promise((resolve) => {
        ws.addEventListener("close", () => resolve());
        ws.close();
    });
}
