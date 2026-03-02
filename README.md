# SnapRent

A modern React.js application with TypeScript, Tailwind CSS, and Redux Toolkit.

## Features

- ⚡️ **Vite** - Fast build tool and dev server
- ⚛️ **React 18** - Latest React with TypeScript
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🗂️ **Redux Toolkit** - State management
- 🧭 **React Router** - Client-side routing
- 🌙 **Dark Mode** - Theme switching with localStorage persistence
- 📦 **TypeScript** - Type safety
- 🎯 **ESLint** - Code linting

## Project Structure

```
pondok-lensa/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── store/           # Redux store and slices
│   │   └── slices/      # Redux slices
│   ├── hooks/           # Custom React hooks
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
└── package.json
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Tech Stack

- **React** 18.3.1
- **TypeScript** 5.6.2
- **Vite** 5.4.2
- **Tailwind CSS** 3.4.13
- **Redux Toolkit** 2.2.7
- **React Router** 6.28.0

## Best Practices

- ✅ TypeScript for type safety
- ✅ Redux Toolkit for state management
- ✅ Custom hooks for Redux (useAppDispatch, useAppSelector)
- ✅ Component-based architecture
- ✅ Responsive design with Tailwind CSS
- ✅ Dark mode support
- ✅ Path aliases (@/\*) for cleaner imports

---

## Login System (Google Sheets Backend)

Login uses **phone number** and **password**, with user data stored in a Google Sheet.

### Running the app with login

1. **Start the API (backend)**  
   From the project root:

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and set SPREADSHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY (see below)
   npm run dev
   ```

   API runs at [http://localhost:3001](http://localhost:3001).

2. **Start the frontend**  
   In another terminal, from the project root:
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173). Use **Login** in the navbar; `/api` is proxied to the backend in development.

### Google Service Account setup

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create or select a project.
   - Enable **Google Sheets API**: APIs & Services → Library → search “Google Sheets API” → Enable.

2. **Create a Service Account**
   - APIs & Services → **Credentials** → **Create Credentials** → **Service account**.
   - Name it (e.g. `skripsi`) → Create and continue → Done.
   - Open the new service account → **Keys** → **Add key** → **Create new key** → **JSON** → Create.
   - Save the JSON file somewhere safe (do **not** commit it).

3. **Use the JSON in the backend**
   - From the JSON file, you need:
     - `client_email` → set as `GOOGLE_CLIENT_EMAIL` in `backend/.env`.
     - `private_key` (one line, with `\n` for newlines) → set as `GOOGLE_PRIVATE_KEY` in `backend/.env`.
   - Or put the **path** to the JSON file in `GOOGLE_APPLICATION_CREDENTIALS` and the backend can be extended to load from that file instead of env vars.

4. **Share the Google Sheet with the service account**
   - Open your sheet (e.g. [Skripsi](https://docs.google.com/spreadsheets/d/1lQcEuOPrquJ_vKLiXELgeR-wi2jHMOupvTc3tHCvKTI/edit)).
   - **Share** → add the **service account email** (e.g. `skripsi@your-project.iam.gserviceaccount.com`) as **Viewer** (or Editor if you write to the sheet).
   - The first row of the sheet must be headers: `phone_number` | `password` | `name`. Data starts from row 2.

5. **Backend `.env`**
   - Copy `backend/.env.example` to `backend/.env`.
   - Set:
     - `SPREADSHEET_ID`: from the sheet URL `.../d/<SPREADSHEET_ID>/edit`.
     - `GOOGLE_CLIENT_EMAIL`: service account `client_email`.
     - `GOOGLE_PRIVATE_KEY`: full private key string; in `.env` you can use `\n` for newlines, e.g. `GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"`.

**Security:** Never commit `.env` or the service account JSON. They are listed in `.gitignore`.

---

## Order Sheet (Google Sheets)

Saat user **Book Now** (dan sudah login), order dikirim ke API dan ditulis ke sheet **Order** di spreadsheet yang sama. Status order di app (Belum Diambil, Rental Berjalan, Selesai, Dibatalkan) disimpan di sheet dan bisa diubah dari app (mis. batalkan order).

### Setup sheet Order

1. Di spreadsheet yang sama (yang dipakai untuk Login), buat/buka **tab** bernama **Order** (atau nama lain lalu set env `ORDER_SHEET_TITLE`).
2. **Baris pertama** wajib berisi header (nama kolom). Isi persis seperti berikut:

| order_id   | user_phone  | user_name | product_name | product_id | product_images | package_images | pickup_date | pickup_time | pickup_location | return_date | return_time | return_location | rental_days | total_price | status        | created_at               |
| ---------- | ----------- | --------- | ------------ | ---------- | -------------- | -------------- | ----------- | ----------- | --------------- | ----------- | ----------- | --------------- | ----------- | ----------- | ------------- | ------------------------ |
| (otomatis) | 08123456789 | Budi      | Sony FX3...  | prod-123   | a.jpg, b.jpg   | p1.jpg, p2.jpg | 2025-02-21  | 09:00       | jakarta         | 2025-02-24  | 09:00       | jakarta         | 3           | 1500000     | belum_diambil | 2025-02-20T10:00:00.000Z |

- **product_images**: nama file gambar produk (dari detail produk saat booking), dipisah koma. Harus sama dengan file di `public/products/` agar gambar tampil di halaman /orders (Belum Diambil, dll.).
- **package_images**: nama file gambar item package (dari detail produk), dipisah koma. Diisi otomatis saat Book Now dari product detail.

3. **Status** harus salah satu nilai ini (tanpa spasi, underscore):
   - `belum_diambil` → tampil di tab **Belum Diambil**
   - `rental_berjalan` → **Rental Berjalan**
   - `selesai` → **Selesai**
   - `dibatalkan` → **Dibatalkan**

4. Share spreadsheet ke Service Account (sama seperti untuk Login). Baris data baru akan ditambah oleh API saat user menekan Book Now; perubahan status (mis. batalkan) akan mengubah kolom `status` di baris yang sesuai.

---

## Products Sheet (Google Sheets)

Katalog produk diambil dari data lokal (`src/data/products.json`). Gambar untuk **order** diambil dari detail produk saat Book Now dan disimpan di tab **Order** (kolom `product_images`, `package_images`), sehingga di halaman /orders gambar dicocokkan dengan file di `public/products/`.

### Setup sheet Products

Struktur kolom mengikuti data flat seperti di `src/data/products.json`.

1. Buat/buka **tab** bernama **Products** (atau set env `PRODUCTS_SHEET_TITLE`).
2. **Baris pertama** = header. Kolom yang didukung (wajib: id, name, title, slug, price):

| id  | name | title | slug | price | image | description | category_id | manufacturer_id | parent_id | status | model | type | created_at | updated_at | images |
| --- | ---- | ----- | ---- | ----- | ----- | ----------- | ----------- | --------------- | --------- | ------ | ----- | ---- | ---------- | ---------- | ------ |

3. **image**: nama file gambar utama (di `public/products/`). **images**: beberapa gambar dipisah koma (mis. `a.jpg, b.jpg, c.jpg`). Jika hanya pakai `image`, itu dipakai sebagai gambar pertama.
4. **product_id** di sheet Order harus sama dengan **id** di sheet Products agar order menampilkan nama dan gambar produk yang cocok.

---

## Asisten Snaprent (Gemini API)

Asisten chat di halaman **/chat** memakai **Gemini API** dengan **Function Calling**: tool `search_products` membaca data dari tab **Products** di Google Sheet yang sama.

### Fitur

- User bertanya (mis. "Berapa harga sewa DJI Osmo Pocket 3?" atau "Apa saja kamera yang tersedia?") → Gemini memanggil `search_products`, backend memfilter dari sheet, lalu menjawab dengan teks + daftar produk.
- Di UI chat: jawaban dirender **Markdown**; jika ada produk, ditampilkan **gambar** dan tombol **Rent Now** ke `/product/[slug]`.
- Riwayat percakapan dikirim ke backend sehingga konteks tetap terjaga.

### Setup Gemini API

1. **Dapatkan API Key**
   - Buka [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Buat API key untuk Gemini API.

2. **Backend `.env`**
   - Tambahkan di `backend/.env`:

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   - Tanpa ini, endpoint `/api/chat` akan mengembalikan error bahwa `GEMINI_API_KEY` belum di-set.

3. **Produk untuk asisten**
   - Data produk dibaca dari tab **Products** (sheet yang sama dengan Login/Orders). Pastikan kolom: id, name, title, slug, price, image, description, category_id, manufacturer_id, status (dan opsional lainnya). Hanya baris dengan `status` = ACTIVE yang dipakai untuk pencarian.
