// backend/utils/dateHelpers.js
const { startOfDay, endOfDay, parseISO, format } = require('date-fns');
const { utcToZonedTime, zonedTimeToUtc } = require('date-fns-tz');

const getDateRange = (dateStr, timeZone = 'UTC') => {
  // Parse the input date string to a Date object in UTC
  const utcDate = parseISO(dateStr);
  
  // Convert UTC date to the user's timezone
  const zonedDate = utcToZonedTime(utcDate, timeZone);
  
  // Get start and end of day in user's timezone
  const startLocal = startOfDay(zonedDate);
  const endLocal = endOfDay(zonedDate);
  
  // Convert back to UTC for database query
  const startUtc = zonedTimeToUtc(startLocal, timeZone);
  const endUtc = zonedTimeToUtc(endLocal, timeZone);
  
  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString()
  };
};

// Modified Match route handler
const getMatchesForDate = async (date, timeZone) => {
  const { start, end } = getDateRange(date, timeZone);
  
  const matches = await Match.find({
    utcDate: {
      $gte: start,
      $lte: end
    }
  }).sort({ utcDate: 1 });

  return matches;
};

// Frontend date handling
const formatMatchDate = (utcDateStr, userTimeZone) => {
  const utcDate = parseISO(utcDateStr);
  const localDate = utcToZonedTime(utcDate, userTimeZone);
  return format(localDate, 'HH:mm');
};

module.exports = {
  getDateRange,
  getMatchesForDate,
  formatMatchDate
};

// Modified matches route
router.get('/', optionalAuth, async (req, res) => {
  const { date } = req.query;
  const timeZone = req.headers['x-timezone'] || 'UTC'; // Get timezone from request header
  
  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  try {
    const matches = await getMatchesForDate(date, timeZone);
    console.log(`Found ${matches.length} matches for ${date} in timezone ${timeZone}`);
    
    // Rest of your existing processing logic...
    res.json({ matches: processedMatches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Error fetching matches', error: error.message });
  }
});