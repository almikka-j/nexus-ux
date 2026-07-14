import type { DialogProps } from '@mui/material/Dialog';

import React, { useState } from 'react';

import { Box } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

export type ConfirmDialogProps = Omit<DialogProps, 'title' | 'content'> & {
  onClose: () => void;
  title: React.ReactNode;
  action: React.ReactNode;
  content?: React.ReactNode;
};

type ImageDialogProps = {
  open: boolean;
  imageUrl: string | null;
  onClose: () => void;
};

function ImageDialog({ open, imageUrl, onClose }: ImageDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{ width: { xs: 300, md: 600 }, height: { xs: 500, md: 800 }, mx: 'auto' }}
    >
      <Box
        component="img"
        src={imageUrl ?? '/images/property.jpg'}
        alt="Property"
        sx={{ width: 1, height: 1, objectFit: 'contain' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== `${window.location.origin}/images/property.jpg`) {
            target.src = '/images/property.jpg';
          }
        }}
      />
    </Dialog>
  );
}

export function ListingDialog({
  title,
  content,
  action,
  open,
  onClose,
  ...other
}: ConfirmDialogProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleViewImage = (imageUrl: string | undefined) => {
    setSelectedImage(imageUrl || null);
    setImageDialogOpen(true);
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setSelectedImage(null);
  };

  return (
    <>
      <Dialog fullWidth maxWidth="xl" open={open} onClose={onClose} {...other}>
        <DialogTitle sx={{ pb: 2 }}>
          Prime Global Finance Corporation Real Properties for Sale
        </DialogTitle>
        <DialogContent sx={{ typography: 'body2', px: 2 }}>
<Box
  component="img"
  alt="Business Loan"
  src="/images/PGFC-FOR-SALE-2025-9.png"
  sx={{ width: 1, height: 'auto', mb: 4 }}
/>
                      
        { /*  <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              color: '#1C252E',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
             <thead style={{ backgroundColor: '#F4F6F8' }}>
              <tr>
                {Object.keys(PROPERTIES[0] || {})
                  .filter((key) => key !== 'img' && key !== 'image')
                  .map((key) => (
                    <th
                      key={key}
                      style={{
                        padding: '8px',
                        textAlign: 'left',
                        textTransform: 'capitalize',
                        color: '#637381',
                      }}
                    >
                      {key}
                    </th>
                  ))}
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    textTransform: 'capitalize',
                    color: '#637381',
                  }}
                >
                  Property Image
                </th>
              </tr>
            </thead> 
            <tbody>
              {PROPERTIES.map((property, idx) => (
                <tr key={idx}>
                  {Object.entries(property)
                    .filter(([key]) => key !== 'img' && key !== 'image')
                    .map(([_, value], i) => (
                      <td key={i} style={{ padding: '8px' }}>
                        {String(value)}
                      </td>
                    ))}
                  <td style={{ padding: '8px' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleViewImage((property as any)?.img)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table> */}
        </DialogContent>
      </Dialog>
      <ImageDialog
        open={imageDialogOpen}
        imageUrl={selectedImage}
        onClose={handleCloseImageDialog}
      />
    </>
  );
}
