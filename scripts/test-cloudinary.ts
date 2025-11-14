// scripts/test-cloudinary.ts
import 'dotenv/config'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

async function main() {
  try {
    const res = await cloudinary.api.ping()
    console.log('✅ Conexión correcta con Cloudinary:', res)
  } catch (e: any) {
    console.error('❌ Error conectando a Cloudinary:', e.message)
  }
}

main()
