import app from '../src/app.js';

//Vercel entry point. The platform handles listening, so this only hands back the
//Express app — vercel.json funnels every route here and Express routes from there.
//
//vercel.json uses the legacy `builds`/`routes` form on purpose: zero-config kept
//running a static build and failing on a missing output directory. Declaring
//`builds` opts out of framework detection entirely, so Vercel builds this one
//function and never looks for static output. Note vercel.json is schema-checked
//and rejects unknown keys, so it cannot carry comments — they live here instead.
export default app;

//Creating a permit chains fillPdf -> Supabase upload -> Namirial createEnvelope
//-> getViewerLinks, and the webhook's updateFinal downloads, zips and emails.
//Both run well past the default limit, so raise it here: `builds` in vercel.json
//rules out the `functions.maxDuration` route.
export const config = {
    maxDuration: 60
};
