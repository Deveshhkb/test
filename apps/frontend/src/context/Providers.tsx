'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeContext';
import { LocaleProvider } from './LocaleContext';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { WishlistProvider } from './WishlistContext';
import { AiAssistantProvider } from './AiAssistantContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <AiAssistantProvider>{children}</AiAssistantProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
