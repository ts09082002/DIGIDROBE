/**
 * Rotation Verification Script
 * 
 * Checks if the current FIREBASE_PRIVATE_KEY contains the old, compromised key's signature.
 * 
 * Run: node backend/scripts/verify-rotation.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const oldKeyPart = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDMu7Dkk3aJrzBo";
const currentKey = process.env.FIREBASE_PRIVATE_KEY || "";

console.log('--- Credential Rotation Check ---');

if (currentKey.includes(oldKeyPart)) {
  console.error('❌ DANGER: You are still using the COMPROMISED private key found in git history.');
  console.error('Please generate a NEW key in Firebase Console and update your backend/.env file.');
  process.exit(1);
} else if (currentKey === "") {
  console.warn('⚠️ WARNING: No FIREBASE_PRIVATE_KEY found in backend/.env.');
} else {
  console.log('✅ PASS: Current private key does not match the compromised version.');
  console.log('Make sure you have also added .env to your .gitignore to avoid future leaks.');
}
