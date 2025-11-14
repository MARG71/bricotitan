// src/lib/cdn.ts
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export function imgSrc(productImage: { cloudinaryPublicId: string | null; url: string }) {
  if (productImage?.cloudinaryPublicId && cloudName) {
    // Entrega Cloudinary con auto-formato y auto-calidad
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${productImage.cloudinaryPublicId}`;
  }
  // Fallback mientras migra
  return productImage?.url;
}
