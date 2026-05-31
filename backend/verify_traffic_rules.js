const admin = require('firebase-admin');
const fs = require('fs');

async function checkTrafficRules() {
    try {
        const db = admin.firestore();
        const snapshot = await db.collection('trafficRules').get();
        console.log(`Found ${snapshot.size} traffic rules in Firestore.`);
        if (snapshot.empty) {
            console.log("trafficRules collection is empty.");
        } else {
            snapshot.forEach(doc => {
                console.log(doc.id, '=>', doc.data());
            });
        }
    } catch (error) {
        console.error("Error fetching traffic rules:", error);
    }
}

// Check if credentials exist
const serviceAccountPath = 'd:/Drive_Legal_Ai/backend/credentials/firebase-service-account.json';
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    checkTrafficRules();
} else {
    console.error("Firebase service account credentials not found. Make sure you are pointing to the correct online DB.");
}
