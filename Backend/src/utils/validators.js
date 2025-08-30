import cloudinary from '../config/cloudinary.js';

export async function uploadImageIfNeeded(file) {
    if (!file) return null;
    if (!file.buffer || !file.mimetype) throw new Error("Archivo inválido");
    
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
        }
    );
    stream.end(file.buffer);
    });
}