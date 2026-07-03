import React from "react";
import { Link } from "wouter";

interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: React.ReactNode;
}

export function AppLink({ to, children, className, ...props }: AppLinkProps) {
  return (
    <Link href={to} className={className} {...props}>
      {children}
    </Link>
  );
}
