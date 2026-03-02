import { Link } from 'react-router-dom';
import type { Product } from '../types/product';
import { formatCurrency, getProductImageUrl } from '../utils/products';
import { ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  isHighlighted?: boolean;
}

const ProductCard = ({ product, isHighlighted = false }: ProductCardProps) => {
  const mainImage = product.images?.[0]?.image || '';
  const imageUrl = mainImage ? getProductImageUrl(mainImage) : '';
  const isInactive = (product.status || '').toUpperCase() === 'INACTIVE';
  const pricePerDay = product.price || 0;
  const price3Days = pricePerDay * 2;

  const cardClassName = `
    group block relative rounded-xl overflow-hidden
    bg-white dark:bg-gray-800
    border-2 border-gray-200 dark:border-gray-700
    transition-all duration-300 ease-out
    ${isInactive ? 'opacity-75 cursor-not-allowed border-gray-300 dark:border-gray-600' : 'hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 dark:hover:shadow-amber-500/5 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900'}
    ${isHighlighted && !isInactive ? 'ring-2 ring-amber-500/50 border-amber-400 dark:border-amber-500 shadow-lg' : ''}
  `;

  const content = (
    <>
      {/* Highlight badge */}
      {isHighlighted && !isInactive && (
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-amber-500 text-white text-xs font-semibold shadow-md">
          Pilihan
        </div>
      )}
      {/* Tidak tersedia badge */}
      {isInactive && (
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-gray-600 text-white text-xs font-semibold shadow-md">
          Tidak tersedia
        </div>
      )}

      {/* Image container with hover zoom */}
      <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title || product.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
            No Image
          </div>
        )}
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        {/* View hint on hover */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white text-sm font-medium shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <span>Lihat</span>
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 space-y-3 border-t border-gray-100 dark:border-gray-700/80">
        {/* Brand */}
        {product.manufacturer?.name && (
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {product.manufacturer.name}
          </p>
        )}

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 min-h-[2.5rem] group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
          {product.title || product.name}
        </h3>

        {/* Price block */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">dari</span>
          <span className={`text-lg font-bold ${isHighlighted ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(pricePerDay)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">/ hari</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatCurrency(price3Days)} / 3 hari
        </p>
      </div>
    </>
  );

  if (isInactive) {
    return <div className={cardClassName}>{content}</div>;
  }
  return (
    <Link to={`/product/${product.slug}`} className={cardClassName}>
      {content}
    </Link>
  );
};

export default ProductCard;
