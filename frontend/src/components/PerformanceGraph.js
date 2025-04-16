import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine 
} from 'recharts';
import { InfoIcon } from 'lucide-react';
import { useAIStats } from '../hooks/useAIStats';

// Skeleton loader for stats
const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
  </div>
);

// Progressive loading stats card
const StatCard = React.memo(({ title, value, subtitle, color = 'green', tooltipText, isLoading }) => {
  if (isLoading) return <StatCardSkeleton />;
  
  return (
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
});

// Chart skeleton loader
const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-[300px] sm:h-[400px] bg-gray-100 rounded-lg"></div>
  </div>
);

// Custom tooltip to show accuracy with consistent decimal places
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value.toFixed(1)}%
            {entry.name === "Daily Accuracy" && (
              <span className="text-xs text-gray-600 block">
                {entry.payload.correct} of {entry.payload.predictions} predictions
              </span>
            )}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PerformanceGraph = () => {
  const [timeRange, setTimeRange] = useState(7);
  const { performanceData, overallStats, isLoading, error } = useAIStats();

  const { filteredData, stats } = React.useMemo(() => {
    if (!performanceData.length) {
      return { filteredData: [], stats: {} };
    }

    const filtered = [...performanceData]
      .slice(0, timeRange)
      .reverse()
      .map(day => ({
        ...day,
        overallAccuracy: overallStats?.overallAccuracy // Add overall accuracy to each data point
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

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats cards - show even while loading */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Overall Accuracy"
          value={isLoading ? '-' : `${stats.overallAccuracy?.toFixed(1)}%`}
          subtitle={isLoading ? 'Loading...' : `${stats.totalCorrect} of ${stats.totalPredictions} completed predictions`}
          color="green"
          tooltipText="Total correct predictions divided by total number of completed predictions"
          isLoading={isLoading}
        />
        <StatCard
          title="Average Daily"
          value={isLoading ? '-' : `${stats.avg?.toFixed(1)}%`}
          subtitle="Average of completed days"
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="Best Day"
          value={isLoading ? '-' : `${stats.best?.toFixed(1)}%`}
          subtitle={`Last ${timeRange} completed days`}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="Worst Day"
          value={isLoading ? '-' : `${stats.worst?.toFixed(1)}%`}
          subtitle={`Last ${timeRange} completed days`}
          color="red"
          isLoading={isLoading}
        />
      </div>

      {/* Chart section */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">AI Performance History</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${timeRange === days 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Last {days} Days
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px] sm:h-[400px]">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#6B7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6B7280"
                  fontSize={12}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{
                    paddingTop: "20px"
                  }}
                  onClick={(e) => {
                    // Add click handler for future interactivity if needed
                    console.log('Legend clicked:', e);
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  name="Daily Accuracy"
                  stroke="#2ECC40"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  animationDuration={1500}
                  animationBegin={0}
                  animationEasing="ease-in-out"
                />
                <Line
                  type="monotone"
                  dataKey="overallAccuracy"
                  name="Overall Accuracy"
                  stroke="#FF4136"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  animationDuration={2000}
                  animationBegin={300}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceGraph;