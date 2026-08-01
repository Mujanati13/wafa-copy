import React, { useState, useEffect } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';

const OfferCountdown = ({ 
  endDate = new Date('2025-12-31T23:59:59'), 
  discountPercentage = 50,
  size = 120 
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      
      setTimeRemaining(remaining);
      setIsExpired(remaining === 0);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  const formatTime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}j ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="text-red-500 font-bold text-lg">Offre expirée</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="mb-3">
        <CountdownCircleTimer
          isPlaying
          duration={timeRemaining}
          initialRemainingTime={timeRemaining}
          colors={['#10b981', '#fbbf24', '#f97316', '#ef4444']}
          colorsTime={[timeRemaining * 0.75, timeRemaining * 0.5, timeRemaining * 0.25, 0]}
          size={size}
          strokeWidth={8}
        >
          {({ remainingTime }) => (
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-foreground">
                {formatTime(remainingTime)}
              </div>
            </div>
          )}
        </CountdownCircleTimer>
      </div>
      
      <div className="text-center">
        <div className="text-sm text-muted-foreground font-medium">
          Offre limitée
        </div>
        <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          -{discountPercentage}%
        </div>
      </div>
    </div>
  );
};

export default OfferCountdown;
