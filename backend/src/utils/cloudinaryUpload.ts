import cloudinary from "../config/cloudinary";

type UploadFolder = "complaints" | "service-requests";

export const uploadBufferToCloudinary = async (
  file: Express.Multer.File,
  folder: UploadFolder,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: `civicsync/${folder}`,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
      },
      (error: unknown, result?: { secure_url?: string }) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Failed to upload file to Cloudinary."));
          return;
        }
        resolve(result.secure_url);
      },
    );

    upload.end(file.buffer);
  });
