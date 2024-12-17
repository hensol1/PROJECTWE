import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import HeaderLogo from './HeaderLogo';
import { Share2, X } from 'lucide-react';
import html2canvas from 'html2canvas';

const ShareStats = ({ stats, rankings, user }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flagUrl, setFlagUrl] = useState(null);

  const formatCountryCode = (countryName) => {
    if (!countryName) return '';
    
    const countryMappings = {
      'france': 'fr',
      'united states': 'us',
      'united kingdom': 'gb',
      'israel': 'il'
    };
  
    const lowercaseCountry = countryName.toLowerCase();
    return countryMappings[lowercaseCountry] || lowercaseCountry;
  };

  useEffect(() => {
    if (user?.country) {
      const code = formatCountryCode(user.country);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `https://flagcdn.com/24x18/${code}.png`;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        setFlagUrl(canvas.toDataURL());
      };
    }
  }, [user?.country]);

  const generateImage = async () => {
    setLoading(true);
    const element = document.getElementById('stats-card');
    try {
      if (element) {
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#FFFFFF', // Set white background
          logging: false,
          allowTaint: false,
          useCORS: true,
          removeContainer: false, // Ensure container is included
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('stats-card');
            if (clonedElement) {
              // Ensure the cloned element has a white background
              clonedElement.style.backgroundColor = '#FFFFFF';
              clonedElement.style.borderRadius = '8px';
              clonedElement.style.padding = '24px';
            }
          }
        });
        const url = canvas.toDataURL('image/png');
        setImageUrl(url);
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
    setLoading(false);
  };

  const handleShare = async (platform) => {
    if (!imageUrl) {
      await generateImage();
      return; // Return and let the user try again once image is generated
    }
  
    // Function to convert base64 to blob
    const base64ToBlob = async (base64) => {
      const response = await fetch(base64);
      const blob = await response.blob();
      return blob;
    };

  // Helper function to download image
  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'we-know-better-stats.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  switch (platform) {
    case 'facebook':
      try {
        // Share image and link to webapp
        const blob = await fetch(imageUrl).then(r => r.blob());
        const file = new File([blob], 'stats.png', { type: 'image/png' });

        if (navigator.share) {
          await navigator.share({
            files: [file],
            url: window.location.href,
            title: 'My Football Prediction Stats',
            text: 'Check out my football prediction stats on We Know Better!'
          });
        } else {
          // Fallback to Facebook dialog with link
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
            '_blank',
            'width=600,height=400'
          );
          // Also download the image so they can post it
          downloadImage();
        }
      } catch (error) {
        console.error('Error sharing to Facebook:', error);
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
          '_blank'
        );
      }
      break;

    case 'whatsapp':
      try {
        const blob = await fetch(imageUrl).then(r => r.blob());
        const file = new File([blob], 'stats.png', { type: 'image/png' });

        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: 'My Football Prediction Stats',
            text: 'Check out my football prediction stats on We Know Better!'
          });
        } else {
          // For desktop, download image and open WhatsApp
          downloadImage();
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent('Check out my football prediction stats on We Know Better!')}`;
          window.open(whatsappUrl, '_blank');
        }
      } catch (error) {
        console.error('Error sharing to WhatsApp:', error);
        downloadImage();
      }
      break;

    case 'instagram':
      // For Instagram, just download the image
      downloadImage();
      break;

    case 'download':
      // Simple download
      downloadImage();
      break;

    default:
      break;
  }
};

  const accuracy = stats?.finishedVotes > 0 
    ? ((stats.correctVotes / stats.finishedVotes) * 100).toFixed(1)
    : '0.0';

  const formatRank = (rank) => rank ? `#${rank}` : '#-';

  return (
    <>
      <Button
        onClick={() => {
          setShowDialog(true);
          generateImage();
        }}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        <Share2 className="w-4 h-4" />
        Share My Stats
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="px-4 py-3 flex justify-between items-center border-b">
            <DialogTitle className="text-lg font-semibold">Share Your Stats</DialogTitle>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={() => setShowDialog(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div id="stats-card" className="bg-white p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
              <div className="w-12">
                <HeaderLogo />
              </div>
              <div className="text-xl font-bold text-green-600">We Know Better</div>
            </div>

            <div className="mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {accuracy}%
                </div>
                <div className="text-sm text-gray-600">Overall Accuracy</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">
                  {formatRank(rankings?.global)}
                </div>
                <div className="text-xs text-gray-600">Global Rank</div>
              </div>

              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="flex flex-col items-center">
                  {flagUrl && (
                    <img 
                      src={flagUrl}
                      alt={user.country}
                      className="w-6 h-4 mb-1"
                    />
                  )}
                  <div className="text-lg font-semibold text-purple-600">
                    {formatRank(rankings?.country)}
                  </div>
                </div>
                <div className="text-xs text-gray-600">Country Rank</div>
              </div>

              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-semibold text-yellow-600">
                  {formatRank(rankings?.city)}
                </div>
                <div className="text-xs text-gray-600">
                  {user?.city || 'City'} Rank
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 mt-4">
              Join me in predicting football matches!
            </div>
          </div>

          <div className="grid grid-cols-4 border-t">
            <button
              onClick={() => handleShare('facebook')}
              className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 text-blue-600"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-sm mt-1">Facebook</span>
            </button>
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 text-green-600"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span className="text-sm mt-1">WhatsApp</span>
            </button>
            <button
              onClick={() => handleShare('instagram')}
              className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 text-pink-600"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="text-sm mt-1">Instagram</span>
            </button>
            <button
              onClick={() => handleShare('download')}
              className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 text-gray-600"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              <span className="text-sm mt-1">Download</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareStats;