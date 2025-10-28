export type MessageEventType = MessageEvent<Blob>;

export type DataFormat = Uint8Array;

export async function getDataFormat(data: Blob | ArrayBuffer): Promise<Uint8Array> {
    if (data instanceof Blob) {
        return new Uint8Array(await data.arrayBuffer());
    } else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    } else {
        throw new Error("Unexpected data type: " + typeof data);
    }}