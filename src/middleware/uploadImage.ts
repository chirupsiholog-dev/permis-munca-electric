import multer from "multer";

export const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024}, //10 mb per image
    fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'))
    },
})