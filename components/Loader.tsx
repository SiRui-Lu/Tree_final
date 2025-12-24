
import React from 'react';

interface LoaderProps {
  isLoading: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ isLoading }) => {
  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="w-10 h-10 border-t border-[#d4af37] rounded-full spinner mb-4"></div>
      <p className="cinzel text-[#d4af37] tracking-[0.2em] text-sm font-bold">LOADING HOLIDAY MAGIC</p>
    </div>
  );
};
