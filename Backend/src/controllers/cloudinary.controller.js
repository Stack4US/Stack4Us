import { uploadImage } from "../services/cloudinary.service.js";

// Upload profile picture → folder "profile"
export const uploadProfilePic = async (req, res) => {
  try {
    const result = await uploadImage(req.file.path, "profile");
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upload post picture → folder "posts"
export const uploadPostPic = async (req, res) => {
  try {
    const result = await uploadImage(req.file.path, "posts");
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
