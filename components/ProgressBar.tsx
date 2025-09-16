

import React from 'react';
import type { ProgressUpdate } from '../types';
import { Spinner } from './Spinner';

interface ProgressBarProps {
  progress: ProgressUpdate;
}

// Helper function to format duration
const formatDuration = (totalSeconds: number, stage: string): string => {
  if (totalSeconds < 0) return "";
  if (totalSeconds === 0 && stage !== 'Completed') return "Almost done!";
  if (totalSeconds === 0 && stage === 'Completed') return ""; // No ETR needed if complete
  if (totalSeconds < 60) return `${Math.round(totalSeconds)} sec`;
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  
  if (minutes < 60) {
    return `${minutes} min ${seconds} sec`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};


export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="w-full p-4 bg-secondary rounded-lg shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Spinner className="w-5 h-5 mr-2 text-primary" />
          <span className="text-sm font-medium text-text-primary">{progress.stage}</span>
        </div>
        <span className="text-sm font-medium text-primary">{progress.percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-4">
        <div
          className="bg-primary h-4 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>
      {progress.message && (
        <p className="text-xs text-text-secondary mt-2 text-center">{progress.message}</p>
      )}
       {progress.current !== undefined && progress.total !== undefined && progress.stage !== 'Completed' && (
        <p className="text-xs text-text-secondary mt-1 text-center">
          Item {progress.current} of {progress.total}
        </p>
      )}
      {progress.etrSeconds !== undefined && progress.etrSeconds >= 0 && progress.stage !== 'Completed' && (
        <p className="text-xs text-sky-400 mt-1 text-center">
          Est. time remaining: {formatDuration(progress.etrSeconds, progress.stage)}
        </p>
      )}
      {progress.thinkingHint && progress.stage !== 'Completed' && (
        <p className="text-xs text-slate-400 italic mt-1 text-center">{progress.thinkingHint}</p>
      )}
    </div>
  );
};