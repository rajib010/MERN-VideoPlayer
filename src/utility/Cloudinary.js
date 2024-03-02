import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilepath) => {
    try {
        if (!localFilepath) {
            throw new ApiError(400, 'Avatar file is missing');
        }

        const response = await cloudinary.uploader.upload(localFilepath, {
            resource_type: 'auto'
        });

        console.log('File uploaded to Cloudinary:', response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilepath); // Remove temporary file on upload failure
        throw error; // Re-throw the error for proper handling
    }
};

const deleteCloudinaryImage = async (publicId) => {
    try {
        if (!publicId) {
            return; 
        }

        const response = await cloudinary.uploader.destroy(publicId);
        console.log('Image deleted successfully:', response);
    } catch (error) {
        console.error('Error deleting image:', error);
    }
}

export { uploadOnCloudinary, deleteCloudinaryImage }