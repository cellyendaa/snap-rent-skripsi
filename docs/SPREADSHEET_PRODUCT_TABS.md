# Struktur Spreadsheet: Product, Manufacturer, Images, Default Package

Dokumen ini mendefinisikan **tab-tab** dan **kolom** di Google Spreadsheet agar sesuai dengan struktur `src/data/products.json`, dengan relasi lewat **ID**.

---

## Diagram Relasi (Integrasi ID)

```
Categories (id)
     ↑
     │ category_id
     │
Products (id) ←────── manufacturer_id ──────→ Manufacturers (id)
     │
     ├── product_id ──→ Images (product_id)
     │
     ├── parent_id (dari Default_packages) ──→ Products (id)
     │
Default_packages (id) ←── parent_id = Product.id
     │
     └── package_id ──→ Package_components (package_id)
                            │
                            └── product_id ──→ Products (id)
```

---

## Tab 1: **Categories**

Nama tab di Google Sheet: `Categories`

| Kolom       | Tipe   | Keterangan                    |
|-------------|--------|-------------------------------|
| id          | string | PK, unik                      |
| name        | string | Nama kategori (contoh: Camera Action, Camera Canon) |
| type        | string | contoh: RENT                  |
| parent_id   | string | FK ke Categories.id (bisa kosong) |
| created_at  | string | ISO datetime                  |
| updated_at  | string | ISO datetime                  |

**Header baris 1:**  
`id` | `name` | `type` | `parent_id` | `created_at` | `updated_at`

---

## Tab 2: **Manufacturers**

Nama tab di Google Sheet: `Manufacturers`

| Kolom       | Tipe   | Keterangan        |
|-------------|--------|-------------------|
| id          | string | PK, unik          |
| name        | string | Nama (Canon, Sony, DJI, dll.) |
| slug        | string | URL-friendly (canon, sony, dji) |
| created_at  | string | ISO datetime      |
| updated_at  | string | ISO datetime      |

**Header baris 1:**  
`id` | `name` | `slug` | `created_at` | `updated_at`

---

## Tab 3: **Products**

Nama tab di Google Sheet: `Products`

**Pentingen:** Tab Products berisi **hanya field flat** di bawah ini. Tidak ada kolom untuk object nested (category, manufacturer, images, default_package). Integrasi dengan tab lain dilakukan lewat ID: `category_id` → Categories, `manufacturer_id` → Manufacturers; tab Images / Default_packages / Package_components mereferensi produk lewat `product_id` atau `parent_id`.

Contoh satu baris produk (sumber: `products.json`):

```json
"id": "01k106hh7aq636jvqb17qy0rh3",
"name": "DJI Osmo Pocket 3",
"title": "Camera DJI Osmo Pocket 3 Creator Combo (1-inch sensor)",
"model": "RENT",
"type": "RENT_PARENT",
"status": "ACTIVE",
"price": 250000,
"slug": "dji-osmo-pocket-3-68832d40b6b78",
"description": null,
"category_id": "201604011212120000107",
"manufacturer_id": "201706042042239140133",
"parent_id": null,
"created_at": "2025-07-25T07:07:44.000000Z",
"updated_at": "2025-08-06T14:20:30.000000Z"
```

| Kolom          | Tipe   | Keterangan                    |
|----------------|--------|-------------------------------|
| id             | string | PK, unik                      |
| name           | string | Nama singkat produk           |
| title          | string | Judul lengkap                 |
| model          | string | contoh: RENT                  |
| type           | string | RENT_PARENT, RENT_CHILD       |
| status         | string | ACTIVE, dll.                  |
| price          | number | Harga per hari                |
| slug           | string | URL unik                      |
| description    | string | Bisa kosong                   |
| category_id    | string | FK → Categories.id            |
| manufacturer_id| string | FK → Manufacturers.id         |
| parent_id      | string | FK → Products.id (bisa null)  |
| created_at     | string | ISO datetime                  |
| updated_at     | string | ISO datetime                  |

**Header baris 1:**  
`id` | `name` | `title` | `model` | `type` | `status` | `price` | `slug` | `description` | `category_id` | `manufacturer_id` | `parent_id` | `created_at` | `updated_at`

---

## Tab 4: **Images**

Nama tab di Google Sheet: `Images`

| Kolom      | Tipe   | Keterangan                          |
|------------|--------|-------------------------------------|
| id         | string | PK, unik                            |
| image      | string | Nama file gambar (di public/products/) |
| product_id | string | FK → Products.id                     |
| order      | number | Urutan tampil (1, 2, 3...)          |
| created_at | string | ISO datetime                        |
| updated_at | string | ISO datetime                        |

**Header baris 1:**  
`id` | `image` | `product_id` | `order` | `created_at` | `updated_at`

---

## Tab 5: **Default_packages**

Nama tab di Google Sheet: `Default_packages`

| Kolom          | Tipe   | Keterangan                |
|----------------|--------|---------------------------|
| id             | string | PK, unik                  |
| name           | string | Nama paket                |
| title          | string | Bisa kosong               |
| model          | string | PACKAGE                   |
| type           | string | DEFAULT_PACKAGE           |
| status         | string | ACTIVE                    |
| price          | number | Harga paket               |
| slug           | string | URL unik paket            |
| description    | string | Bisa kosong               |
| category_id    | string | Sering kosong             |
| manufacturer_id| string | Sering kosong             |
| parent_id      | string | FK → **Products.id** (produk pemilik paket) |
| created_at     | string | ISO datetime              |
| updated_at     | string | ISO datetime              |

**Header baris 1:**  
`id` | `name` | `title` | `model` | `type` | `status` | `price` | `slug` | `description` | `category_id` | `manufacturer_id` | `parent_id` | `created_at` | `updated_at`

---

## Tab 6: **Package_components**

Nama tab di Google Sheet: `Package_components`

| Kolom       | Tipe   | Keterangan                    |
|-------------|--------|-------------------------------|
| id          | string | PK, unik                      |
| package_id   | string | FK → Default_packages.id      |
| order       | number | Urutan dalam paket            |
| product_id  | string | FK → Products.id (produk yang masuk paket) |
| product_type| string | RentProduct                   |
| type        | string | PARENT, CHILD                 |
| quantity    | number | Jumlah                        |
| created_at  | string | ISO datetime                  |
| updated_at  | string | ISO datetime                  |

**Header baris 1:**  
`id` | `package_id` | `order` | `product_id` | `product_type` | `type` | `quantity` | `created_at` | `updated_at`

---

## Cara Pakai di Google Sheets

1. Buat satu **Google Spreadsheet** baru.
2. Buat **6 sheet** (tab) dengan nama persis:  
   `Categories`, `Manufacturers`, `Products`, `Images`, `Default_packages`, `Package_components`.
3. Di setiap tab, **baris pertama** isi header sesuai tabel di atas (copy-paste dari header baris 1).
4. Isi data mulai baris 2. Bisa isi manual atau **import dari CSV** yang dihasilkan script (lihat bagian berikut).

Relasi terjaga dengan mengisi ID yang sama:  
misalnya `Products.manufacturer_id` = `Manufacturers.id`, `Images.product_id` = `Products.id`, `Default_packages.parent_id` = `Products.id`, `Package_components.package_id` = `Default_packages.id`, `Package_components.product_id` = `Products.id`.

---

## Generate CSV dari products.json (import ke Sheet)

Agar data dari `src/data/products.json` bisa langsung dijadikan isi spreadsheet:

1. Jalankan script:
   ```bash
   node scripts/generate-product-sheets.mjs
   ```
2. CSV akan tersimpan di folder **`docs/sheet-csv/`**:
   - `Categories.csv`
   - `Manufacturers.csv`
   - `Products.csv`
   - `Images.csv`
   - `Default_packages.csv`
   - `Package_components.csv`
3. Di Google Spreadsheet: buat 6 tab dengan nama di atas, lalu di setiap tab gunakan **File → Import** (atau paste) isi CSV yang sesuai. Baris pertama CSV = header kolom.
