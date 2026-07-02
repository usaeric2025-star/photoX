import React from 'react';
import { CategoriesSection } from './CategoriesSection.js';
import { ManufacturersSection } from './ManufacturersSection.js';
import { Category, Manufacturer } from '#src/types/index.js';

interface CategoriesManagerProps {
  categories: Category[];
  deleteCategory: (id: number) => void;
  updateCategory: (id: number, data: Partial<Category>) => Promise<boolean>;
  addCategory: (name: string) => Promise<Category>;
  manufacturers: Manufacturer[];
  addManufacturer: (name: string) => Promise<Manufacturer>;
  updateManufacturer: (id: string, data: Partial<Manufacturer>) => Promise<boolean>;
  deleteManufacturer: (id: string) => void;
  cardClass: string;
  buttonStyles: { [key in 'primary' | 'secondary' | 'accent']: string };
}

export function AssetManagementContainer(props: CategoriesManagerProps) {
  return (
    <>
      <CategoriesSection 
        categories={props.categories}
        addCategory={props.addCategory}
        updateCategory={props.updateCategory}
        deleteCategory={props.deleteCategory}
        cardClass={props.cardClass}
        buttonStyles={props.buttonStyles}
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
