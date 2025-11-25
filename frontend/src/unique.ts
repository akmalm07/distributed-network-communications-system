
export default class UniqueIDMap<T> {
    private items = new Map<number, T>();
    private used = new Set<number>();
    private free: number[] = [];
    private readonly size: number;

    constructor(size: number = 4) {
        this.size = size;
        this.fillFreeList(10);
    }

    public set(item: T): number {
        if (this.free.length === 0) {
            this.fillFreeList(10);
        }

        const id = this.free.pop()!;
        this.used.add(id);
        this.items.set(id, item);

        return id;
    }

    public change(id: number | Uint8Array, item: T): boolean {
        if (id instanceof Uint8Array) {
            let numId = 0;
            for (let i = 0; i < id.length; i++)
                numId = (numId << 8) | id[i];
            this.items.set(numId, item);
            return true;
        }
        if (!this.used.has(id)) return false;

        this.items.set(id, item);
        return true;
    }

    public get(id: number | Uint8Array): T | undefined {
        if (id instanceof Uint8Array) {
            let numId = 0;
            for (let i = 0; i < id.length; i++)
                numId = (numId << 8) | id[i];
            return this.get(numId);
        }
        return this.items.get(id);
    }

    public delete(id: number | Uint8Array): boolean {
        if (id instanceof Uint8Array) {
            let numId = 0;
            for (let i = 0; i < id.length; i++)
                numId = (numId << 8) | id[i];
            
            return this.delete(numId);
    }

    // number implementation
    if (!this.used.has(id)) return false;

    this.used.delete(id);
    this.items.delete(id);
    this.free.push(id);

    return true;
}


    private fillFreeList(count: number) {
        const min = 10 ** (this.size - 1);
        const max = 10 ** this.size - 1;

        while (count > 0) {
            const id = Math.floor(Math.random() * (max - min + 1)) + min;

            if (!this.used.has(id) && !this.free.includes(id)) {
                this.free.push(id);
                count--;
            }
        }
    }
}
