import { ArrowLeft } from '@/components/ui/Icon';
import { Button } from '@/components/shared/Button';
import { Link } from '@tanstack/react-router';

interface PageHeaderProps {
  title: string;
  description?: string;
  backUrl?: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, description, backUrl, actions }: PageHeaderProps) => (
  <div className="flex items-center justify-between border-b pb-4">
    <div>
      <div className="flex items-center gap-2">
        {backUrl && (
          <Link 
            to={backUrl as any}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);
