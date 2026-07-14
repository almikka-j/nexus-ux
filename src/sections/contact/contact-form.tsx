import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Box, Stack, Button, Typography } from '@mui/material';

import { useBoolean } from 'src/hooks/use-boolean';

import { Form, Field } from 'src/components/hook-form';
import { Consent } from 'src/components/newsletter/consent';
import { ConfirmDialog } from 'src/components/custom-dialog';

export type ContactSchemaType = zod.infer<typeof ContactSchema>;

export const ContactSchema = zod.object({
  firstName: zod.string().min(1, { message: 'This field is required!' }),
  lastName: zod.string().min(1, { message: 'This field is required!' }),
  companyName: zod.string().optional(),
  contactNo: zod.string().min(1, { message: 'This field is required!' }),
  email: zod
    .string()
    .min(1, { message: 'This field is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  message: zod.string().optional(),
});

export function ContactForm() {
  const dialog = useBoolean(false);

  const defaultValues = {
    firstName: '',
    lastName: '',
    companyName: '',
    contactNo: '',
    email: '',
    message: '',
  };

  const methods = useForm<ContactSchemaType>({
    resolver: zodResolver(ContactSchema),
    defaultValues,
  });

  const { handleSubmit, formState: { errors } } = methods;

  const onSubmit = handleSubmit(async (data) => {
    if (Object.keys(errors).length === 0) {
      dialog.onTrue();
    } else {
      methods.trigger();
    }
  });

  const styles = {
    field: {
      backgroundColor: 'white',
      borderColor: 'gray',
      borderRadius: '8px',
    },
  };

  return (
    <>
      <Box>
        <Box textAlign={{ xs: 'center', md: 'left' }} mb={4}>
          <Typography
            sx={{ fontSize: { xs: 25, md: 30 }, fontWeight: 600, color: '#0B1E59', mb: 1 }}
          >
            Send your Inquiry
          </Typography>
          <Typography fontSize={{ xs: 14, md: 16 }} color="#6B6C70">
            Have questions or need assistance? We&apos;re here to help. Get in touch with us using
            the contact information below or fill out the form, and we&apos;ll get back to you as
            soon as possible.
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

            <Stack sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Message
              </Typography>
              <Field.Text
                name="message"
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
                type="submit"
              >
                Submit
              </Button>
            </Stack>
          </Stack>
        </Form>
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
