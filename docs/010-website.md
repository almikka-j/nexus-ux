# Website

> **Maintenance rule:** update this file whenever `src/layouts/main/*`,
> `src/layouts/config-nav-main.tsx`, `src/routes/paths.ts`'s marketing
> entries, or any `src/sections/<marketing-page>/**` view/section file
> changes.

## What this is

The public, unauthenticated marketing site for PG Finance (metadata
title says "HHC LMS", on-page copy says "PG Finance" / "PGFinance" /
"Prime Global Finance Corporation" — the codebase carries both names).
Every route here is a plain informational or lead-gen page: nobody logs
in, no session or role gates any of it, and none of it talks to the
rest of the LMS app. This is distinct from:

- `docs/020-borrower-application.md` / `docs/030-borrower-dashboard.md` /
  `docs/040-borrower-sign-in.md` — the authenticated borrower-facing app
  (`/borrower/*`, `/auth/*`).
- `docs/060-admin-dashboard.md`, `docs/050-admin-login.md`, and the other
  `docs/account-solicitation-*` / `docs/request-*` / per-pipeline-step
  docs — the internal staff LMS app (`/admin/*`).

The header's "Borrower's Login" and "Apply Now!" buttons
(`paths.auth.login` = `/auth/login`, `paths.auth.signUp` = `/auth/sign-up`)
are this site's only links into that authenticated world; the footer's
"Borrower's Login" link instead points off-app to
`https://account.pgfinance.com.ph/`, a separate external system.

Routes covered by this doc, each a `src/app/<route>/page.tsx` wrapped in
`MainLayout` rendering one View component from
`src/sections/<name>/view`:

| Route | View | Section dir |
|---|---|---|
| `/` | `HomeView` | `src/sections/home` |
| `/about-us` | `AboutView` | `src/sections/about` |
| `/contact` | `ContactView` | `src/sections/contact` |
| `/faq` | `FAQView` | `src/sections/faq` |
| `/faq/[id]` | `FAQDetailsView` | `src/sections/faq` |
| `/faq/search-result` | `FAQSearchResult` | `src/sections/faq` |
| `/news` | `NewsView` | `src/sections/news` |
| `/news/[id]` | `NewsDetailsView` | `src/sections/news` |
| `/terms` | `TermsView` | `src/sections/terms` |
| `/privacy-policy` | `PrivacyPolicyView` | `src/sections/privacy-policy` |
| `/internet-policy` | `InternetPolicyView` | `src/sections/internet-policy` |
| `/corporate-governance-policy` | `CorporateGovernancePolicyView` | `src/sections/corporate-governance-policy` |
| `/property-forsale` | `PropertyForsaleView` | `src/sections/property-forsale` |
| `/personal-loan` | `PersonalLoanView` | `src/sections/personal-loan` |
| `/housing-loan` | `HousingLoanView` | `src/sections/housing-loan` |
| `/business-loan` | `BusinessLoanView` | `src/sections/business-loan` |
| `/fast-loan` | `FastLoanView` | `src/sections/fast-loan` |
| `/clubshare-loan` | `ClubshareLoanView` | `src/sections/clubshare-loan` |
| `/sangla-titulo` | `SanglaTituloView` | `src/sections/sangla-titulo` |

Canonical path constants live in `src/routes/paths.ts` under `paths.loan.*`
(`personal`/`housing`/`business`/`fast`/`clubshare`/`sanglaTitulo`) plus
top-level `paths.root`/`about`/`contact`/`faqs`/`faqDetails(id)`/
`faqSearchResult`/`news`/`newsDetails(id)`/`terms`/`privacyPolicy`/
`internetPolicy`/`corporateGovernancePolicy`/`propertyForSale`. A code
comment in that file notes these constants are unused in practice — every
link in `layouts/main` and `sections/home` is a raw string literal
(`href="/about-us"` etc.), not `paths.about`. `paths.esg` (`/esg`) exists
in the constants file but there is no `src/app/esg` route and no in-scope
page links to it, so it's out of scope here.

## Shared layout, nav, footer

Every page above is wrapped the same way:

```
<MainLayout><SomeView /></MainLayout>
```

`MainLayout` (`src/layouts/main/layout.tsx`) composes
`LayoutSection` (`src/layouts/core/layout-section`) with a sticky
`CustomHeader` (`src/layouts/main/header.tsx`), a `Footer`
(`src/layouts/main/footer.tsx`), and wraps page content in `Main`
(`src/layouts/main/main.tsx`, a flex column `<main>`).

**Header** (`CustomHeader`, default export of `header.tsx`): sticky white
`AppBar`, `LogoFull` linking home, a desktop nav row (`lg` breakpoint up)
driven by `navData` from `src/layouts/config-nav-main.tsx`, and two CTAs —
"Borrower's Login" (soft button, `paths.auth.login`) and "Apply Now!"
(contained button, `paths.auth.signUp`). Below `lg` it collapses to a
hamburger `IconButton` that toggles a full-width dropdown
(`HeaderGridToggle`, same file) rendering the nav as accordion sections.
Top-level items with `children` open a MUI `Menu` popover on desktop
click; items without `children` (Home, Property For Sale) link directly.

`navData` (`src/layouts/config-nav-main.tsx`) — the real site IA:

- **Home** → `/`
- **About Us** (dropdown) → About the Company (`/about-us`), Contact Us
  (`/contact`), FAQs (`/faq`) — a commented-out "News and Articles" →
  `/news` entry means `/news` has no nav entry point (see News below)
- **Loan Products** (dropdown) → Personal Loan, Housing Loan, Business
  Loan, Sangla Titulo, Clubshare Loan — a commented-out "Fast Loan" entry
  means `/fast-loan` is also unreachable from the nav
- **Property For Sale** → `/property-forsale`
- **Regulatory** (dropdown) → Privacy Policy, Internet Policy Statement —
  a commented-out "Corporate Governance Policy" entry means
  `/corporate-governance-policy` has no nav entry point either

So three routes in scope (`/news`, `/fast-loan`,
`/corporate-governance-policy`) are live pages with no header/footer link
pointing at them; they're reachable only by direct URL (or, for
`/fast-loan`, via `HomeLoan`'s card grid — see below).

**Footer** (`Footer`, `src/layouts/main/footer.tsx`): a `Newsletter`
component (`src/components/newsletter`, not itself an in-scope page) then
a four/five-column grid — brand blurb + social links (Instagram,
LinkedIn, Facebook, TikTok, all hardcoded `pgfinanceph`/
`primeglobalfinance` URLs), Quick Links (Home, About Us, Property For
Sale, Borrower's Login → external `account.pgfinance.com.ph`), Loan
Products (Personal/Housing/Business/Sangla Titulo/Clubshare — Fast Loan
omitted here too), Contact Us (static email/phone/address text), and a
DPO (Data Privacy Officer) accreditation image. A bottom bar links
Privacy Policy and Terms & Conditions and shows a copyright line ("©2025
PGFinance... Powered by GVTech Solutions Inc."). Below `md` each column
collapses into an accordion (`FooterGridToggle`).

## Home (`/`)

`HomeView` (`src/sections/home/view/home-view.tsx`) composes, in order:
a floating decorative DTI badge image, `HomeHero`, `HomeTestimonial`,
`HomeLoan`, `HomeAdvantages`, `HomeAbout`, `HomeAccreditation`,
`HomeNotice`.

- **`HomeHero`** — full-bleed textured hero, "Kasangga Mo Sa Pag-Asenso"
  headline + tagline ("since 1997"), embeds `LoanCalculatorForm` (see
  Loan calculator below), and on `lg`+ screens an autoplaying
  `HomeCarousel` (3 rotating photos, `embla-carousel-autoplay`) pinned to
  the right 45% of the viewport.
- **`HomeTestimonial`** — a looping `<video>` testimonial (hosted on an
  S3 bucket URL) plus a 5-star `Rating` and one named testimonial ("Mr. &
  Mrs. Nazaire").
- **`HomeLoan`** — "Our Solutions To Move you forward": 5 image cards
  (Personal, Housing, Business, Clubshare, Sangla Titulo — note the
  Sangla Titulo card's "Discover" button actually links to
  `/property-forsale`, not `/sangla-titulo`) each with a "Discover" CTA.
- **`HomeAdvantages`** — 3-item value-prop list (bank take-out loans,
  7-working-day approvals, discounted fire insurance) beside a static
  photo.
- **`HomeAbout`** — short company blurb + "About Us" button to
  `/about-us`.
- **`HomeAccreditation`** — logo strip of 6 accreditation bodies (SEC,
  PFA, CMAP, BAP, CIBI, CIC); only the SEC logo is an outbound link.
- **`HomeNotice`** — a dismissible full-screen modal image carousel
  (3 notice images) that auto-shows once per browser via
  `localStorage.getItem('noticeClosed')`; closing it sets
  `noticeClosed` so it won't reappear on that browser.

## About Us (`/about-us`)

`AboutView` (`src/sections/about/view/about-view.tsx`) is a single long
composition, no sub-components beyond the shared `HeroBannerSection`
(`src/components/hero-section`): hero banner, Mission/Vision list, a
"watch our video" static-thumbnail block (no real video player — just an
`<img>`), a photo + Sustainability/Values list, and a closing italic
call-to-action paragraph. All static copy, no data fetching.

## Contact (`/contact`)

`ContactView` (`src/sections/contact/view/contact-view.tsx`) renders
`ContactHero` (teal gradient banner) beside a two-column layout:
`ContactForm` and `ContactDetails`.

- **`ContactForm`** (`src/sections/contact/contact-form.tsx`) — a
  zod + `react-hook-form` form (first/last name, optional company,
  contact no., email, optional message). On valid submit it does **not**
  call any API — it just opens a `ConfirmDialog` showing the
  `Consent` component's newsletter/product-update consent text, with an
  "Agree" button that has no `onClick` handler at all. There is no
  backend endpoint for this form.
- **`ContactDetails`** (`src/sections/contact/contact-details.tsx`) — a
  static card: email, 4 phone numbers, office address, business hours,
  and the same 4 social links as the footer. Reused verbatim inside
  `FAQView` as well (see below).

## FAQ (`/faq`, `/faq/[id]`, `/faq/search-result`)

- **`/faq` → `FAQView`** (`src/sections/faq/view/faq-view.tsx`): a
  `FAQHero` ("How can we help?" — the search `TextField` under it is
  commented out, so there is no live search input on this page) beside
  `ContactDetails` and the real FAQ content, `FAQList`
  (`src/sections/faq/faq-list.tsx`). `FAQList` is a hardcoded array of
  ~20 accordion entries grouped into 8 categories (General Information,
  Collaterals, Types of Loans Offered, Loan Application, Loan Repayment,
  Repeat Loans and Credibility, Our Team, Contact Us) — genuine, specific
  site copy (rates, required docs, office locations), not placeholder
  text. No client-side filtering/search is wired to it on this page.
- **`/faq/[id]` → `FAQDetailsView`**: composes `FAQDetailsHero` +
  `FAQDetailsContent`. Neither component reads the `[id]` route param —
  `FAQDetailsHero` has one hardcoded question ("What types of loans do
  you offer?") and `FAQDetailsContent` is literally
  `<p>Lorem ipsum dolor sit amet.</p>`. Every `/faq/<anything>` URL
  renders identically; this route is an unwired placeholder.
- **`/faq/search-result` → `FAQSearchResult`**: reuses `FAQHero` +
  `FAQList` under a "Search Results for "[search]"" heading — the
  bracketed literal `[search]` is not interpolated from any query param,
  and `FAQList` here is the same static, unfiltered list as `/faq`. No
  search logic exists on this page either.

`FAQList2` and `FAQList3` (also exported from `faq-list.tsx`, used by the
loan pages below) are a different, much smaller single-item accordion
("What documents are needed if the loan has collateral?") pulling from
`personalLoanDetails.clubshareCollateralDocuments`
(`src/data/personal-loan.ts`) — `FAQList2` and `FAQList3` are
byte-for-byte duplicate implementations of the same component.

## News (`/news`, `/news/[id]`)

- **`/news` → `NewsView`**: `NewsHero` ("Kasangga Stories") + `NewsList`
  (`src/sections/news/news-list.tsx`, default export), a 3-card grid from
  a hardcoded `newsData` array (id/image/title only — no date, no body,
  no author). Every card's "Read More" button links to `href="#!"`, a
  dead link — none of the 3 news cards actually navigate to `/news/1`
  etc.
- **`/news/[id]` → `NewsDetailsView`**: `NewsDetailsHero` +
  `NewsDetailsContent`, neither of which reads the `[id]` param — the
  hero has one hardcoded headline/date ("PGFC and Philippine Guarantee
  Corporation partners for accessible housing loans" / "January 06,
  2023") and the content is one hardcoded multi-paragraph article with a
  static image. Same unwired-placeholder pattern as `/faq/[id]`: every
  `/news/<anything>` URL renders the same single article.

## Terms & Conditions (`/terms`)

`TermsView` = `TermsHero` (orange/navy gradient banner) + `TermsContent`
(`src/sections/terms/terms-content.tsx`) — static legal copy (CIC/Data
Privacy Act consent clauses) rendered with `DiscListing`/`CircleListing`
helpers from `src/components/custom-listing`.

## Privacy Policy (`/privacy-policy`)

`PrivacyPolicyView` = `PrivacyPolicyHero` + `PrivacyPolicyContent`
(`src/sections/privacy-policy/privacy-policy-content.tsx`) — the longest
static content page in scope: a full Data Privacy Act (RA 10173) notice
(collection, use, sharing, retention, rights, DPO contact block,
definitions, consent form), using the same `DiscListing`/
`CircleListing`/`NumberedListing`/`LowerAlphaListing` helpers.

## Internet Policy Statement (`/internet-policy`)

`InternetPolicyView` = `InternetPolicyHero` + `InternetPolicyContent`
(`src/sections/internet-policy/internet-policy-content.tsx`) — static
numbered-section policy (Purpose, Scope, Customer/Employee internet use,
Prohibited Activities, Data Privacy and Security, Social Media Use,
Monitoring and Enforcement, Policy Review) built with plain `<ol>`/`<ul>`
markup rather than the shared listing helpers.

## Corporate Governance Policy (`/corporate-governance-policy`)

`CorporateGovernancePolicyView` = `CorporateGovernancePolicyHero` +
`CorporateGovernancePolicyContent`
(`src/sections/corporate-governance-policy/corporate-governance-policy-content.tsx`).
Shortest of the policy pages: one intro paragraph plus `CGPList`
(`src/sections/corporate-governance-policy/cgp-list.tsx`), which renders
3 "document card" links (Latest Annual Report, Income Statement 2024,
Quarterly Financials Q1) — all three have `href: '#'`, so none actually
downloads or opens a document. Not reachable from the nav (see Shared
layout above).

## Property For Sale (`/property-forsale`)

`PropertyForsaleView` (`src/sections/property-forsale/view/property-forsale-view.tsx`):
`PropertyForsaleHero` beside an inquiry form (`PropertyForsaleForm`) and
a sidebar with two cards — "Available Properties" (a "See Property
Listing" button opening `ListingDialog`) and "About" (static
email/phone/address, same as `ContactDetails`' content but not reusing
that component).

- **`PropertyForsaleForm`** (`src/sections/property-forsale/property-forsale-form.tsx`)
  — zod schema only validates `email`, though the rendered fields include
  firstName/lastName/companyName/contactNo/email/property; `onSubmit` is
  an empty async handler (`async (data) => {}`) — no request is made, no
  success/error UI, nothing happens on submit at all.
- **`ListingDialog`** (`src/sections/property-forsale/listing-dialog.tsx`)
  — a full-screen dialog titled "Prime Global Finance Corporation Real
  Properties for Sale" showing one static image
  (`/images/PGFC-FOR-SALE-2025-9.png`); a commented-out property table +
  per-row "View" button (backed by an `ImageDialog` sub-component) is
  dead code, not rendered. Note `PropertyForsaleView` passes this
  component `title="Delete"` / `content="Are you sure want to
  delete?"` / a red "Delete" action button as props — all ignored,
  since `ListingDialog` hardcodes its own title/content and only uses
  `open`/`onClose`. Leftover copy-paste from a generic confirm-dialog
  pattern used elsewhere in the app.

## Loan product pages (6 pages)

`/personal-loan`, `/housing-loan`, `/business-loan`, `/fast-loan`,
`/clubshare-loan`, `/sangla-titulo` all share one template: a full-bleed
hero (`LoanType` primary/secondary label + headline + CTA button) over a
background image, then a two-column section — a loan calculator on the
left, a "List of Initial Requirements" bullet list + an FAQ accordion on
the right. Each view's `renderDetailedSection`/`renderItem` helpers and
most of the JSX are copy-pasted per page (large blocks of commented-out
alternate copy are left in every file). What actually differs:

| Page | View file | Calculator | Requirements list (from `src/data/personal-loan.ts`) | FAQ list | Notes |
|---|---|---|---|---|---|
| Personal Loan | `src/sections/personal-loan/view/personal-loan-view.tsx` | `LoanCalculatorForm` | `requiredDocuments` | `FAQList2` | CTA links to `n_housing_loan` (external `account.pgfinance.com.ph` URL — likely a copy/paste artifact) |
| Housing Loan | `src/sections/housing-loan/view/housing-loan-view.tsx` | `LoanCalculatorForm` | `requiredDocuments` | `FAQList2` | Same requirements list as Personal Loan |
| Business Loan | `src/sections/business-loan/view/business-loan-view.tsx` | `LoanCalculatorForm` | `businessloanRequiredDocuments` | `FAQList2` (imported via relative path) | CTA text differs ("Start your business loan application"), links `n_business_loan` |
| Fast Loan | `src/sections/fast-loan/view/fast-loan-view.tsx` | `LoanCalculatorForm` | `fastloanRequiredDocuments` | none | Only loan page with no FAQ list rendered; hero CTA button has no `href` at all (dead button) |
| Clubshare Loan | `src/sections/clubshare-loan/view/clubshare-loan-view.tsx` | `LoanCalculatorClubshare` | `clubshareRequiredDocuments` | `FAQList3` | Hero includes an extra clubshare logo image above the `LoanType` label |
| Sangla Titulo | `src/sections/sangla-titulo/view/sangla-titulo-view.tsx` | `LoanCalculatorSangla` | `requiredDocuments` (same as Personal/Housing) | `FAQList2` | Hero factored into its own `SanglaTituloHero` component (only loan page to do so); reuses the Property-For-Sale banner image |

### Loan calculator(s)

`LoanCalculatorForm` (`src/sections/home/loan-calculator-form.tsx`, also
used on Home), `LoanCalculatorClubshare`
(`src/sections/home/loan-calculator-clubshare.tsx`), and
`LoanCalculatorSangla` (`src/sections/home/loan-calculator-sangla.tsx`)
are three near-identical copies of one interactive widget: a loan-amount
numeric field + a loan-term (months, in 6-month steps up to 180)
autocomplete, a "Calculate Now" button that reveals an estimate panel
(loan amount, term, computed "Monthly Amortization"), and an "Apply"
button linking out to `account.pgfinance.com.ph`. All client-side only —
`onSubmit` never actually calls anything (react-hook-form is used purely
for the amount/term field validation, not to submit anywhere).

The only real difference between the three is the interest-rate constant
fed into a `balloonCalc(rate, nper, pv)` helper (simple-interest style:
`(pv + pv*rate*nper) / nper`) once the loan term is ≤ 60 months, or a
standard amortizing `PMT` formula once above 60 months (only
`LoanCalculatorForm` branches on this; the Clubshare and Sangla variants
always use `balloonCalc` regardless of term, with the `PMT`/`>60` branch
commented out):

- `LoanCalculatorForm`: `PMT(0.25/12, ...)` above 60 months, else
  `balloonCalc(0.013, ...)`
- `LoanCalculatorClubshare`: always `balloonCalc(0.012, ...)`
- `LoanCalculatorSangla`: always `balloonCalc(0.020, ...)`

## Non-goals / things not actually built

- **No CMS.** Every page's copy, FAQ entries, news articles, and loan
  requirement lists are hardcoded in `.tsx`/`.ts` source
  (`src/data/personal-loan.ts`, inline arrays in `faq-list.tsx` /
  `news-list.tsx`), not fetched from any API or content store.
- **No real form submission backend.** `ContactForm` and
  `PropertyForsaleForm` both validate client-side only and submit
  nowhere — no fetch/axios call, no success toast tied to a server
  response, no persisted lead. The Consent "Agree" button in
  `ContactForm`'s dialog has no handler at all.
- **No dynamic FAQ/news detail or search.** `/faq/[id]`, `/news/[id]`,
  and `/faq/search-result` all ignore their route/query params and
  render one fixed placeholder item each (`/faq/[id]`'s body is literal
  "Lorem ipsum dolor sit amet."). News list "Read More" links are dead
  (`href="#!"`).
- **No property listing data.** `/property-forsale`'s "See Property
  Listing" dialog shows one static flyer image; the commented-out table
  of individual properties (with per-row image viewer) was never wired
  up to any data source.
- **No document downloads on Corporate Governance Policy.** All three
  `CGPList` document links are `href="#"`.
- **Three in-scope pages have no navigation entry point**: `/news`,
  `/fast-loan`, `/corporate-governance-policy` are only reachable by
  direct URL — their `navData` entries are commented out in
  `src/layouts/config-nav-main.tsx`.
- **Duplicated components, not shared abstractions**: `FAQList2` and
  `FAQList3` are identical code; the three loan-calculator components
  differ only in one numeric constant; most of the 6 loan-page view
  files are near-identical copy-paste with large dead (commented-out)
  code blocks left in place.
