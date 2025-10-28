import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

export function generateKeyPair() {
    const keyPair = nacl.box.keyPair(); // public/private key
    return { publicKey: keyPair.publicKey, privateKey: keyPair.secretKey };
}

export function generateNonce() {
    return nacl.randomBytes(nacl.box.nonceLength);
}

export function toStringKey(key: Uint8Array): string {
    return Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function fromStringKey(keyStr: string): Uint8Array {
    const bytes = new Uint8Array(keyStr.length / 2);
    for (let i = 0; i < keyStr.length; i += 2) {
        bytes[i / 2] = parseInt(keyStr.substr(i, 2), 16);
    }
    return bytes;
}

export function encryptMessage(
    plaintext: string,
    recipientPub: Uint8Array,
    senderPriv: Uint8Array
): { ciphertext: Uint8Array; nonce: Uint8Array } {
    const nonce = generateNonce();
    const messageBytes = naclUtil.decodeUTF8(plaintext);
    const ciphertext = nacl.box(messageBytes, nonce, recipientPub, senderPriv);
    return { ciphertext, nonce };
}

export function decryptMessage(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    senderPub: Uint8Array,
    recipientPriv: Uint8Array
): string {
    const decrypted = nacl.box.open(ciphertext, nonce, senderPub, recipientPriv);
    if (!decrypted) throw new Error("Decryption failed");
    return naclUtil.encodeUTF8(decrypted);
}


export function generateSigningKeyPair() {
    const keyPair = nacl.sign.keyPair();
    return { publicKey: keyPair.publicKey, privateKey: keyPair.secretKey };
}

export function signMessage(message: string, privateKey: Uint8Array) {
    const messageBytes = naclUtil.decodeUTF8(message);
    return nacl.sign(messageBytes, privateKey);
}

export function verifySignedMessage(signed: Uint8Array, publicKey: Uint8Array) {
    const verified = nacl.sign.open(signed, publicKey);
    if (!verified) return null;
    return naclUtil.encodeUTF8(verified);
}

// Generate a random, human-readable name

import { faker } from '@faker-js/faker';


export function generateRandomName(): string {
    const adj = faker.word.adjective();
    const animal = faker.animal.type();

    const seperator = faker.helpers.arrayElement(['-', '_', '']);

    const number = Math.floor(Math.random() * 1000);
    return `${adj}${seperator}${animal}${number}`;
}