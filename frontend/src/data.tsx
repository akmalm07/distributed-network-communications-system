import type { JSX } from "react";
import type { Viewable } from "./images";
import { isViewable } from "./images";

export type MessageEventType = MessageEvent<Blob>;

export type DataFormat = Uint8Array;

export const enum MessageType {
    PING = 0x01,
    PONG = 0x02,
    ACK = 0x03,
    POST = 0x04,
    POSTS = 0x05,
    GET_POSTS = 0x06,
    CREATE_SUBCHAT = 0x07,
    HANDSHAKE = 0x08,

    SUBCHAT_ERR = 0x10, // Subchat related errors. Make sure to now handle the data for the frontend
    ERR = 0xFF
}

export enum Status {
    PENDING = 0,
    COMPLETED = 1,
    FAILED = 2,
    NON_EXISTENT = 3
}

export enum ViewableType  {
    PNG = "image/png",
    JPEG = "image/jpeg",
    WEBP = "image/webp",
    MP4 = "video/mp4",
    JPG = "image/jpg",
    WEBP_VIDEO = "video/webp"
}

export enum AcknoladgementType { // This is to track the acknoladgement status of the requests
    NEW_SUBCHAT = 0x01,
    NEW_POST = 0x02
} 

export async function getDataFormat(data: Blob | ArrayBuffer): Promise<Uint8Array> {
    if (data instanceof Blob) {
        return new Uint8Array(await data.arrayBuffer());
    } else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    } else {
        throw new Error("Unexpected data type: " + typeof data);
    }
}

const enum PostCommentAttribute {
    BOLD = "bold",
    ITALIC = "italic",
    UNDERLINE = "underline",
    STRIKETHROUGH = "strikethrough",
    CODE = "code"
};

interface PostComment {
    attributes: PostCommentAttribute[];
    content: string;
};

export type PostItems = PostComment | Viewable;

export interface TransferDataType {
    type: MessageType;
};

export interface Post extends TransferDataType {
    type: MessageType.POST;
    subchat: string;
    content: PostItems[];
    author: string;
    timestamp: number;
};

export interface SubChat extends TransferDataType {
    name: string;
    simularSubchats: string[];
}

export interface PingPongMessage extends TransferDataType {
    type: MessageType.PING | MessageType.PONG;
};


export function encodeData(data: TransferDataType, requestId: Uint8Array | undefined): Uint8Array {
    switch (data.type) {
        case MessageType.PING:
        case MessageType.PONG:
            return Uint8Array.of(data.type); // Should only be one byte or require requestId?
        case MessageType.POST:
            const type = data.type;
            delete (data as any).type;
            const jsonString = JSON.stringify(data);
            data.type = type; // Restore type

            const encoded = new TextEncoder().encode(jsonString);
            if (requestId instanceof Uint8Array) 
                return Uint8Array.of(type, ...requestId, ...encoded);
            else 
                return Uint8Array.of(type, ...encoded);
        default:
            throw new Error("Unsupported data type for encoding");
    }
}

export function decodeData(data: Uint8Array, type: number): TransferDataType | Post[] {
    switch (type) {
        case MessageType.PING:
            case MessageType.PONG:
                return { type };
            case MessageType.POST:
            case MessageType.POSTS:
                const jsonString = new TextDecoder().decode(data);
                return JSON.parse(jsonString);
        default:
            throw new Error("Unsupported data type for decoding");
    }
}


export function isArrayOfPosts(value: object): value is Post[] {
    return Array.isArray(value) && value.every(item =>  item !== null && typeof item === 'object' && 'content' in item && 'author' in item && 'timestamp' in item);
}

export function isPostComment(item: object): item is PostComment {
    return item && 'content' in item && 'attributes' in item;
}

// PostComment 
export function RenderContent(content: PostItems[]) : JSX.Element
{
    return (
        <>
        {content.map((item, index) => {
            if (isViewable(item)) {
                return <>
                    {item.title && <h3>{item.title}</h3>}
                    <img key={index} src={item.url as string} alt={item.title || "Viewable content"} />
                </>;
            } else if (isPostComment(item)) {
                const wrapper = ({ children }: { children: React.ReactNode }) =>
                {
                    return  item.attributes.reduceRight((acc, attr) => {
                        switch (attr) {
                            case PostCommentAttribute.BOLD:
                                return <strong>{children}</strong>;
                            case PostCommentAttribute.ITALIC:
                                return <em>{children}</em>;
                            case PostCommentAttribute.UNDERLINE:
                                return <u>{children}</u>;``
                            case PostCommentAttribute.STRIKETHROUGH:
                                return <s>{children}</s>;
                            case PostCommentAttribute.CODE:
                                return <code>{children}</code>;
                            default:
                                return acc;
                        }
                    }, children);
                }

                return wrapper({ children: <div key={index}>{item.content}</div> });
            } else {
                return <div key={index}>[Unknown content]</div>;
            }
        })}
        </>
    )
}