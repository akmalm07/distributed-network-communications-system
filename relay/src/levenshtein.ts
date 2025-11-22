function isArrayOfNumbers(arr: any[]): arr is number[] {
    return arr.every(item => typeof item === 'number');
}

export function levenshtein(a: string, b: string): number {
    // Ensure 'a' is the longer string for efficiency
    if (a.length < b.length) [a, b] = [b, a];

    // Explicitly typed arrays (prevents undefined problems)
    const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
    const curr: number[] = Array(b.length + 1).fill(0);

    if (!(isArrayOfNumbers(prev) && isArrayOfNumbers(curr))) {
        throw new Error("Invalid input");
    }

    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;

        for (let j = 1; j <= b.length; j++) {
            const charA = a.charAt(i - 1);
            const charB = b.charAt(j - 1);
            const cost = charA === charB ? 0 : 1;
            
            // Typescript compains that curr[j], prev[j], etc might be undefined

            const insertion = curr[j - 1] as number + 1;
            const deletion = prev[j] as number + 1;
            const substitution = prev[j - 1] as number + cost;

            curr[j] = Math.min(insertion, deletion, substitution);
        }

        // Copy current row into previous row
        for (let k = 0; k <= b.length; k++) {
            prev[k] = curr[k] as number;
        }
    }

    return prev[b.length] as number;
}
