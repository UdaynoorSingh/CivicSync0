import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Dev-only helper for Firebase console test phone numbers.
// Enable by setting VITE_FIREBASE_TEST_MODE=true in frontend/.env
if (
  import.meta.env.DEV &&
  String(import.meta.env.VITE_FIREBASE_TEST_MODE ?? "").toLowerCase() ===
    "true"
) {
  auth.settings.appVerificationDisabledForTesting = true;
}
