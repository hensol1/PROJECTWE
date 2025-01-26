import React from 'react';
import { ExternalLink, ThumbsUp, Tag } from 'lucide-react';

const SingleProductBanner = ({ product }) => {
  const handleClick = () => {
    window.open(product.affiliateLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden my-4">
      <div className="p-2 bg-[#40c456] text-white font-semibold flex items-center justify-between">
        <span>Featured Deal</span>
        <ExternalLink className="w-3 h-3" />
      </div>
      
      <div className="p-3">
        <div 
          onClick={handleClick}
          className="block group hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
        >
          <div className="flex gap-3">
            <div className="relative w-24">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-24 object-contain rounded"
              />
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-bl">
                -{product.discount}
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#40c456] line-clamp-2">
                {product.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                {product.description}
              </p>

              <div className="mt-1 flex items-center space-x-1">
                <span className="text-base font-bold text-[#40c456]">
                  ${product.price}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  ${product.originalPrice}
                </span>
              </div>

              <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  {product.feedback}
                </div>
                <div className="flex items-center">
                  <Tag className="w-3 h-3 mr-1" />
                  {product.sales} sold
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleProductBanner;