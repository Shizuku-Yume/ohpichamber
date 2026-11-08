import React from 'react';
import { ProviderLogo } from '@/components/ui/ProviderLogo';

/**
 * Local usage provider logo component for chat work-status.
 * Falls back cleanly to ProviderLogo.
 */
export const QuotaProviderLogo: React.FC<{ providerId: string; className?: string }> = ({ providerId, className }) => {
 return <ProviderLogo providerId={providerId} className={className} />;
};
