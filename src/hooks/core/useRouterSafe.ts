import { useRef } from 'react';
import { useParams, useLocation, useNavigate } from '@tanstack/react-router';

export const useRouterSafe = () => {
  const params = useParams({ strict: false });
  const location = useLocation();
  const navigate = useNavigate();

  const latestRef = useRef({ params, location, navigate });
  latestRef.current = { params, location, navigate };

  return {
    get params() { return latestRef.current.params },
    get location() { return latestRef.current.location },
    get navigate() { return latestRef.current.navigate },
  };
};
