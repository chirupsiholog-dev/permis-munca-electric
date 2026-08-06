import app from '../src/app.js';

//Vercel entry point. The platform handles listening, so this only hands back the
//Express app — vercel.json funnels every route here and Express routes from there.
export default app;

//Creating a permit chains fillPdf -> Supabase upload -> Namirial createEnvelope
//-> getViewerLinks, and the webhook's updateFinal downloads, zips and emails.
//Both run well past the default limit, so raise it here: `builds` in vercel.json
//rules out the `functions.maxDuration` route.
export const config = {
    maxDuration: 60
};
