'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeContext';
import { LocaleProvider } from './LocaleContext';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { WishlistProvider } from './WishlistContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>{children}</CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
