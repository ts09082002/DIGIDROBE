#!/usr/bin/env node
/**
 * Pre-build check for Google Sign-In on Android release APKs.
 *
 * DEVELOPER_ERROR (code 10) happens when the APK signing certificate SHA-1
 * is not registered in Firebase. Run before every EAS APK/AAB build.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GOOGLE_SERVICES = path.join(ROOT, 'google-services.json');

function readRegisteredSha1Hashes() {
    if (!fs.existsSync(GOOGLE_SERVICES)) {
        console.error('\n[Google Sign-In] ERROR: google-services.json not found at mobile/google-services.json\n');
        process.exit(1);
    }

    const json = JSON.parse(fs.readFileSync(GOOGLE_SERVICES, 'utf8'));
    const client = json.client?.[0];
    const packageName = client?.client_info?.android_client_info?.package_name;
    const hashes = (client?.oauth_client ?? [])
        .filter((entry) => entry.client_type === 1 && entry.android_info?.certificate_hash)
        .map((entry) => entry.android_info.certificate_hash.toLowerCase());

    return { packageName, hashes };
}

function main() {
    const { packageName, hashes } = readRegisteredSha1Hashes();

    console.log('\n=== Google Sign-In Android pre-build check ===');
    console.log(`Package: ${packageName ?? '(unknown)'}`);
    console.log(`SHA-1 fingerprints in google-services.json: ${hashes.length}`);

    hashes.forEach((hash, index) => {
        console.log(`  ${index + 1}. ${hash}`);
    });

    console.log(`
Before building a release/preview APK, ensure your EAS keystore SHA-1 is listed above.

If Google Sign-In shows DEVELOPER_ERROR on the installed APK:
  1. Run:  eas credentials -p android
  2. Open "Keystore" → copy SHA-1 and SHA-256
  3. Firebase Console → Project Settings → Android app (${packageName})
     → Add fingerprint (paste both SHA-1 and SHA-256)
  4. Re-download google-services.json and replace mobile/google-services.json
  5. Rebuild: eas build -p android --profile preview

Also register your local debug SHA-1 if testing with expo run:android.
===\n`);
}

main();
