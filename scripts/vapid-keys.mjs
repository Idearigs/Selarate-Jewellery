import webpush from "web-push";

/**
 * Mints a VAPID key pair for Web Push.
 *
 * Run once per deployment and keep the pair stable: the public key is baked
 * into every subscription the browsers have already stored, so rotating it
 * silently invalidates every registered device and the owner's phone simply
 * stops ringing with no error anywhere.
 */
const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
Add these to .env — the private key is a signing credential, treat it like
AUTH_SECRET and never commit it.

VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:studio@example.com
`);
