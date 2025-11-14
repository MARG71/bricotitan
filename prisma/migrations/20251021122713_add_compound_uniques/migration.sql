/*
  Warnings:

  - A unique constraint covering the columns `[productId,lang]` on the table `ProductI18n` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fromId,toId,kind]` on the table `ProductXref` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductI18n_productId_lang_key" ON "ProductI18n"("productId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "ProductXref_fromId_toId_kind_key" ON "ProductXref"("fromId", "toId", "kind");
