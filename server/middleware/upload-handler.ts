import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ApiError } from './error-handler';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError('Invalid file type. Only JPG, PNG, and PDF files are allowed.', 400));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

export const uploadSingle = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError('File too large. Maximum size is 5MB.', 400));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new ApiError('Too many files. Only one file allowed.', 400));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError('Unexpected field name.', 400));
        }
        return next(new ApiError(`Upload error: ${err.message}`, 400));
      }
      
      if (err) {
        return next(err);
      }
      
      next();
    });
  };
};

export const validateFile = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new ApiError('No file uploaded', 400));
  }
  
  // Additional validation can be added here
  next();
};
