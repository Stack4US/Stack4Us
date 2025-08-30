
import { uploadImage } from "../services/cloudinary.service.js";

export const uploadProfilePic = async (req, res) => {
  try {
    const result = await uploadImage(req.file.path, "profile");
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadPostPic = async (req, res) => {
  try {
    const result = await uploadImage(req.file.path, "posts");
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
