import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import LoadingSpinner from './LoadingSpinner';
import { format, startOfToday, isBefore } from 'date-fns';
import { InfoIcon } from 'lucide-react';
import api from '../api';

// Memoized components for better performance
const StatCard = React.memo(({ title, value, subtitle, color = 'green', tooltipText }) => (
  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm relative group">
    <div className="flex items-center gap-1 mb-0.5">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-600">{title}</h3>
      {tooltipText && (
        <div className="relative">
          <InfoIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-xs rounded-lg w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            {tooltipText}
          </div>
        </div>
      )}
    </div>
    <div className="space-y-0.5">
      <p className={`text-xl sm:text-2xl font-bold text-${color}-600 leading-tight`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">
          {subtitle}
        </p>
      )}
    </div>
  </div>
));

const TimeRangeButton = React.memo(({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
      ${active 
        ? 'bg-green-100 text-green-700' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
  >
    {children}
  </button>
));

// Custom hook for data fetching
const usePerformanceData = () => {
  const [data, setData] = useState({ performanceData: [], overallStats: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await api.fetchAIHistory();
        const today = startOfToday();
        const PREDICTIONS_START = new Date('2025-01-15');

        const formattedData = response.stats
          .map(stat => ({
            date: new Date(stat.date),
            displayDate: format(new Date(stat.date), 'MMM dd'),
            accuracy: parseFloat((stat.accuracy || 0).toFixed(1)),
            predictions: stat.totalPredictions || 0,
            correct: stat.correctPredictions || 0
          }))
          .filter(stat => {
            const statDate = new Date(stat.date);
            return statDate >= PREDICTIONS_START && isBefore(statDate, today);
          })
          .sort((a, b) => b.date - a.date);

        const validPredictions = formattedData.reduce((acc, curr) => acc + curr.predictions, 0);
        const validCorrect = formattedData.reduce((acc, curr) => acc + curr.correct, 0);
        const overallAccuracy = validPredictions > 0 ? (validCorrect / validPredictions * 100) : 0;

        setData({
          performanceData: formattedData,
          overallStats: {
            totalPredictions: validPredictions,
            correctPredictions: validCorrect,
            overallAccuracy
          }
        });
      } catch (err) {
        setError('Failed to load performance data');
        console.error('Error fetching performance data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { ...data, isLoading, error };
};

const PerformanceGraph = () => {
  const [timeRange, setTimeRange] = useState(7);
  const { performanceData, overallStats, isLoading, error } = usePerformanceData();

  // Memoize filtered data and stats calculations
  const { filteredData, stats } = useMemo(() => {
    if (!performanceData.length) {
      return { filteredData: [], stats: {} };
    }

    const filtered = [...performanceData]
      .slice(0, timeRange)
      .reverse()
      .map(item => ({
        date: item.displayDate,
        accuracy: item.accuracy,
        predictions: item.predictions,
        correct: item.correct
      }));

    const daysWithPredictions = filtered.filter(day => day.predictions > 0);
    const stats = {
      avg: daysWithPredictions.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / (daysWithPredictions.length || 1),
      best: Math.max(...daysWithPredictions.map(d => d.accuracy || 0)),
      worst: Math.min(...daysWithPredictions.map(d => d.accuracy || 0)),
      overallAccuracy: overallStats?.overallAccuracy || 0,
      totalCorrect: overallStats?.correctPredictions || 0,
      totalPredictions: overallStats?.totalPredictions || 0
    };

    return { filteredData: filtered, stats };
  }, [performanceData, timeRange, overallStats]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Chart section */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">AI Performance History</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[7, 14, 30].map(days => (
              <TimeRangeButton 
                key={days}
                active={timeRange === days} 
                onClick={() => setTimeRange(days)}
              >
                Last {days} Days
              </TimeRangeButton>
            ))}
          </div>
        </div>

        <div className="h-[300px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="accuracy"
                name="Accuracy"
                stroke="#2ECC40"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Overall Accuracy"
          value={`${stats.overallAccuracy.toFixed(1)}%`}
          subtitle={`${stats.totalCorrect} of ${stats.totalPredictions} completed predictions`}
          color="green"
          tooltipText="Total correct predictions divided by total number of completed predictions"
        />
        <StatCard
          title="Average Daily"
          value={`${stats.avg.toFixed(1)}%`}
          subtitle="Average of completed days"
          color="blue"
        />
        <StatCard
          title="Best Day"
          value={`${stats.best.toFixed(1)}%`}
          subtitle={`Last ${timeRange} completed days`}
          color="green"
        />
        <StatCard
          title="Worst Day"
          value={`${stats.worst.toFixed(1)}%`}
          subtitle={`Last ${timeRange} completed days`}
          color="red"
        />
      </div>
    </div>
  );
};

export default PerformanceGraph;
