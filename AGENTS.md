# Nursing Solutions Agent Guidelines

## Setup
1. Install dependencies: `npm install`
2. Create `.env.local` from `.env.example` and set `GEMINI_API_KEY`
   - Optional: Supabase credentials if using DB features (see `setup.sql`)

## Development
- Start dev server: `npm run dev` (Vite, port 3000, host 0.0.0.0)
- Lint (TypeScript check): `npm run lint`
- Build for production: `npm run build`
- Preview build: `npm run preview`
- Clean dist: `npm run clean`

## Deployment
- Auto-deploy to GitHub Pages via `.github/workflows/deploy.yml` on push to main/master
- Requires secrets: `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Vite config sets `base: './'` for correct asset loading on GitHub Pages

## Database Setup
- Run `setup.sql` in Supabase to create tables and policies
- Required tables: `staff`, `patients`
- RPC functions: `get_staff_by_category`, `get_staff_by_area`

## Notes
- Entry point: `index.html` with React root in `src/`
- Uses Vite + React + Tailwind CSS
- No backend server; frontend only (uses Gemini & Supabase clients directly)
- No test suite defined; lint is primary verification
- HMR disabled in AI Studio via `DISABLE_HMR=true` (do not modify)
- Guarantor fields (name/contact) are optional - show "No Record" instead of error when empty
- Phone numbers are automatically formatted to 03XX-XXXXXXX format