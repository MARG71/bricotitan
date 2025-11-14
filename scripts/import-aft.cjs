// Ejecuta: pnpm import:aft "C:\\ruta\\carpeta\\FTP OCTUBRE 2025"
// Requisitos: @prisma/client, papaparse

const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

let SRC_DIR = process.argv[2] || ''
SRC_DIR = SRC_DIR.replace(/^"+|"+$/g, '')      // quita comillas exteriores
                 .replace(/\u00A0/g, ' ')      // NBSP -> espacio normal
                 .trim()
if (!SRC_DIR) {
  console.error('Uso: pnpm import:aft "C:\\ruta\\carpeta\\FTP OCTUBRE 2025"')
  process.exit(1)
}

// ========== helpers ==========
function smartReadCsv(filePath) {
  // Devuelve {rows, encoding, delimiter}
  const encodings = ['utf8', 'latin1', 'utf16le']   // <--- añade utf16le
  const delimiters = [';', ',', '\t']
  for (const enc of encodings) {
    if (!fs.existsSync(filePath)) return { rows: [], encoding: null, delimiter: null }
    let txt
    try { txt = fs.readFileSync(filePath, enc) } catch { continue }
    for (const delim of delimiters) {
      const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true, delimiter: delim })
      if (Array.isArray(parsed.data) && parsed.data.length > 0) {
        return { rows: parsed.data, encoding: enc, delimiter: delim }
      }
    }
  }
  // último intento: utf8 con autodetección de Papa
  try {
    const txt = fs.readFileSync(filePath, 'utf8')
    const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true })
    return { rows: parsed.data || [], encoding: 'utf8?', delimiter: 'auto?' }
  } catch {
    return { rows: [], encoding: null, delimiter: null }
  }
}

const get = (row, name) => {
  const keys = [
    name,
    name?.toUpperCase?.(),
    name?.toLowerCase?.(),
    name?.replace?.(/\s+/g, '_'),
    name?.replace?.(/\s+/g, '')?.toUpperCase?.(),
  ]
  for (const k of keys) if (k in row) return row[k]
  return undefined
}

const toInt = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? Math.trunc(n) : null
}
const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const slugify = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90)

function logFound(name, info) {
  const count = info.rows?.length ?? 0
  console.log(`· ${name}: ${count} filas (enc=${info.encoding || '-'}, delim=${info.delimiter || '-'})`)
}

// ========== importadores ==========
async function importCategorias(dir) {
  const cats = smartReadCsv(path.join(dir, 'categorias.csv'))
  logFound('categorias.csv', cats)

  let upserts = 0
  for (const r of cats.rows) {
    const id = toInt(get(r, 'ID_CATEGORIA') ?? get(r, 'ID'))
    const name = (get(r, 'NOMBRE_CATEGORIA') ?? get(r, 'NOMBRE') ?? '').toString().trim()
    if (!id || !name) continue

    const parentIdRaw = toInt(get(r, 'CATEGORIA_PADRE') ?? get(r, 'PARENT_ID'))
    const parentId = parentIdRaw && parentIdRaw !== 0 ? parentIdRaw : null

    // 1) slug base
    const base = slugify(name) || String(id)

    // 2) si el slug ya existe en otra categoría (id distinto) => usa base + "-{id}"
    let slug = base
    const clash = await prisma.category.findFirst({
      where: { slug: base, NOT: { id } },
      select: { id: true },
    })
    if (clash) slug = `${base}-${id}`

    await prisma.category.upsert({
      where: { id },
      create: { id, name, slug, parentId },
      update: { name, slug, parentId },
    })
    upserts++
  }

  // categoriasImg.csv → imageUrl (si no, generamos por defecto)
  const catsImg = smartReadCsv(path.join(dir, 'categoriasImg.csv'))
  logFound('categoriasImg.csv', catsImg)

  if ((catsImg.rows?.length || 0) > 0) {
    for (const r of catsImg.rows) {
      const id = toInt(get(r, 'ID_CATEGORIA') ?? get(r, 'ID'))
      const url = (get(r, 'URL') || '').toString().trim()
      if (!id || !url) continue
      await prisma.category.updateMany({ where: { id }, data: { imageUrl: url } })
    }
  } else if ((cats.rows?.length || 0) > 0) {
    for (const r of cats.rows) {
      const id = toInt(get(r, 'ID_CATEGORIA') ?? get(r, 'ID'))
      if (!id) continue
      const url = `https://www.aftgrupo.com/img_cats/${id}.jpg`
      await prisma.category.updateMany({ where: { id }, data: { imageUrl: url } })
    }
  }

  return { upserts }
}


function imageUrlsFromSpec(ref, num) {
  const n = toInt(num) || 0
  if (!ref || n <= 0) return []
  const urls = [`https://www.aftgrupo.com/img_artics/${ref}.jpg`]
  for (let i = 1; i <= n - 1; i++) urls.push(`https://www.aftgrupo.com/img_artics/${ref}_${i}.jpg`)
  return urls
}

function splitTodasImagenes(row) {
  const raw = get(row, 'TodasImagenes') || get(row, 'TODASIMAGENES') || ''
  return String(raw).split('|').map(s => s.trim()).filter(Boolean)
}

async function upsertProductoDesdeFila(r) {
  const id = toInt(get(r, 'ID'))
  const ref = (get(r, 'REF') || '').toString().trim()
  const ean = (get(r, 'EAN') || '').toString().trim()
  const name = (get(r, 'NOMBRE') || '').toString().trim()
  if (!id || !name) return false

  // CATEGORIAS (en v7 suele traer una lista; cogemos la última)
  let categoryId = null
  const cats = (get(r, 'CATEGORIAS') || get(r, 'CATEGS') || '').toString().trim()
  if (cats) {
    const arr = cats.split(',').map(x => x.trim()).filter(Boolean)
    if (arr.length) categoryId = toInt(arr[arr.length - 1])
  }

  const shortDesc = (get(r, 'DESCRIPCION_CORTA') || '').toString().trim()
  const longDesc  = (get(r, 'DESCRIPCION_LARGA') || '').toString().trim()
  const brand = (get(r, 'MARCA') || '').toString().trim()
  const priceExVat = toNum(get(r, 'PVP_SINIVA')) ?? 0
  const vatRate = toNum(get(r, 'POR_IVA'))
  const stock = toInt(get(r, 'STOCK'))

  const weightGr = toNum(get(r, 'PESO_GR'))
  const heightCm = toNum(get(r, 'ALTO_CM'))
  const widthCm  = toNum(get(r, 'ANCHO_CM'))
  const lengthCm = toNum(get(r, 'LARGO_CM'))

  const idAgrupacion = toInt(get(r, 'ID_AGRUPACION'))
  const tituloCombo  = (get(r, 'TITULO_COMBO') || '').toString().trim() || null
  const itemCombo    = (get(r, 'ITEM_COMBO') || '').toString().trim() || null
  const ordenCombo   = toInt(get(r, 'ORDEN_COMBO'))

  const baseSlug = slugify(name)
  const slug = `${baseSlug}-${slugify(ref || '')}`.replace(/-+$/,'') || `${baseSlug}-${id}`

  await prisma.product.upsert({
    where: { id },
    create: {
      id,
      ref: ref || null,
      ean: ean || null,
      name,
      slug,
      shortDesc: shortDesc || null,
      longDesc: longDesc || null,
      brand: brand || null,
      priceExVat,
      vatRate,
      stock,
      weight: weightGr != null ? weightGr : null,
      height: heightCm != null ? heightCm : null,
      width:  widthCm  != null ? widthCm  : null,
      length: lengthCm != null ? lengthCm : null,
      categoryId: categoryId || null,
      idAgrupacion,
      tituloCombo,
      itemCombo,
      ordenCombo,
    },
    update: {
      ref: ref || null,
      ean: ean || null,
      name,
      slug,
      shortDesc: shortDesc || null,
      longDesc: longDesc || null,
      brand: brand || null,
      priceExVat,
      vatRate,
      stock,
      weight: weightGr != null ? weightGr : null,
      height: heightCm != null ? heightCm : null,
      width:  widthCm  != null ? widthCm  : null,
      length: lengthCm != null ? lengthCm : null,
      categoryId: categoryId || null,
      idAgrupacion,
      tituloCombo,
      itemCombo,
      ordenCombo,
    },
  })

  // Bullets 1..5
  const bCols = ['BulletPoint1','BulletPoint2','BulletPoint3','BulletPoint4','BulletPoint5']
  const bulletTexts = bCols
    .map((k, i) => ({ text: (get(r, k) || '').toString().trim(), sort: (i+1)*10 }))
    .filter(b => b.text)
  if (bulletTexts.length) {
    await prisma.productBullet.deleteMany({ where: { productId: id } })
    await prisma.productBullet.createMany({
      data: bulletTexts.map(b => ({ productId: id, text: b.text, sort: b.sort })),
      skipDuplicates: true,
    })
  }

  // Imágenes: primero TodasImagenes; si no, REF + NUMERO_IMGS
  let urls = splitTodasImagenes(r)
  if (!urls.length) urls = imageUrlsFromSpec(ref, get(r, 'NUMERO_IMGS'))
  if (urls.length) {
    let s = 1
    for (const u of urls) {
      const url = u.replace(/\s+/g, '')
      if (!url) continue
      await prisma.productImage.upsert({
        where: { productId_url_unique: { productId: id, url } },
        create: { productId: id, url, sort: s++ },
        update: { sort: s++ },
      })
    }
  }

  return true
}

async function importProductos(dir) {
  const f8 = path.join(dir, 'productos.v8.csv')
  const f7 = path.join(dir, 'productos.v7.csv')

  const v8 = smartReadCsv(f8)
  const v7 = smartReadCsv(f7)
  logFound('productos.v8.csv', v8)
  logFound('productos.v7.csv', v7)

  const rows = (v8.rows || []).concat(v7.rows || [])
  if (!rows.length) return { upserts: 0 }

  let upserts = 0
  for (const r of rows) if (await upsertProductoDesdeFila(r)) upserts++
  return { upserts }
}

async function importImagenesCsv(dir) {
  const i1 = smartReadCsv(path.join(dir, 'imagenes.csv'))
  const pV2a = path.join(dir, 'imagenes.v2.csv')
  const pV2b = path.join(dir, 'imagenes.vv2.csv')
  const i2 = smartReadCsv(fs.existsSync(pV2a) ? pV2a : pV2b)

  logFound('imagenes.csv', i1)
  logFound(fs.existsSync(pV2a) ? 'imagenes.v2.csv' : 'imagenes.vv2.csv', i2)
  
  const rows = (i1.rows || []).concat(i2.rows || [])
  let adds = 0
  for (const r of rows) {
    const ref = (get(r,'REF') || '').toString().trim()
    const url = (get(r,'URL') || '').toString().trim()
    const num = toInt(get(r,'NUM')) ?? 999
    if (!ref || !url) continue
    const prod = await prisma.product.findFirst({ where: { ref } })
    if (!prod) continue
    await prisma.productImage.upsert({
      where: { productId_url_unique: { productId: prod.id, url } },
      create: { productId: prod.id, url, sort: num },
      update: { sort: num },
    })
    adds++
  }
  return { adds }
}

async function importI18n(dir) {
  const l1 = smartReadCsv(path.join(dir, 'productos.leng.csv'))
  const l2 = smartReadCsv(path.join(dir, 'productos.leng.v2.csv'))
  logFound('productos.leng.csv', l1)
  logFound('productos.leng.v2.csv', l2)

  const rows = (l1.rows || []).concat(l2.rows || [])
  let upserts = 0
  for (const r of rows) {
    const ref = (get(r,'REF') || '').toString().trim()
    const lang = (get(r,'LENG') || get(r,'IDIOMA') || 'es').toString().trim().toLowerCase()
    if (!ref || !lang) continue
    const prod = await prisma.product.findFirst({ where: { ref } })
    if (!prod) continue

    const name = (get(r,'NOMBRE') || '').toString().trim()
    const shortDesc = (get(r,'DESCRIPCION_CORTA') || '').toString().trim()
    const longDesc  = (get(r,'DESCRIPCION_LARGA') || '').toString().trim()

    await prisma.productI18n.upsert({
      where: { product_lang_unique: { productId: prod.id, lang } },
      create: { productId: prod.id, lang, name: name || null, shortDesc: shortDesc || null, longDesc: longDesc || null },
      update: { name: name || null, shortDesc: shortDesc || null, longDesc: longDesc || null },
    })
    upserts++
  }
  return { upserts }
}

function kindFromAccesorio(n) {
  const v = toInt(n)
  if (v === 1) return 'accessory'
  if (v === 2) return 'substitute'
  if (v === 3) return 'upgrade'
  return 'recommended'
}

async function importXrefs(dir) {
  const x = smartReadCsv(path.join(dir, 'xrefs.csv'))
  logFound('xrefs.csv', x)

  let upserts = 0
  for (const r of x.rows) {
    const ref1 = (get(r, 'REF1') || get(r, 'REF_1') || '').toString().trim()
    const ref2 = (get(r, 'REF2') || get(r, 'REF_2') || '').toString().trim()
    const kind = kindFromAccesorio(get(r, 'ACCESORIO'))
    if (!ref1 || !ref2) continue

    const from = await prisma.product.findFirst({ where: { ref: ref1 } })
    const to   = await prisma.product.findFirst({ where: { ref: ref2 } })
    if (!from || !to) continue

    await prisma.productXref.upsert({
      where: { xref_triplet_unique: { fromId: from.id, toId: to.id, kind } },
      create: { fromId: from.id, toId: to.id, kind },
      update: {},
    })
    upserts++
  }
  return { upserts }
}

// ========== main ==========
;(async () => {
  console.log('📦 Importando desde carpeta:', SRC_DIR)

  try {
  const list = fs.readdirSync(SRC_DIR, { withFileTypes: true })
                 .filter(d => d.isFile())
                 .map(d => d.name)
  console.log('🗂️  Archivos vistos por el script:', list.join(' | '))
} catch (e) {
  console.log('❌ No puedo leer el directorio. Revisa la ruta.')
}


  const cat = await importCategorias(SRC_DIR)
  if (cat.upserts) console.log('✔ Categorías upsert:', cat.upserts)

  const prod = await importProductos(SRC_DIR)
  console.log('✔ Productos upsert (v7+v8):', prod.upserts)

  const img = await importImagenesCsv(SRC_DIR)
  if (img.adds) console.log('✔ Imágenes extra añadidas:', img.adds)

  const i18n = await importI18n(SRC_DIR)
  if (i18n.upserts) console.log('✔ I18n upsert:', i18n.upserts)

  const xr = await importXrefs(SRC_DIR)
  if (xr.upserts) console.log('✔ Xrefs upsert:', xr.upserts)

  console.log('✅ FIN. Listado agrupa por idAgrupacion; ficha con selector de variantes.')
  await prisma.$disconnect()
})().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
