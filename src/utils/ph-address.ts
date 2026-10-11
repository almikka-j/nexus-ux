// Sample PH zip code → province/city/barangay lookup, shared by the
// onboarding Personal Info step (step-personal-info.tsx) and the admin
// CI Report's own Residence/Neighborhood address fields. Not a real PSGC
// (Philippine Standard Geographic Code) import — just enough real zip
// codes/barangays across a handful of provinces to demo cascading address
// fields honestly, matching this prototype's "sample data, no real
// OCR/AI" pattern elsewhere in this app. A zip typed outside this table
// falls back to manual entry rather than blocking the user from
// continuing.
export type ZipLocation = { province: string; city: string; barangays: string[] };

export const PROVINCES = [
  'Metro Manila',
  'Cebu',
  'Davao del Sur',
  'Laguna',
  'Cavite',
  'Bulacan',
  'Ilocos Norte',
];

export const ZIP_LOCATIONS: Record<string, ZipLocation> = {
  '1121': {
    province: 'Metro Manila',
    city: 'Quezon City',
    barangays: ['Barangay Commonwealth', 'Barangay Batasan Hills', 'Barangay Holy Spirit', 'Barangay Payatas'],
  },
  '1000': {
    province: 'Metro Manila',
    city: 'Manila',
    barangays: ['Barangay 1 (Ermita)', 'Barangay 402 (Malate)', 'Barangay 660 (Sampaloc)'],
  },
  '1200': {
    province: 'Metro Manila',
    city: 'Makati',
    barangays: ['Barangay Bel-Air', 'Barangay Poblacion', 'Barangay San Lorenzo'],
  },
  '6000': {
    province: 'Cebu',
    city: 'Cebu City',
    barangays: ['Barangay Lahug', 'Barangay Capitol Site', 'Barangay Guadalupe', 'Barangay Mabolo'],
  },
  '6014': {
    province: 'Cebu',
    city: 'Mandaue City',
    barangays: ['Barangay Tipolo', 'Barangay Subangdaku', 'Barangay Centro'],
  },
  '8000': {
    province: 'Davao del Sur',
    city: 'Davao City',
    barangays: ['Barangay Poblacion', 'Barangay Buhangin', 'Barangay Talomo', 'Barangay Matina'],
  },
  '4027': {
    province: 'Laguna',
    city: 'Calamba',
    barangays: ['Barangay Real', 'Barangay Uno', 'Barangay Canlubang', 'Barangay Parian'],
  },
  '4026': {
    province: 'Laguna',
    city: 'Santa Rosa',
    barangays: ['Barangay Balibago', 'Barangay Tagapo', 'Barangay Market Area'],
  },
  '4114': {
    province: 'Cavite',
    city: 'Dasmariñas',
    barangays: ['Barangay Zone IV', 'Barangay San Agustin', 'Barangay Salawag'],
  },
  '4103': {
    province: 'Cavite',
    city: 'Bacoor',
    barangays: ['Barangay Zapote', 'Barangay Molino', 'Barangay Talaba'],
  },
  '3014': {
    province: 'Bulacan',
    city: 'Obando',
    barangays: ['Barangay Pag-asa (Pob.)', 'Barangay Binuangan', 'Barangay Paco', 'Barangay Salambao'],
  },
  '3017': {
    province: 'Bulacan',
    city: 'Malolos',
    barangays: ['Barangay Longos', 'Barangay Sumapang Matanda', 'Barangay Mabolo'],
  },
  '2900': {
    province: 'Ilocos Norte',
    city: 'Laoag City',
    barangays: ['Barangay 1 San Lorenzo', 'Barangay 2 San Guillermo', 'Barangay 12 Nalbo'],
  },
  '2905': {
    province: 'Ilocos Norte',
    city: 'Batac',
    barangays: ['Barangay Ablan', 'Barangay Cadaratan', 'Barangay Poblacion'],
  },
};

// Cities known for a province when no zip code has been entered yet (a
// free Province pick, not a zip lookup) — lets City offer a dropdown
// here too instead of falling back to open free text, same as the zip
// path's own City field.
export const PROVINCE_CITIES: Record<string, string[]> = (() => {
  const byProvince: Record<string, Set<string>> = {};
  Object.values(ZIP_LOCATIONS).forEach(({ province, city }) => {
    byProvince[province] ??= new Set();
    byProvince[province].add(city);
  });
  return Object.fromEntries(Object.entries(byProvince).map(([province, cities]) => [province, Array.from(cities)]));
})();

// Barangays known for a province+city pair when no zip code has been
// entered yet.
export function barangaysFor(province: string, city: string): string[] {
  const match = Object.values(ZIP_LOCATIONS).find((loc) => loc.province === province && loc.city === city);
  return match?.barangays ?? [];
}
