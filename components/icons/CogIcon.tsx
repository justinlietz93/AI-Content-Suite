
import React from 'react';

interface IconProps {
  className?: string;
}

export const CogIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0115 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.485 3.515l1.414-1.414M6.343 6.343l1.414 1.414m12.728 12.728l1.414-1.414M17.657 6.343l1.414 1.414M12 21.75V19.5m0-15V3m-3.515 8.485H6m12 0h-3.515" />
    </svg>
);
