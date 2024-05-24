const admin = require("firebase-admin");
const serviceAccount = require("../constants/mern2library-f21df-firebase-adminsdk-5vzj2-5cfa162278.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "mern2library-f21df.appspot.com",
});

const storage = admin.storage();

const uploadToFirebaseStorage = (file) => {
  return new Promise((resolve, reject) => {
    const bucket = admin.storage().bucket();

    // Create a unique filename
    const fileName = `${Date.now()}_${file.originalname}`;

    const fileUpload = bucket.file(fileName);

    // Create a stream to upload the file
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    // Handle events during the file upload
    stream.on("error", (error) => {
      console.error("Error uploading to Firebase Storage:", error);
      reject("Error uploading to Firebase Storage");
    });

    stream.on("finish", async () => {
      // The file upload is complete
      console.log("File uploaded to Firebase Storage");

      // Get the public URL of the uploaded file
      try {
        const url = await getDownloadURL(fileUpload);
        resolve(url);
      } catch (urlError) {
        console.error("Error getting download URL:", urlError);
        reject("Error getting download URL");
      }
    });

    // Pipe the file to the Firebase Storage bucket
    stream.end(file.buffer);
  });
};

const getDownloadURL = (file) => {
  return new Promise((resolve, reject) => {
    file.getSignedUrl(
      {
        action: "read",
        expires: "03-09-2491", // Replace with a far-future expiration date
      },
      (err, url) => {
        if (err) {
          console.error("Error getting download URL:", err);
          reject("Error getting download URL");
        } else {
          resolve(url);
        }
      }
    );
  });
};

module.exports = {
  uploadToFirebaseStorage,
};
