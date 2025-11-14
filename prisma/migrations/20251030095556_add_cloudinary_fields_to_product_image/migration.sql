-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "cloudinaryFormat" VARCHAR(32),
ADD COLUMN     "cloudinaryHeight" INTEGER,
ADD COLUMN     "cloudinaryPublicId" VARCHAR(191),
ADD COLUMN     "cloudinaryVersion" INTEGER,
ADD COLUMN     "cloudinaryWidth" INTEGER;

-- CreateIndex
CREATE INDEX "ProductImage_cloudinaryPublicId_idx" ON "ProductImage"("cloudinaryPublicId");
