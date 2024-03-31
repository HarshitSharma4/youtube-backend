import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const responce = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    console.log("file uploaded on cloudnary", responce);
    fs.unlinkSync(localFilePath);
    return responce;
  } catch (error) {
    fs.unlinkSync(localFilePath); //Remove the locally save temperary file as the uploaded operation get fail
    return null;
  }
};

const deleteOnCloudinary = async (url) => {
  try {
    // const publicId = cloudinary.url(url, { type: "fetch" }).public_id;
    // console.log(publicId);
    let publicId = await extractPublicId(url);
    console.log(publicId);
    if (!publicId) {
      throw new Error("Invalid Cloudinary URL");
    }

    const deletionResult = await cloudinary.uploader.destroy(publicId);
    console.log("Deletion result:", deletionResult);
    return deletionResult;
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
