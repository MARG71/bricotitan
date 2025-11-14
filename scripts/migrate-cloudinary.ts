/* scripts/migrate-cloudinary.ts
   Sube/actualiza imágenes a Cloudinary con public_id determinista por producto+orden.
   - Toma de la BD: ProductImage (url) + Product(ref)
   - Sube con overwrite=true si ya existe
   - Guarda public_id + version + metadatos en ProductImage
*/
// scripts/migrate-cloudinary.ts
// Sube/actualiza imágenes a Cloudinary con public_id determinista por producto+orden.
import * as dotenv from 'dotenv';

// ⚠️ Carga primero .env.local (desarrollo) y luego .env como fallback
dotenv.config({ path: '.env.local' });
dotenv.config();

import { PrismaClient } from '@prisma/client';
// ❌ Evita alias "@/..." en scripts ejecutados con tsx en Windows
import { cloudinary } from '../src/lib/cloudinary';

const prisma = new PrismaClient();
// ❌ ya no llames getCloudinary()
// const cloudinary = getCloudinary();

type Opts = {
  folder?: string;
  dryRun?: boolean;
  limit?: number;
  onlyMissing?: boolean;
};

function publicIdFor(ref: string, num: number, folder?: string) {
  const safeRef = ref.replace(/[^\w\-./]/g, '_');
  const base = `${safeRef}/${String(num).padStart(3, '0')}`;
  return folder ? `${folder}/${base}` : base;
}

async function main() {
  const opts: Opts = {
    folder: process.env.CLOUDINARY_FOLDER || 'bricotitan/products',
    dryRun: process.env.DRY_RUN === '1',
    limit: process.env.LIMIT ? Number(process.env.LIMIT) : undefined,
    onlyMissing: process.env.ONLY_MISSING !== '0',
  };

  console.log('[cloudinary:migrate] options:', opts);

  const images = await prisma.productImage.findMany({
    where: opts.onlyMissing ? { cloudinaryPublicId: null } : undefined,
    include: { product: { select: { id: true, ref: true } } },
    orderBy: [{ productId: 'asc' }, { sort: 'asc' }, { id: 'asc' }],
    take: opts.limit,
  });

  console.log(`[cloudinary:migrate] Total imágenes a procesar: ${images.length}`);

  const byProduct = new Map<number, typeof images>();
  for (const img of images) {
    const arr = byProduct.get(img.productId) ?? [];
    arr.push(img);
    byProduct.set(img.productId, arr);
  }

  let ok = 0, fail = 0;

  for (const [, arr] of byProduct) {
    for (let idx = 0; idx < arr.length; idx++) {
      const img = arr[idx];
      const ref = img.product?.ref || `prod-${img.productId}`;
      const ordinal = idx + 1;
      const publicId = publicIdFor(ref, ordinal, opts.folder);

      console.log(`-> ${ref} #${ordinal}  |  ${publicId}`);
      if (opts.dryRun) continue;

      try {
        const res = await cloudinary.uploader.upload(img.url, {
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
          unique_filename: false,
          use_filename: false,
        });

        await prisma.productImage.update({
          where: { id: img.id },
          data: {
            cloudinaryPublicId: res.public_id,
            cloudinaryVersion: res.version,
            cloudinaryFormat: (res.format as string) || null,
            cloudinaryWidth: res.width || null,
            cloudinaryHeight: res.height || null,
            updatedAt: new Date(),
          },
        });

        ok++;
      } catch (e: any) {
        console.error('   ERROR subiendo', img.id, e?.message || e);
        fail++;
      }
    }
  }

  console.log(`[cloudinary:migrate] OK=${ok}  FAIL=${fail}`);
  await prisma.$disconnect();
}

// ⚠️ Tenías main() duplicado. Déjalo una sola vez:
main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
