import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import HeaderLogo from './HeaderLogo';
import { Share2, Download, Facebook, Instagram, X } from 'lucide-react';
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

  // Preload flag image
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
          backgroundColor: null,
          logging: false,
          allowTaint: false,
          useCORS: true
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
    }

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank');
        break;
      case 'instagram':
      case 'download':
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'we-know-better-stats.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (platform === 'instagram') {
          alert('Image downloaded! You can now share it on Instagram.');
        }
        break;
      default:
        break;
    }
  };

  // Calculate accuracy
  const accuracy = stats?.finishedVotes > 0 
    ? ((stats.correctVotes / stats.finishedVotes) * 100).toFixed(1)
    : '0.0';

  // Format ranks to show '-' if null or undefined
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
        <DialogContent className="sm:max-w-md mx-2 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-2 sm:mb-4">
            <DialogTitle className="text-base sm:text-lg font-semibold">Share Your Stats</DialogTitle>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={() => setShowDialog(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div id="stats-card" className="bg-white p-3 sm:p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-8 sm:w-12">
                <HeaderLogo />
              </div>
              <div className="text-lg sm:text-xl font-bold text-green-600">We Know Better</div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">
                  {accuracy}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Overall Accuracy</div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="text-center p-1.5 sm:p-2 bg-blue-50 rounded-lg">
                  <div className="text-base sm:text-lg font-semibold text-blue-600">
                    {formatRank(rankings?.global)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">Global Rank</div>
                </div>

                <div className="text-center p-1.5 sm:p-2 bg-purple-50 rounded-lg">
                  <div className="flex flex-col items-center">
                    {flagUrl && (
                      <img 
                        src={flagUrl}
                        alt={user.country}
                        className="w-5 h-3 sm:w-6 sm:h-4 mb-0.5 sm:mb-1"
                      />
                    )}
                    <div className="text-base sm:text-lg font-semibold text-purple-600">
                      {formatRank(rankings?.country)}
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">Country Rank</div>
                </div>

                <div className="text-center p-1.5 sm:p-2 bg-yellow-50 rounded-lg">
                  <div className="text-base sm:text-lg font-semibold text-yellow-600">
                    {formatRank(rankings?.city)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">
                    {user?.city || 'City'} Rank
                  </div>
                </div>
              </div>

              <div className="text-center text-xs sm:text-sm text-gray-500">
                Join me in predicting football matches!
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
            <Button
              onClick={() => handleShare('facebook')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-2 sm:px-4"
            >
              <Facebook className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Facebook
            </Button>
            <Button
              onClick={() => handleShare('instagram')}
              className="bg-pink-600 hover:bg-pink-700 text-white text-xs sm:text-sm px-2 sm:px-4"
            >
              <Instagram className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Instagram
            </Button>
            <Button
              onClick={() => handleShare('download')}
              variant="outline"
              className="text-xs sm:text-sm px-2 sm:px-4"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareStats;
