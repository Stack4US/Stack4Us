import cloudinary from "../config/cloudinary.js";

export const uploadImage = async (filePath, folder) => {
  return await cloudinary.uploader.upload(filePath, { folder });
};

export const deleteImage = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};