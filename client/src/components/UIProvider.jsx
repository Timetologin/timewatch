// client/src/components/UIProvider.jsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import '../styles/ui.css';

export default function UIProvider({ children }) {
  return (
    <>
      <Toaster position="top-center" />
      {children}
    </>
  );
}
