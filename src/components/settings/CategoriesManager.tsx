import React from 'react';
import { CategoriesSection } from './CategoriesSection';
import { ManufacturersSection } from './ManufacturersSection';
import { Category, Manufacturer } from '@/types';

interface CategoriesManagerProps {
  categories: Category[];
  deleteCategory: (id: string) => void;
  updateCategory: (id: string, data: Partial<Category>) => Promise<boolean>;
  addCategory: (name: string) => Promise<Category>;
  manufacturers: Manufacturer[];
  addManufacturer: (name: string) => Promise<Manufacturer>;
  updateManufacturer: (id: string, data: Partial<Manufacturer>) => Promise<boolean>;
  deleteManufacturer: (id: string) => void;
  cardClass: string;
  buttonStyles: any;
}

export function CategoriesManager(props: CategoriesManagerProps) {
  return (
    <>
      <CategoriesSection 
        categories={props.categories}
        cardClass={props.cardClass}
      />
      <ManufacturersSection 
        manufacturers={props.manufacturers}
        addManufacturer={props.addManufacturer}
        updateManufacturer={props.updateManufacturer}
        deleteManufacturer={props.deleteManufacturer}
        cardClass={props.cardClass}
        buttonStyles={props.buttonStyles}
      />
    </>
  );
};
