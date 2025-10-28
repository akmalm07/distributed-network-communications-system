

function runWorker(id: number, data: number): Promise<{ id: number; result: number }> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./workers/worker.ts', import.meta.url), { type: 'module' });
        worker.postMessage({ id, data: data });

        worker.onmessage = (event) => {
            resolve(event.data);
            worker.terminate(); // cleanup
        };

        worker.onerror = (err) => reject(err);
    });
}


async function runWorkersConcurrently(numWorkers: number): Promise<void> {
    const promises: Promise<{ id: number; result: number }>[] = [];
    for (let i = 0; i < numWorkers; i++) {
        promises.push(runWorker(i, i));
    }

    const results: { id: number; result: number }[] = await Promise.all(promises);
    console.log(results);
}

runWorkersConcurrently(4);