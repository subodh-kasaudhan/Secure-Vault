/// <reference types="react" />

declare module 'react/jsx-runtime' {
  import { ReactElement, ReactNode } from 'react';
  
  export function jsx(
    type: React.ElementType,
    props: Record<string, any>,
    key?: string | number | null
  ): ReactElement;
  
  export function jsxs(
    type: React.ElementType,
    props: Record<string, any>,
    key?: string | number | null
  ): ReactElement;
  
  export const Fragment: React.ComponentType<{ children?: ReactNode }>;
}

