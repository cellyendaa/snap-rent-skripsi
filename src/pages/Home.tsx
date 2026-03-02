import { useState, useEffect, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import { getProductsFromApi } from '../services/productService';
import type { Product } from '../types/product';
import { Search, RotateCcw } from 'lucide-react';

const SKELETON_COUNT = 10;

const Home = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Produk diambil dari endpoint GET /api/products (backend baca dari Google Sheet). CRUD di spreadsheet akan langsung tercermin di sini.
  useEffect(() => {
    setLoading(true);
    setError(null);
    getProductsFromApi()
      .then((list) => {
        const data = list ?? [];
        setAllProducts(data);
        setFilteredProducts(data);
        if (list === null) setError('Gagal memuat katalog dari spreadsheet. Pastikan backend berjalan dan tab Products (dan tab terkait) ada di Google Sheet.');
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      const name = p.manufacturer?.name?.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allProducts]);

  const handleSearch = () => {
    const q = searchText.trim().toLowerCase();
    const cat = selectedCategory.trim();
    const filtered = allProducts.filter((p) => {
      const matchText = !q || [p.name, p.title].some(
        (s) => s && String(s).toLowerCase().includes(q)
      );
      const matchCategory = !cat || p.manufacturer?.name === cat;
      return matchText && matchCategory;
    });
    setFilteredProducts(filtered);
  };

  const handleResetFilter = () => {
    setSearchText('');
    setSelectedCategory('');
    setFilteredProducts(allProducts);
  };

  const highlightedProductSlug = 'sony-fx3-full-frame-cinema-camera';

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Camera Rental Catalog
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Professional camera equipment for rent
        </p>
      </div>

      {/* Filter: text + kategori + tombol Search */}
      <div className="flex flex-col xl:w-1/2 sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <label htmlFor="search-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cari nama produk
            </label>
            <input
              id="search-text"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Contoh: Canon, Sony..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="search-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kategori
            </label>
            <select
              id="search-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Semua</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
            aria-label="Search"
          >
            <Search size={20} />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={handleResetFilter}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-colors"
            aria-label="Reset filter"
          >
            <RotateCcw size={20} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isHighlighted={product.slug === highlightedProductSlug}
              />
            ))}
          </div>

          {!error && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {allProducts.length === 0
                  ? 'Belum ada produk. Tambah data di Google Sheet (tab Products, Categories, Manufacturers, Images) lalu refresh halaman.'
                  : 'Tidak ada produk yang cocok. Coba ubah kata kunci atau kategori.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
