import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Box, Stack, Button, Typography } from '@mui/material';

import { Form, Field } from 'src/components/hook-form';

export type ContactSchemaType = zod.infer<typeof ContactSchema>;

export const ContactSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
});

export function PropertyForsaleForm() {
  const defaultValues = {
    email: '',
  };

  const methods = useForm<ContactSchemaType>({
    resolver: zodResolver(ContactSchema),
    defaultValues,
  });

  const { handleSubmit } = methods;

  const onSubmit = handleSubmit(async (data) => {});

  const styles = {
    field: {
      backgroundColor: 'white',
      borderColor: 'gray',
      borderRadius: '8px',
    },
  };

  return (
    <Box mb={10}>
      <Box textAlign={{ xs: 'center', md: 'left' }} mb={4}>
        <Typography sx={{ fontSize: { xs: 25, md: 30 }, fontWeight: 600, color: '#0B1E59', mb: 1 }}>
          Send your Inquiry
        </Typography>
        <Typography fontSize={{ xs: 14, md: 16 }} color="#6B6C70">
          Looking to invest or own PG Finance&apos;s Real Estate Property or Other Assets? Check out
          the available residential and lot properties here.
        </Typography>
      </Box>

      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }}>
            <Stack sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                First Name
              </Typography>
              <Field.Text name="firstName" placeholder="First Name" sx={{ ...styles.field }} />
            </Stack>
            <Stack sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Last Name
              </Typography>
              <Field.Text name="lastName" placeholder="Last Name" sx={{ ...styles.field }} />
            </Stack>
          </Stack>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Company (Optional)
            </Typography>
            <Field.Text name="companyName" placeholder="Company Name" sx={{ ...styles.field }} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }}>
            <Stack sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Contact No.
              </Typography>
              <Field.Text name="contactNo" placeholder="Contact No." sx={{ ...styles.field }} />
            </Stack>
            <Stack sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Email Address
              </Typography>
              <Field.Text
                name="email"
                type="email"
                placeholder="Email Address"
                sx={{ ...styles.field }}
              />
            </Stack>
          </Stack>

          <Stack sx={{ flex: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Property Inquiry
            </Typography>
            <Field.Text
              name="property"
              placeholder="Leave us a message..."
              multiline
              rows={4}
              sx={{ ...styles.field }}
            />
          </Stack>

          <Stack direction="row" justifyContent={{ xs: 'center', md: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              sx={{
                fontWeight: 600,
                borderRadius: '4px',
                width: { xs: 1, sm: 'auto' },
                py: 1,
                px: 4,
              }}
            >
              Submit
            </Button>
          </Stack>
        </Stack>
      </Form>
    </Box>
  );
}
