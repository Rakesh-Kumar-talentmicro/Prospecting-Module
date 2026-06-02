import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';

const importRoot = path.resolve(process.env.IMPORT_STORAGE_DIR || 'storage/imports');
const tempDir = path.join(importRoot, '_tmp');
const allowedExtensions = new Set(['.csv', '.xlsx']);

fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowedExtensions.has(ext)) {
    const err = new Error('Only CSV and XLSX prospect import files are supported');
    err.status = 400;
    cb(err);
    return;
  }

  cb(null, true);
};

export const uploadProspectImportFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.IMPORT_MAX_FILE_SIZE_BYTES || 500 * 1024 * 1024)
  }
});
