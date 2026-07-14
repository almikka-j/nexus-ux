import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Box, Grid, Button, Container } from '@mui/material';

import { useBoolean } from 'src/hooks/use-boolean';

import { Consent } from './consent';
import { ConfirmDialog } from '../custom-dialog';

export type NewsletterSchemaType = zod.infer<typeof NewsletterSchema>;

export const NewsletterSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
});

export function Newsletter() {
  const dialog = useBoolean(false);
  const defaultValues = {
    email: '',
  };

  const methods = useForm<NewsletterSchemaType>({
    resolver: zodResolver(NewsletterSchema),
    defaultValues,
  });

  const { handleSubmit } = methods;

  const onSubmit = handleSubmit(async (data) => {});

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: 3,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 1,
            height: { xs: 1, md: 284 },
            background:
              'url("/images/background/texture.png"), linear-gradient(to top, #0B1E59 0%, #1C388C 34%, #52D9D9 86%)',
            backgroundSize: 'auto, contain',
            backgroundRepeat: 'repeat, repeat-x',
            backgroundPosition: 'center, center',
          }}
        />
        <Container sx={{ position: 'relative', maxWidth: '1280px !important' }}>
          <Grid container spacing={3} alignItems="center" sx={{ py: { xs: 5, md: 3 } }}>
            <Grid item xs={12} md={7}>
              {/* <Box sx={{ color: 'white', textAlign: { xs: 'center', md: 'left' } }}>
                <Typography
                  sx={{
                    fontSize: { xs: 25, md: 35 },
                    fontWeight: 600,
                    lineHeight: 'normal',
                    mb: 1,
                  }}
                >
                  Join our Kasangga Community
                </Typography>
                <Typography fontSize={{ xs: 14, md: 16 }}>
                  Sign up to our newsletter for practical tips and updates to help you grow and
                  succeed
                </Typography>
              </Box> */}
            </Grid>
            {/* 
            <Grid item xs={12} md={5}>
              <Box>
                <Form methods={methods} onSubmit={onSubmit}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={{ xs: 1.5, md: 2 }}
                    alignItems="start"
                    mb={1}
                  >
                    <Field.Text
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      sx={{
                        backgroundColor: 'white',
                        borderColor: 'gray',
                        borderRadius: '8px',
                        fontSize: 16,
                        color: '#667085 !important',
                      }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      sx={{
                        bgcolor: 'white',
                        color: '#0B1E59',
                        width: { xs: 1, md: 'auto' },
                        fontWeight: 500,
                        borderRadius: '8px',
                        py: 2,
                        px: 4,
                        ':hover': {
                          bgcolor: 'white',
                          opacity: 0.6,
                        },
                      }}
                    >
                      Subscribe
                    </Button>
                  </Stack>

                  <Typography
                    color="white"
                    fontSize={12}
                    maxWidth={{ md: 360 }}
                    textAlign={{ xs: 'center', md: 'left' }}
                  >
                    By subscribing email, I agree to the{' '}
                    <button
                      type="button"
                      onClick={dialog.onTrue}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        color: 'white',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                      }}
                    >
                      terms and condition
                    </button>{' '}
                    and agree to receive relevant marketing content according to the privacy policy.
                  </Typography>
                </Form>
              </Box>
            </Grid> */}
          </Grid>  
        </Container>
      </Box>
      <ConfirmDialog
        open={dialog.value}
        onClose={dialog.onFalse}
        content={<Consent />}
        action={
          <Button
            variant="contained"
            color="primary"
            sx={{ fontWeight: 600, borderRadius: '4px', py: 1, px: 4 }}
          >
            Agree
          </Button>
        }
        title="Consent for Receiving Newsletters and Product Updates"
        size="md"
      />
    </>
  );
}
