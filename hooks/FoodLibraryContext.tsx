"use client"
import React, { createContext, useContext } from 'react';
import { useFoodLibrary } from './use-food-library';

const FoodLibraryContext = createContext<ReturnType<typeof useFoodLibrary> | null>(null);

export const FoodLibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const foodLibrary = useFoodLibrary();
  return (
    <FoodLibraryContext.Provider value={foodLibrary}>
      {children}
    </FoodLibraryContext.Provider>
  );
};

export function useFoodLibraryContext() {
  const ctx = useContext(FoodLibraryContext);
  if (!ctx) throw new Error('useFoodLibraryContext must be used within FoodLibraryProvider');
  return ctx;
} 