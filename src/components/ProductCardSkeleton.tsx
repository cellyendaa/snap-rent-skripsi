const ProductCardSkeleton = () => {
  return (
    <div
      className="rounded-xl overflow-hidden bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 animate-pulse"
      aria-hidden
    >
      <div className="w-full h-64 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
