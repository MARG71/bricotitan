// Ejecuta: node scripts/backfill-combos.cjs ruta\a\tu.csv
// Requisitos: pnpm add @prisma/client papaparse

const fs = require('fs')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const file = process.argv[2]
if (!file) {
  console.error('Uso: node scripts/backfill-combos.cjs ruta/a/archivo.csv')
  process.exit(1)
}

const csvText = fs.readFileSync(file, 'utf8')
const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })

const getKey = (row, k) =>
  row[k] ??
  row[k?.toUpperCase?.()] ??
  row[k?.toLowerCase?.()] ??
  row[k?.replace?.(/\s+/g, '_')] ??
  row[k?.replace?.(/\s+/g, '')?.toUpperCase?.()]

;(async () => {
  let ok = 0, miss = 0, fail = 0

  for (const row of parsed.data) {
    try {
      const refRaw = getKey(row, 'REF')
      const ref = refRaw?.toString().trim()
      if (!ref) { miss++; continue }

      const idAgr = Number(getKey(row, 'ID_AGRUPACION'))
      const titulo = (getKey(row, 'TITULO_COMBO') ?? '').toString().trim()
      const item = (getKey(row, 'ITEM_COMBO') ?? '').toString().trim()
      const ordenRaw = getKey(row, 'ORDEN_COMBO')
      const orden = ordenRaw == null || ordenRaw === '' ? null : Number(ordenRaw)

      const result = await prisma.product.updateMany({
        where: { ref },
        data: {
          idAgrupacion: Number.isFinite(idAgr) ? idAgr : null,
          tituloCombo: titulo || null,
          itemCombo: item || null,
          ordenCombo: Number.isFinite(orden) ? orden : null,
        },
      })

      if (result.count > 0) ok++
      else miss++
    } catch (e) {
      fail++
      console.error('Error en REF=', row.REF, e.message)
    }
  }

  console.log('Actualizaciones correctas:', ok, '| Sin coincidencia por REF:', miss, '| Errores:', fail)
  await prisma.$disconnect()
})()
