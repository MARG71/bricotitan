-- Baseline para alinear drift SOLO con el campo slug en Product.
-- Idempotente para la shadow DB (no re-crea enums ni tablas).

DO $$
BEGIN
    -- Añadir columna "slug" si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Product'
          AND column_name = 'slug'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN "slug" TEXT;
    END IF;

    -- Crear índice único si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'Product_slug_key'
    ) THEN
        CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
    END IF;
END
$$;
