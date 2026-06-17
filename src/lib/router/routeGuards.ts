import { Capability } from '@/config/permissions';
import { logger } from '@/lib/logger';
import { User } from '@/types';

export interface GuardContext {
  user: User | null;
  role: string;
  can: (cap: Capability) => boolean;
}

export const authGuard = async ({ 
  context, 
  location 
}: { 
  context: GuardContext; 
  location: { pathname: string; search: any } 
}) => {
  const { user } = context;
  logger.debug('🛡️ Route Guard Check:', { 
    pathname: location.pathname, 
    hasUser: !!user 
  });
  
  if (location.pathname.startsWith('/admin') && !user) {
    throw new Error('Unauthorized access to admin area');
  }
  
  return;
};
