
import React from 'react';

interface IconProps {
  className?: string;
}

export const GearIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226a11.95 11.95 0 011.697-.034 11.95 11.95 0 011.697.034c.55.219 1.02.684 1.11 1.226a11.91 11.91 0 01.328 1.48a11.905 11.905 0 011.48.328c.542.09.96.47 1.226 1.018a11.952 11.952 0 01.034 1.697c-.219.55-.684 1.02-1.226 1.11a11.905 11.905 0 01-.328 1.479c-.09.542-.56 1.007-1.11 1.226a11.952 11.952 0 01-1.697.034 11.952 11.952 0 01-1.697-.034c-.55-.219-1.02-.684-1.11-1.226a11.91 11.91 0 01-.328-1.479 11.905 11.905 0 01-1.48-.328c-.542-.09-.96-.47-1.226-1.018a11.952 11.952 0 01-.034-1.697c.219-.55.684-1.02 1.226-1.11a11.905 11.905 0 01.328-1.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
