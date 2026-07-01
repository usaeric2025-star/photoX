import { useState, useEffect } from 'react';
import { Icon } from '#src/components/ui/Icon';
import { useSearchTransition } from '#src/hooks';
import { Input } from '#src/components/shared/Input';
import { cn } from '#lib/utils';
import { LoadingSpinner } from './feedback/LoadingSpinner';

interface SearchInputProps {
  onSearch: (value: string) => void;
  value?: string;
  placeholder?: string;
  clearLabel?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput = ({
  onSearch,
  value: controlledValue = '',
  placeholder = 'Search...',
  clearLabel = 'Clear',
  className,
  autoFocus = false,
}: SearchInputProps) => {
  const [value, setValue] = useState(controlledValue);
  const { isPending, updateSearch } = useSearchTransition(onSearch);

  // Sync if controlledValue changes from outside (e.g. clear filters)
  useEffect(() => {
    setValue(controlledValue);
  }, [controlledValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    updateSearch(val);
  };

  const handleClear = () => {
    setValue('');
    updateSearch('');
  };

  return (
    <div className={cn("relative", className)}>
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="pl-9 pr-8"
      />
      {isPending && (
         <LoadingSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
      )}
      {!isPending && value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={clearLabel}
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
};
