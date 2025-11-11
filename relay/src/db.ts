import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, applicationDefault } from "firebase-admin/app";


const app = initializeApp({
  credential: applicationDefault(),
});

export const db = getFirestore("distributed-networking-system-db");

export const timestamp = Timestamp;