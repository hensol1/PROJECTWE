import React, { useState, useEffect } from 'react';
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
import { format, startOfToday, isBefore } from 'date-fns';
import { InfoIcon } from 'lucide-react';
import api from '../api';

const StatCard = ({ title, value, subtitle, color = 'green', tooltipText }) => (
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
);

const TimeRangeButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
      ${active 
        ? 'bg-green-100 text-green-700' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
  >
    {children}
  </button>
);

const PerformanceGraph = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7);
  const [overallStats, setOverallStats] = useState(null);

  const calculateStats = (data, overallStats) => {
    if (!data || data.length === 0) {
      return {
        avg: 0,
        avgByMatches: 0,
        best: 0,
        worst: 0,
        trend: 0,
        totalPredictions: overallStats?.totalPredictions || 0,
        totalCorrect: overallStats?.correctPredictions || 0,
        overallAccuracy: overallStats?.overallAccuracy || 0
      };
    }
  
    const avgByMatches = overallStats?.overallAccuracy || 0;
    const avg = data.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / data.length;
    
    const best = Math.max(...data.map(d => d.accuracy || 0));
    const worst = Math.min(...data.map(d => d.accuracy || 0));
    
    const last3 = data.slice(-3);
    const prev3 = data.slice(-6, -3);
    const last3Avg = last3.length > 0 
      ? last3.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / last3.length 
      : 0;
    const prev3Avg = prev3.length > 0 
      ? prev3.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / prev3.length 
      : 0;
    const trend = last3Avg - prev3Avg;
  
    return {
      avg,
      avgByMatches,
      best,
      worst,
      trend,
      totalPredictions: overallStats?.totalPredictions || 0,
      totalCorrect: overallStats?.correctPredictions || 0,
      overallAccuracy: overallStats?.overallAccuracy || 0
    };
  };

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setIsLoading(true);
        const response = await api.fetchAIHistory();
        const today = startOfToday();

        // Filter out today's data and transform
        const formattedData = response.stats
          .filter(stat => {
            const statDate = new Date(stat.date);
            return isBefore(statDate, today);
          })
          .map(stat => ({
            date: format(new Date(stat.date), 'MMM dd'),
            accuracy: parseFloat((stat.accuracy || 0).toFixed(1)),
            predictions: stat.totalPredictions || 0,
            correct: stat.correctPredictions || 0
          }));
  
        setPerformanceData(formattedData);
        setOverallStats(response.overall);
        setError(null);
      } catch (err) {
        setError('Failed to load performance data');
        console.error('Error fetching performance data:', err);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchPerformanceData();
  }, []);
  
  const filteredData = performanceData.slice(-timeRange);
  const stats = calculateStats(filteredData, overallStats);
    
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
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
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">AI Performance History</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <TimeRangeButton 
              active={timeRange === 7} 
              onClick={() => setTimeRange(7)}
            >
              Last 7 Days
            </TimeRangeButton>
            <TimeRangeButton 
              active={timeRange === 14} 
              onClick={() => setTimeRange(14)}
            >
              Last 14 Days
            </TimeRangeButton>
            <TimeRangeButton 
              active={timeRange === 30} 
              onClick={() => setTimeRange(30)}
            >
              Last 30 Days
            </TimeRangeButton>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                formatter={(value) => [`${value}%`]}
              />
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Overall Accuracy"
          value={`${stats.overallAccuracy.toFixed(1)}%`}
          subtitle={`${stats.totalCorrect} of ${stats.totalPredictions} completed predictions`}
          color="green"
          tooltipText="Total correct predictions divided by total number of completed predictions. This is our most accurate measurement of overall performance."
        />
        <StatCard
          title="Average Daily"
          value={`${stats.avg.toFixed(1)}%`}
          subtitle={`Average of completed days`}
          color="blue"
          tooltipText="Average of daily accuracy rates from completed days. This might differ from overall accuracy as days with few predictions carry equal weight."
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