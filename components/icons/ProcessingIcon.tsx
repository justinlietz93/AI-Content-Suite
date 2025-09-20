

import React from 'react';
// FIX: Corrected the import path to point to the Spinner component in the `ui` directory.
import { Spinner } from '../ui/Spinner'; // Re-using Spinner as a generic processing icon

interface IconProps {
  className?: string;
}
export const ProcessingIcon: React.FC<IconProps> = ({ className }) => <Spinner className={className} />;