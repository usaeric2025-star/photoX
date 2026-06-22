import React from "react";
import { useRoute } from "@/router";

interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: {
    link: React.AnchorHTMLAttributes<HTMLAnchorElement>;
  };
  children: React.ReactNode;
}

export function AppLink({ to, children, className, ...props }: AppLinkProps) {
  return (
    <a {...to.link} className={className} {...props}>
      {children}
    </a>
  );
}
