import React, { useState, useEffect } from 'react';
import { ExternalLink, ThumbsUp, Tag } from 'lucide-react';

const SingleProductBanner = () => {
  const [currentProduct, setCurrentProduct] = useState(null);
  const [previousProductId, setPreviousProductId] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const products = [
    {
      id: "1005007881702130",
      title: "Newell's Old Boys Cotton Hoodie",
      description: "Football Soccer Argentina Napoli Ronaldo Legend Vintage Diego Maradona Retro",
      price: "9.00",
      originalPrice: "18.00",
      discount: "50%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/Sb49f4458e8d2478ea66a8b49c432aea3p.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_oFeXAqv",
      feedback: "N/A",
      sales: "1"
    },
    {
      id: "1005007265250577",
      title: "Inflatable Bumper Ball Zorb Ball",
      description: "Bubble Football 1.2/1.5m Bubble Soccer Ball for kids adults",
      price: "61.15",
      originalPrice: "61.15",
      discount: "0%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/S806624eca395412088fb17b77cf9caadv.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_olVlVBP",
      feedback: "100.0%",
      sales: "1"
    },
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
      id: "1005006955115860",
      title: "Outdoor Sports Running Backpack",
      description: "Lightweight Marathon Running Backpack with Water Bottle Holder",
      price: "19.99",
      originalPrice: "39.98",
      discount: "50%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/Sf4b9c696b929437caad7bff26a8c6b0eO.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_oktuR4Z",
      feedback: "98.2%",
      sales: "324"
    },
    {
      id: "1005006876485319",
      title: "Sports Water Bottle 1L",
      description: "Leakproof BPA Free Water Bottle with Time Marker",
      price: "12.99",
      originalPrice: "25.98",
      discount: "50%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/Sbbc4795c36664a7daac8091c94fc7bb4T.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_om2FDVF",
      feedback: "97.9%",
      sales: "1243"
    },
    {
      id: "1005005945696436",
      title: "Sports Gym Bag with Shoe Compartment",
      description: "Waterproof Duffel Bag with Wet Pocket",
      price: "24.99",
      originalPrice: "49.98",
      discount: "50%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/S304ea43e4d2341b7a6875ae283076b04Y.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_oB7y4It",
      feedback: "98.5%",
      sales: "856"
    },
    {
      id: "1005004932777511",
      title: "Waterproof Outdoor Sport Backpack",
      description: "Hiking Camping Travel Backpack with Laptop Compartment",
      price: "29.84",
      originalPrice: "32.84",
      discount: "9%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/S2660540f6178466581612c2d9584977bz.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_oE1zHh3",
      feedback: "97.5%",
      sales: "35"
    },
    {
      id: "1005006263838027",
      title: "Compression Running Socks",
      description: "Athletic Performance Socks for Marathon Running",
      price: "8.99",
      originalPrice: "17.98",
      discount: "50%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/S5ac725031c5c4fcbaf811060f19eee92Q.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_olMbJtL",
      feedback: "98.8%",
      sales: "2456"
    },
    {
      id: "4000744514952",
      title: "Sports Resistance Bands Set",
      description: "Exercise Bands with Door Anchor and Handles",
      price: "15.99",
      originalPrice: "31.98",
      discount: "50%",
      image: "https://ae-pic-a1.aliexpress-media.com/kf/H57856688aa764c6b8913bdc09a4a495dR.jpg",
      affiliateLink: "https://s.click.aliexpress.com/e/_onE0MUd",
      feedback: "98.7%",
      sales: "3254"
    }
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