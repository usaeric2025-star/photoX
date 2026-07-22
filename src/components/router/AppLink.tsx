import React from "react";
import { Link } from "react-router-dom";

interface AppLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: React.ReactNode;
}

export function AppLink({ to, children, className, ...props }: AppLinkProps) {
  return (
    <Link to={to} className={className} {...props}>
      {children}
    </Link>
  );
}

