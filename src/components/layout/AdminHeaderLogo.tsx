import React from 'react';
import { HeaderLogo } from './header/HeaderLogo.js';
import { Theme } from '#src/types/index.js';
import { usePermission } from '#src/hooks/index.js';

interface AdminHeaderLogoProps {
  logoUrl?: string | null;
  totalCount: number;
  theme: Theme;
}

export function AdminHeaderLogo({ logoUrl, totalCount, theme }: AdminHeaderLogoProps) {
  const { role } = usePermission();
  const badgeVariant = role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : 'guest';
  const badgeText = role === 'admin' ? 'Admin' : role === 'staff' ? 'Staff' : 'Guest';

  return (
    <HeaderLogo
      logoUrl={logoUrl}
      totalCount={totalCount}
      badge={{ text: badgeText, variant: badgeVariant }}
      theme={theme}
    />
  );
}
