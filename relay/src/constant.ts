export const PORT = 8080;
export const HOST = "localhost";

export type ByteBuffer = Buffer;

export const enum MessageType {
    PING = 0x01,
    PONG = 0x02,
    ACK = 0x03,
    POST = 0x04,
    POSTS = 0x05,
    GET_POSTS = 0x06
}

// export const enum MessageRecipient {
//     ALL = 0x01,
//     STORE = 0x02,
//     SINGLE = 0x03
// }

// export const enum MessageFormat {
//     TXT = 0x01,
//     BIN = 0x02,
//     JSON = 0x03,
//     PNG = 0x04,
//     JPG = 0x05,
//     GIF = 0x06,
//     WEBP = 0x07,
//     MP4 = 0x08,
// }

export function prependByte(buffer: Buffer, byteValue: number): Buffer {
    const newBuffer = new Buffer(buffer.byteLength + 1);

    newBuffer[0] = byteValue; // first byte
    newBuffer.set(buffer, 1); // copy old buffer starting at offset 1
    
    return newBuffer;
}
