export const APP_NAME = "Destributed Network Communications";

export const VERSION = "1.0.0";

export const REGIONS = [
    "us-east",
    "us-west"
];

export const DOMAIN = "localhost.com";

export const BACKEND_URL = `https://${DOMAIN}/api`;

export const RELAY_SERVERS = [
    "ws://localhost:8080",
    /* PRODUCTION SERVERS
    `wss://relay-alpha.${DOMAIN}`,
    `wss://relay-${REGIONS[0]}.${DOMAIN}`,
    `wss://relay-${REGIONS[1]}.${DOMAIN}`,
    `wss://relay-${REGIONS[2]}.${DOMAIN}`
    */
];
export const DEFAULT_TIMEOUT = 5000; // in milliseconds
export const DEFAULT_RELAY = RELAY_SERVERS[0];


export const enum MessageType {
    PING = 0x01,
    PONG = 0x02,
    DATA = 0x03,
    ACK = 0x04
}