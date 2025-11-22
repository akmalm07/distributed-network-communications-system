import { db, timestamp } from "./db.js";
import { levenshtein } from "./levenshtein.js";

import { SubchatError } from "./constant.js";

export default class Subchat {
    private embadding: string;
    private name: string;
    private simularSubchats: Set<string>;

    constructor(embadding: string, name: string) {
        this.embadding = embadding;
        this.name = name; 
        this.simularSubchats = new Set();
    }

    public async initalize(postData: Buffer): Promise<SubchatError> {
        const subchatDoc = await db.collection("subchats").get();
        subchatDoc.forEach((doc) => {
            const name = doc.data().name;
            const distance = levenshtein(this.name, name); // String distance calculation
            if (distance <= 3 && name !== this.name) {
                this.simularSubchats.add(name);
            }
            if (this.simularSubchats.size >= 5) return SubchatError.TOO_MANY_SIMILAR;
            // Add AI intergration logic here ...
        });

        const docRef = await db.collection("subchats").add({
            embadding: this.embadding,
            name: this.name,
            simularSubchats: Array.from(this.simularSubchats),
            createdAt: timestamp.now()
        });
        
        const jsonData = JSON.parse(postData.toString());

        await docRef.collection("messages").add({ // Creating first message
            content: jsonData.content,
            author: jsonData.author,
            timestamp: timestamp.now()
        });

        return SubchatError.NONE;
    }
    // Subchats related code here
}