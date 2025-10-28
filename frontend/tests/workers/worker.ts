// Each worker will receive some data and process it independently

function heavyComputation(num: number): number {
    // Example: simulate work by summing numbers
    let sum = 0;
    for (let i = 0; i < num; i++) {
        sum += Math.sqrt(i);
    }
    return sum;
}


self.onmessage = (event) => {
  const { id, data } = event.data;

  // Simulate a CPU-heavy operation
  const result = heavyComputation(data);

  // Send back the result
  postMessage({ id, result });
};

