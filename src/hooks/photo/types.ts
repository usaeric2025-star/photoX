import { UseFormReturn } from "react-hook-form";
import { ProductFormData } from '@/types';

export type PhotoEditFormReturn = UseFormReturn<ProductFormData, any> & {
  isPending: boolean;
  save: (e?: React.BaseSyntheticEvent) => Promise<void>;
};
