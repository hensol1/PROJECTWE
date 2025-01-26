import React from 'react';
import { ExternalLink, ThumbsUp, Tag } from 'lucide-react';

const AffiliateProductBanner = () => {
  const products = [
    {
      id: "1005006973916216",
      title: "Baseus 65W Power Bank 20000mah",
      description: "Fast Charging with Built-in Cable",
      price: "61.28",
      originalPrice: "107.13",
      discount: "42%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/Se0dee031a8cd41bca30045d144553c2fs.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_okQQDVR",
      feedback: "95.4%",
      sales: "2712"
    },
    {
      id: "1005004932777511",
      title: "Anmeilu Backpack",
      description: "Waterproof Outdoor Sport Backpack",
      price: "29.84",
      originalPrice: "32.84",
      discount: "9%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/S2660540f6178466581612c2d9584977bz.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_oCQSUh7",
      feedback: "97.5%",
      sales: "35"
    }
  ];

  return (
<div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
<div className="p-3 bg-[#40c456] text-white font-semibold flex items-center justify-between">
        <span>Featured Deals</span>
        <ExternalLink className="w-4 h-4" />
      </div>
      
      <div className="p-3 space-y-4">
        {products.map((product) => (
          <a
            key={product.id}
            href={product.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block group hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
          >
            <div className="space-y-2">
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-32 object-contain rounded"
                />
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl">
                  -{product.discount}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#40c456] line-clamp-2">
                  {product.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                  {product.description}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <span className="text-lg font-bold text-[#40c456]">
                      ${product.price}
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      ${product.originalPrice}
                    </span>
                  </div>
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
          </a>
        ))}
      </div>
      
      <div className="p-2 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
        Sponsored Products
      </div>
    </div>
  );
};

export default AffiliateProductBanner;