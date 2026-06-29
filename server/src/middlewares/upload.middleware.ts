import multer from 'multer';

import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

const allowedMimeTypes = new Set([
  'application/pdf',

  'image/jpeg',
  'image/png',
  'image/webp',

  'text/plain',

  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    files: 1,
    fileSize: env.FILE_UPLOAD_MAX_BYTES,
  },

  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new AppError(
          400,
          'Недопустимый тип файла',
        ),
      );

      return;
    }

    callback(null, true);
  },
});

export const uploadSingleMaterialFile =
  upload.single('file');