import React, { useState, useEffect } from 'react';
import { ExternalLink, ThumbsUp, Tag } from 'lucide-react';

const SingleProductBanner = () => {
  const [currentProduct, setCurrentProduct] = useState(null);
  const [previousProductId, setPreviousProductId] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const products = [
    {
      id: "1005006756102491",
      title: "Professional Football Boots Soccer Shoes",
      description: "Mens Boys Professional Football Boots TF/FG Soccer Shoes High Ankle Kids Cleats",
      price: "18.32",
      originalPrice: "54.80",
      discount: "66%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/Sb309ef66364d4decb6e7a4c82f916b03j.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_oDM3yBb",
      feedback: "96.3%",
      sales: "535"
    },
    {
      id: "1005006876485319",
      title: "2pcs Tennis Rackets Included Tennis Bag",
      description: "2pcs Tennis Rackets Included Tennis Bag And Tennis Sports Exercise 21'' Racquet Set Youth Games Outdoor,Suitable for Beginner",
      price: "9.36",
      originalPrice: "25.78",
      discount: "63%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/Sbbc4795c36664a7daac8091c94fc7bb4T.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_om2FDVF",
      feedback: "87.5%",
      sales: "1286"
    },
    {
      id: "1005004932777511",
      title: "Anmeilu Backpack Waterproof",
      description: "Anmeilu Backpack Waterproof Bicycle Rucksack Outdoor Sport Knapsack for Climbing Hiking Running MTB Road Bike Hydration Backpack",
      price: "32.80",
      originalPrice: "30.30",
      discount: "7%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/S2660540f6178466581612c2d9584977bz.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_oE1zHh3",
      feedback: "97.5%%",
      sales: "32"
    },
    {
      id: "1005005945696436",
      title: "KELME Kids Soccer Shoes",
      description: "KELME Kids Soccer Shoes Authentic Cleats Football Shoes Match Training For Boys And Girls Breathable Outdoor Shoes",
      price: "64.30",
      originalPrice: "27.08",
      discount: "57%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/H57856688aa764c6b8913bdc09a4a495dR.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_onE0MUd",
      feedback: "96.7%%",
      sales: "73"
    },
  ];

  // Function to get a random product that's different from the previous one
  const getRandomProduct = () => {
    // Filter out the previous product
    const availableProducts = products.filter(product => product.id !== previousProductId);
    // Get random product from remaining products
    const randomIndex = Math.floor(Math.random() * availableProducts.length);
    return availableProducts[randomIndex];
  };

  // Update product every 10 seconds
  useEffect(() => {
    // Set initial product
    const initialProduct = getRandomProduct();
    setCurrentProduct(initialProduct);
    setPreviousProductId(initialProduct.id);

    // Change product every 10 seconds
    const interval = setInterval(() => {
      setIsVisible(false); // Start fade out
      
      // Wait for fade out to complete before changing product
      setTimeout(() => {
        const newProduct = getRandomProduct();
        setCurrentProduct(newProduct);
        setPreviousProductId(newProduct.id);
        setIsVisible(true); // Start fade in
      }, 300); // This should match the CSS transition duration
    }, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Don't render anything if no product is selected yet
  if (!currentProduct) return null;

  const handleClick = () => {
    window.open(currentProduct.affiliateLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden my-4">
      <div className="p-3">
        <div 
          onClick={handleClick}
          className={`block group hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer transition-opacity duration-300 ease-in-out ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex gap-3">
            <div className="relative w-24">
              <img
                src={currentProduct.image}
                alt={currentProduct.title}
                className="w-full h-24 object-contain rounded"
              />
              {currentProduct.discount !== "0%" && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-bl">
                  -{currentProduct.discount}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#40c456] line-clamp-2">
                {currentProduct.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                {currentProduct.description}
              </p>

              <div className="mt-1 flex items-center space-x-1">
                <span className="text-base font-bold text-[#40c456]">
                  ${currentProduct.price}
                </span>
                {currentProduct.discount !== "0%" && (
                  <span className="text-xs text-gray-400 line-through">
                    ${currentProduct.originalPrice}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                {currentProduct.feedback !== "N/A" && (
                  <div className="flex items-center">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    {currentProduct.feedback}
                  </div>
                )}
                <div className="flex items-center">
                  <Tag className="w-3 h-3 mr-1" />
                  {currentProduct.sales} sold
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