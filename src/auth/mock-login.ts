// ----------------------------------------------------------------------
// Frontend-only mock authentication. No backend exists yet — this
// simulates a real login attempt against a single seeded demo account
// so the UX can show both the success path and a real validation error.
// ----------------------------------------------------------------------

export const DEMO_ACCOUNT = {
  email: 'borrower@pgfinance.com.ph',
  password: 'Password123',
  firstName: 'Stephanie',
  lastName: 'Molina',
};

export async function mockLogin(email: string, password: string) {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (email.toLowerCase() !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
    throw new Error('Incorrect email or password. Try borrower@pgfinance.com.ph / Password123.');
  }

  return { email: DEMO_ACCOUNT.email, firstName: DEMO_ACCOUNT.firstName, lastName: DEMO_ACCOUNT.lastName };
}

export const MOCK_OTP_CODE = '123456';

// ----------------------------------------------------------------------

export const ADMIN_DEMO_ACCOUNT = {
  email: 'admin@pgfinance.com.ph',
  password: 'Admin123',
  firstName: 'Ramon',
  lastName: 'Cruz',
};

export async function mockAdminLogin(email: string, password: string) {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (email.toLowerCase() !== ADMIN_DEMO_ACCOUNT.email || password !== ADMIN_DEMO_ACCOUNT.password) {
    throw new Error('Incorrect email or password. Try admin@pgfinance.com.ph / Admin123.');
  }

  return {
    email: ADMIN_DEMO_ACCOUNT.email,
    firstName: ADMIN_DEMO_ACCOUNT.firstName,
    lastName: ADMIN_DEMO_ACCOUNT.lastName,
  };
}
