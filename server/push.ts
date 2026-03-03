import admin from "firebase-admin";
import { resolve } from "path";

let messaging: admin.messaging.Messaging | null = null;

export function initFirebase(): boolean {
  if (messaging) return true;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credentialsJson = process.env.FIREBASE_CREDENTIALS_JSON;

  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      admin.initializeApp({ credential: admin.credential.cert(credentials) });
      messaging = admin.messaging();
      console.log("Firebase: Initialized from FIREBASE_CREDENTIALS_JSON");
      return true;
    } catch (e) {
      console.warn("Firebase: Invalid FIREBASE_CREDENTIALS_JSON, push disabled:", e);
      return false;
    }
  }

  if (credentialsPath) {
    try {
      const absPath = resolve(process.cwd(), credentialsPath);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = absPath;
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      messaging = admin.messaging();
      console.log("Firebase: Initialized from", absPath);
      return true;
    } catch (e) {
      console.warn("Firebase: Failed to initialize with GOOGLE_APPLICATION_CREDENTIALS, push disabled:", e);
      return false;
    }
  }

  console.warn("Firebase: No credentials (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CREDENTIALS_JSON), push disabled");
  return false;
}

export function isPushEnabled(): boolean {
  return messaging != null;
}

export async function sendPushToAll(
  tokens: string[],
  title: string,
  body: string
): Promise<void> {
  if (!messaging || tokens.length === 0) return;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title,
      body,
    },
    android: {
      priority: "high",
      notification: {
        channelId: "downdetect_alerts",
        priority: "high" as const,
      },
    },
  };

  try {
    console.log("FCM: Sending to", tokens.length, "device(s):", title, "-", body);
    const response = await messaging.sendEachForMulticast(message);
    if (response.successCount > 0) {
      console.log("FCM: Delivered to", response.successCount, "device(s)");
    }
    if (response.failureCount > 0) {
      response.responses.forEach((r, i) => {
        if (!r.success) {
          console.warn("FCM send failed for token:", tokens[i]?.slice(0, 30) + "...", r.error?.code, r.error?.message);
        }
      });
    }
  } catch (e) {
    console.error("FCM send error:", e);
  }
}
