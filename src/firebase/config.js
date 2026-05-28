// Re-export all Firebase modules and configuration from a single centralized API client
// to prevent duplicate initialization / Firestore offline settings clash in production bundle.
import app, { auth, db, storage, googleProvider, firebaseConfig } from "@/api/firebase";

export { auth, db, storage, googleProvider, firebaseConfig };
export default app;

