// src/lib/cloudinary.ts
// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfig() {
  if (configured) return;
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('[cloudinary] Falta CLOUDINARY_CLOUD_NAME en variables de entorno');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    secure: process.env.CLOUDINARY_SECURE !== 'false',
  });
  configured = true;
}

ensureConfig(); // 👈 configura automáticamente al importar

export function getCloudinary() {
  ensureConfig();
  return cloudinary;
}

export { cloudinary };
