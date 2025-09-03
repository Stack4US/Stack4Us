import cloudinary from '../config/cloudinary.js';

// Upload image if file exists, else return null
export async function uploadImageIfNeeded(file) {
    if (!file) return null;
    if (!file.buffer || !file.mimetype) throw new Error("Invalid file");
    
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url); // return only secure URL
            }
        );
        stream.end(file.buffer);
    });
}
