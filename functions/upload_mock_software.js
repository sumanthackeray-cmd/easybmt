const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin with the project's storage bucket
admin.initializeApp({
  projectId: "vogats-firebase-studio",
  storageBucket: "vogats-firebase-studio.firebasestorage.app"
});

const bucket = admin.storage().bucket();

async function uploadMockFile() {
  const localFilePath = path.join(__dirname, "EasyBMT-Setup-1.4.2.exe");
  
  // 1. Create a dummy mock executable installer file of 1MB containing safe payload
  console.log("Creating dummy mock executable installer file...");
  const dummyContent = Buffer.alloc(1024 * 1024, "EASYBMT-ENTERPRISE-SOFTWARE-MOCK-INSTALLER-V1.4.2");
  fs.writeFileSync(localFilePath, dummyContent);

  const destinationPath = "releases/v1.4.2/EasyBMT-Setup-1.4.2.exe";
  console.log(`Attempting to upload mock installer to bucket path: ${destinationPath}...`);

  try {
    // 2. Upload file to Firebase Storage
    await bucket.upload(localFilePath, {
      destination: destinationPath,
      metadata: {
        contentType: "application/x-msdownload",
        metadata: {
          version: "v1.4.2",
          buildType: "enterprise",
          developer: "EasyBMT"
        }
      }
    });

    console.log("SUCCESS! Mock software installer uploaded successfully to your Firebase Storage bucket!");
    console.log(`Path: releases/v1.4.2/EasyBMT-Setup-1.4.2.exe`);
    
    // Clean up local temp file
    fs.unlinkSync(localFilePath);
  } catch (error) {
    console.error("FAILED to upload mock file to Firebase Storage:", error.message);
    console.log("\nAlternative: If authentication fails, please upload the file manually in your Firebase Console at:");
    console.log("https://console.firebase.google.com/project/vogats-firebase-studio/storage/vogats-firebase-studio.firebasestorage.app/files");
  }
}

uploadMockFile();
