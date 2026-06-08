import { Capability } from '@/config/permissions';
import { logger } from '@/lib/logger';

export const authGuard = async ({ 
  context, 
  location 
}: { 
  context: { user: any }; 
  location: { pathname: string; search: any } 
}) => {
  const { user } = context;
  logger.debug('🛡️ Route Guard Check:', { 
    pathname: location.pathname, 
    hasUser: !!user 
  });
  // Guard only checks permissions/logs, does not handle redirections here as per current logic
  // Redirections can be added if needed
  return;
};
