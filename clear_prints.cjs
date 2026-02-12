const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) env[match[1]] = match[2].trim();
});

// Use SERVICE KEY to bypass RLS
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Check current data with service key
    const { data: allData, error: listErr } = await supabase
        .from('portal_data')
        .select('key')
        .like('key', 'portal/print%');

    console.log('Keys matching portal/print*:', allData?.map(d => d.key));

    // 2. Force delete with service key
    console.log('\nForce deleting portal/printRequests...');
    const { error: delErr, count } = await supabase
        .from('portal_data')
        .delete()
        .eq('key', 'portal/printRequests');

    if (delErr) {
        console.error('Delete error:', delErr.message);
    } else {
        console.log('Delete successful, count:', count);
    }

    // 3. Verify
    const { data: verify } = await supabase
        .from('portal_data')
        .select('key, value')
        .eq('key', 'portal/printRequests')
        .maybeSingle();

    console.log('After delete:', verify ? `Still exists with ${Array.isArray(verify.value) ? verify.value.length : 0} items` : 'Confirmed GONE');

    // 4. Also check if there's data stored under a different key
    const { data: allKeys } = await supabase
        .from('portal_data')
        .select('key')
        .like('key', '%print%');

    console.log('\nAll keys containing "print":', allKeys?.map(d => d.key));
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
