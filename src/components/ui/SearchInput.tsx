import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput = ({
  onSearch,
  placeholder = '搜索...',
  delay = 300,
  className,
  autoFocus = false,
}: SearchInputProps) => {
  const [value, setValue] = useState('');

  const debouncedSearch = useDebouncedSearch((val: string) => {
    onSearch(val);
  }, delay);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    debouncedSearch(val);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="pl-9 pr-8"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
