import { createClient } from "@supabase/supabase-js";


//load env file
try {
        process.loadEnvFile();
    } catch {
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing SUPABASE_URL or SUPABASE_API_KEY. Check that .env exists and that the app is started with --env-file=.env"
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey)
