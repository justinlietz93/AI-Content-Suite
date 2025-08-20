
import React from 'react';
import { Spinner } from '../Spinner'; // Re-using Spinner as a generic processing icon

interface IconProps {
  className?: string;
}
export const ProcessingIcon: React.FC<IconProps> = ({ className }) => <Spinner className={className} />;
