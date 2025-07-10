import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export class CloudinaryService {
  private isConfigured: boolean = false;

  constructor() {
    this.initializeFromEnv();
  }

  private initializeFromEnv(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      this.configure({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });
    }
  }

  public configure(config: CloudinaryConfig): void {
    try {
      cloudinary.config({
        cloud_name: config.cloud_name,
        api_key: config.api_key,
        api_secret: config.api_secret,
        secure: true
      });
      this.isConfigured = true;
      console.log('Cloudinary configured successfully');
    } catch (error) {
      console.error('Error configuring Cloudinary:', error);
      this.isConfigured = false;
    }
  }

  public isReady(): boolean {
    return this.isConfigured;
  }

  public async uploadFile(
    file: Express.Multer.File,
    folder: string = 'vidhyadham'
  ): Promise<{ success: boolean; url?: string; public_id?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary is not configured');
      }

      // Convert buffer to base64 for upload
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: false
      });

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id
      };
    } catch (error) {
      console.error('Error uploading file to Cloudinary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async deleteFile(publicId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary is not configured');
      }

      const result = await cloudinary.uploader.destroy(publicId);
      
      return {
        success: result.result === 'ok'
      };
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async uploadBase64(
    base64Data: string,
    folder: string = 'vidhyadham',
    filename?: string
  ): Promise<{ success: boolean; url?: string; public_id?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary is not configured');
      }

      const result = await cloudinary.uploader.upload(base64Data, {
        folder: folder,
        resource_type: 'auto',
        public_id: filename,
        use_filename: true,
        unique_filename: false
      });

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id
      };
    } catch (error) {
      console.error('Error uploading base64 to Cloudinary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public getStatus(): { configured: boolean; cloudName?: string } {
    return {
      configured: this.isConfigured,
      cloudName: this.isConfigured ? cloudinary.config().cloud_name as string : undefined
    };
  }
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allow only specific file types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'));
    }
  }
});

export const cloudinaryService = new CloudinaryService();
