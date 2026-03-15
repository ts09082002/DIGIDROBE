const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Try to load service account if it exists
// Assuming the backend has firebase configuration
const firebaseConfigPath = path.join(__dirname, 'backend', 'src', 'firebase-admin.ts');

async function debugFirestore() {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'; // Just in case, but user seems to use real firestore or another setup
    
    // We'll use the same logic as the backend
    try {
        const { getFirebaseAdmin } = require('./backend/dist/firebase-admin');
        const db = getFirebaseAdmin().firestore();
        
        console.log('--- Collection: wardrobeItems ---');
        const snapshot = await db.collection('wardrobeItems').limit(10).get();
        if (snapshot.empty) {
            console.log('No items found in wardrobeItems.');
        } else {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`ID: ${doc.id} | Name: ${data.name} | Category: ${data.category} | UserId: ${data.userId}`);
            });
        }

        console.log('\n--- Collection: outfits_calendar ---');
        const outfits = await db.collection('outfits_calendar').limit(10).get();
        if (outfits.empty) {
            console.log('No items found in outfits_calendar.');
        } else {
            outfits.docs.forEach(doc => {
                const data = doc.data();
                console.log(`ID: ${doc.id} | Date: ${data.date} | UserId: ${data.userId}`);
            });
        }
    } catch (e) {
        console.error('Error debugging firestore:', e.message);
    }
}

debugFirestore();
