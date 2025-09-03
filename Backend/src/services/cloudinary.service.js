import cloudinary from "../config/cloudinary.js";

// Upload image to Cloudinary in given folder
export const uploadImage = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          return reject(new Error("Cloudinary upload error: " + error.message));
        }
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// Delete image from Cloudinary by publicId
export const deleteImage = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};
