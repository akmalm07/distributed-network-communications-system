import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, applicationDefault } from "firebase-admin/app";


const app = initializeApp({
    credential: applicationDefault()
});

export const db = getFirestore("distributed-networking-system-db");

export const timestamp = Timestamp;


export async function collectionExists(collectionPath : string): Promise<boolean> {
    const collectionRef = db.collection(collectionPath);
    try {
      // Query for a single document to check if the collection is empty
      const snapshot = await collectionRef.limit(1).get();
      return !snapshot.empty; 
    } catch (error) {
      console.error("Error checking collection existence:", error);
      return false;
    }
}

export async function documentExists(docPath: string): Promise<boolean> {
      try {
          const docRef = db.doc(docPath);
          const snapshot = await docRef.get();
          return snapshot.exists;
      } catch (error) {
          console.error("Error checking document existence:", error);
          return false;
      }
}
