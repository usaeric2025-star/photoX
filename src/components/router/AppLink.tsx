import React from "react";
import { Link } from "@zoontek/chicane";

interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
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
