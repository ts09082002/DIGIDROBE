require('dotenv').config();
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

async function checkWardrobe() {
    const collections = ['wardrobeItems', 'outfits_calendar', 'notifications'];
    for (const collName of collections) {
        const snapshot = await db.collection(collName).get();
        console.log(`\nCollection: ${collName} (${snapshot.size} items)`);
        
        const users = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const uid = data.userId || 'MISSING';
            users[uid] = (users[uid] || 0) + 1;
        });
        console.log('User Distribution:', JSON.stringify(users, null, 2));
    }
}

checkWardrobe().catch(console.error);
