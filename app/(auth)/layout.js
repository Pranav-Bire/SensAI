import React from 'react'
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';


const AuthLayout = ({children}) => {
  return (
    <ClerkProvider apperance={{
      baseTheme: dark,
    }}>
    <div className="flex items-center justify-center pt-40 theme-dark">
        {children}
    </div>
    </ClerkProvider>
  );
};

export default AuthLayout;