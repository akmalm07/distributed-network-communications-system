import { generateNonce, generateKeyPair, generateSigningKeyPair, signMessage, verifySignedMessage, encryptMessage, decryptMessage } from "../src/crypto.ts";

async function test(): Promise<boolean> {
    console.log("=== Starting TweetNaCl Crypto Tests ===");

    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const charlie = generateKeyPair();

    // Encryption / Decryption
    const { ciphertext, nonce } = encryptMessage("Hello Bob!", bob.publicKey, alice.privateKey);
    const decrypted = decryptMessage(ciphertext, nonce, alice.publicKey, bob.privateKey);
    if (decrypted !== "Hello Bob!") {
        console.error("Encryption/Decryption failed");
        return false;
    }

    // Wrong key test
    try {
        decryptMessage(ciphertext, nonce, charlie.publicKey, alice.privateKey);
        console.error("Decryption should have failed with wrong keys!");
        return false;
    } catch {
        console.log("Wrong key decryption correctly failed");
    }

    // Signing / Verification
    const signPair = generateSigningKeyPair();
    const signed = signMessage("Sign me!", signPair.privateKey);
    const verified = verifySignedMessage(signed, signPair.publicKey);
    if (verified !== "Sign me!") {
        console.error("Signing/Verification failed");
        return false;
    }

    // Tampered signature
    const tampered = new Uint8Array(signed);
    tampered[0] ^= 0xff;
    const tamperedVerify = verifySignedMessage(tampered, signPair.publicKey);
    if (tamperedVerify !== null) {
        console.error("Tampered signature incorrectly verified");
        return false;
    } else {
        console.log("Tampered signature correctly rejected");
    }

    console.log("All TweetNaCl crypto tests passed!");
    return true;
}

test();
