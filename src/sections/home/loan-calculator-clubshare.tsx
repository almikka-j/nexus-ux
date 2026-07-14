import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import React, { useState, forwardRef } from 'react';
import { NumericFormat } from 'react-number-format';
import { zodResolver } from '@hookform/resolvers/zod';

import { Box, Paper, Stack, Button, Typography } from '@mui/material';

import { Form, Field } from 'src/components/hook-form';

export type LoanSchemaType = zod.infer<typeof LoanSchema>;

export const LoanSchema = zod.object({
  loanAmount: zod
    .number({ required_error: 'Loan Amount is required!' })
    .min(1, { message: 'Loan Amount must be at least 1!' }),
  loanTerm: zod
    .number({ required_error: 'Loan Term is required!' })
    .min(1, { message: 'Loan Term must be at least 1!' }),
});

interface NumberFormatCustomProps {
  inputRef: (instance: HTMLInputElement | null) => void;
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
  prefix?: string;
  decimalScale?: number;
  allowNegative?: boolean;
}

const NumericFormatInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => <input ref={ref} {...props} />);

NumericFormatInput.displayName = 'NumericFormatInput';

const NumberFormatCustom = forwardRef<HTMLInputElement, NumberFormatCustomProps>(
  ({ inputRef, onChange, name, prefix, decimalScale, allowNegative = false, ...rest }, ref) => (
    <NumericFormat
      getInputRef={inputRef}
      customInput={NumericFormatInput}
      thousandSeparator
      valueIsNumericString
      prefix={prefix}
      decimalScale={decimalScale}
      allowNegative={allowNegative}
      onValueChange={(values) => {
        onChange({
          target: {
            name,
            value: values.value,
          },
        });
      }}
      style={{
        border: '1px solid transparent',
        width: '100%',
        height: '55px',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        fontSize: 'inherit',
        fontFamily: 'inherit',
      }}
      defaultValue={200000}
    />
  )
);

NumberFormatCustom.displayName = 'NumberFormatCustom';

const LoanCalculatorClubshare = () => {
  const defaultValues = {
    loanAmount: 200000,
    loanTerm: 12,
  };

  const methods = useForm<LoanSchemaType>({
    resolver: zodResolver(LoanSchema),
    defaultValues,
  });

  const { handleSubmit } = methods;

  const [loanAmount, setLoanAmount] = useState<number | undefined>(200000);
  const [loanTerm, setLoanTerm] = useState<number | undefined>(12);
  const [showEstimate, setShowEstimate] = useState(false);

  const loanTerms = Array.from({ length: 30 }, (_, i) => (i + 1) * 6);

  const handleEstimate = () => {
    setShowEstimate(true);
  };

  const formatCurrency = (value: string | number) =>
    `PHP ${Number(value).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
    })}`;

  const PMT = (rate: number, nper: number, pv: number, fv = 0, type = 0) => {
    if (rate === 0) {
      return -(pv + fv) / nper;
    }
    const pvif = (1 + rate) ** nper;
    const payment = (-rate * (pv * pvif + fv)) / ((pvif - 1) * (1 + rate * type));
    return payment;
  };

  const balloonCalc = (rate: number, nper: number, pv: number) =>
    parseFloat(((pv + pv * rate * nper) / nper).toFixed(2));

  const onSubmit = handleSubmit((data) => {
    // Handle form submission logic here
  });

  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: 592,
        boxShadow:
          '0px 8px 8px -4px rgba(16, 24, 40, 0.03), 0px 20px 24px -4px rgba(16, 24, 40, 0.08)',
        px: { xs: 3, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box textAlign={{ xs: 'center', md: 'left' }} mb={3}>
        <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 600, color: '#0B1E59' }}>
          Calculate Your Loan Instantly
        </Typography>
        <Typography variant="body1" color="#545457">
          Get an estimate of your monthly payments and plan your finances with ease.
        </Typography>
      </Box>

      <Form onSubmit={onSubmit} methods={methods}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
          <Box width={1}>
            <Typography variant="body2" gutterBottom>
              Preferred Loan Amount
            </Typography>
            <Field.Text
              name="loanAmount"
              fullWidth
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value) || undefined)}
              placeholder=""
              type="number"
              variant="outlined"
              InputProps={{
                inputComponent: NumberFormatCustom as any,
              }}
            />
          </Box>
          <Box width={1}>
            <Typography variant="body2" gutterBottom>
              Preferred Loan Term (Months)
            </Typography>
            <Field.Autocomplete
              name="loanTerm"
              freeSolo
              options={loanTerms}
              getOptionLabel={(option) => String(option)}
              value={loanTerm}
              onChange={(event, newValue) => {
                setLoanTerm(Number(newValue) || 0);
              }}
              onInputChange={(event, newInputValue) => {
                setLoanTerm(Number(newInputValue) || 0);
              }}
            />
          </Box>
        </Stack>
        <Box>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleEstimate}
            sx={{
              fontSize: { xs: 14, md: 16 },
              fontWeight: 500,
              height: 44,
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              borderBottomRightRadius: showEstimate ? 0 : '4px',
              borderBottomLeftRadius: showEstimate ? 0 : '4px',
            }}
            disabled={showEstimate}
          >
            {showEstimate ? 'Loan Estimate' : 'Calculate Now'}
          </Button>
        </Box>

        {showEstimate && (
          <>
            <Box
              sx={{
                borderRadius: 2,
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                borderBottom="1px solid #E9E9E9"
                p={2}
              >
                <Typography>Loan Amount</Typography>
                <Typography>{formatCurrency(loanAmount ?? '')}</Typography>
              </Box>
              <Box
                display="flex"
                justifyContent="space-between"
                borderBottom="1px solid #E9E9E9"
                p={2}
              >
                <Typography>Loan Term</Typography>
                <Typography>{loanTerm} Months</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" p={2}>
                <Typography>Monthly Amortization</Typography>
                <Typography>
                  {loanTerm && loanAmount
                    ? formatCurrency(
                        // loanTerm > 60
                        //   ? -PMT(0.25 / 12, loanTerm, loanAmount, 0, 0)
                        balloonCalc( 0.012, loanTerm, loanAmount)
                      )
                    : 'PHP 0.00'}
                </Typography>
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              sx={{ fontSize: 14, fontWeight: 500, borderRadius: '4px', height: 50 }}
              target="_blank"
              href="https://account.pgfinance.com.ph/n_business_loan"
            >
              Apply
            </Button>
          </>
        )}
        <Typography variant="caption" color="text.secondary">
          * Interest rates may vary based on risk and other criteria.
        </Typography>
      </Form>
    </Paper>
  );
};

export default LoanCalculatorClubshare;
