import React from 'react';

interface ListingProps {
  children?: React.ReactNode;
}

export function NumberedListing({ children }: ListingProps) {
  return (
    <ol style={{ listStyleType: 'decimal', fontSize: 'inherit', margin: 0, paddingLeft: '24px' }}>
      {children}
    </ol>
  );
}

export function DiscListing({ children }: ListingProps) {
  return (
    <ul style={{ listStyleType: 'disc', paddingLeft: '24px', fontSize: 'inherit', margin: 0 }}>
      {children}
    </ul>
  );
}

export function CircleListing({ children }: ListingProps) {
  return (
    <ul style={{ listStyleType: 'circle', paddingLeft: '24px', fontSize: 'inherit', margin: 0 }}>
      {children}
    </ul>
  );
}

export function LowerRomanListing({ children }: ListingProps) {
  return (
    <ol
      style={{ listStyleType: 'lower-roman', paddingLeft: '24px', fontSize: 'inherit', margin: 0 }}
    >
      {children}
    </ol>
  );
}

export function LowerAlphaListing({ children }: ListingProps) {
  return (
    <ol
      style={{ listStyleType: 'lower-alpha', paddingLeft: '24px', fontSize: 'inherit', margin: 0 }}
    >
      {children}
    </ol>
  );
}
