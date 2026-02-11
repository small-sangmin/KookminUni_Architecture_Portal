/**
 * Import Data to Supabase
 *
 * This script imports Firebase data from firebase-export.json
 * to the Supabase portal_data table.
 *
 * Prerequisites:
 *   1. Run 'node scripts/export-firebase.js' first
 *   2. Create Supabase project and set up database schema (see plan)
 *   3. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... \
 *   node scripts/import-supabase.js
 *
 * Input:
 *   firebase-export.json
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Get Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nExample:')
  console.error('  SUPABASE_URL=https://xxx.supabase.co \\')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... \\')
  console.error('  node scripts/import-supabase.js')
  process.exit(1)
}

async function importData() {
  console.log('📦 Reading firebase-export.json...')

  // Read Firebase export file
  if (!fs.existsSync('firebase-export.json')) {
    console.error('❌ firebase-export.json not found!')
    console.error('Please run "node scripts/export-firebase.js" first')
    process.exit(1)
  }

  const rawData = fs.readFileSync('firebase-export.json', 'utf8')
  const data = JSON.parse(rawData)

  const keyCount = Object.keys(data || {}).length
  console.log(`✅ Found ${keyCount} keys to import`)

  console.log('\n🔗 Connecting to Supabase...')

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('📤 Importing data to portal_data table...')

  // Convert Firebase data to Supabase rows
  const rows = []
  for (const [key, value] of Object.entries(data)) {
    rows.push({
      key,
      value: value
    })
  }

  // Insert in batches (Supabase has 1000 row limit per request)
  const batchSize = 100
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(rows.length / batchSize)

    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} rows)`)

    try {
      const { data: insertedData, error } = await supabase
        .from('portal_data')
        .upsert(batch, { onConflict: 'key' })

      if (error) {
        console.error(`❌ Batch ${batchNum} failed:`, error.message)
        failCount += batch.length
      } else {
        console.log(`✅ Batch ${batchNum} imported successfully`)
        successCount += batch.length
      }
    } catch (error) {
      console.error(`❌ Batch ${batchNum} failed:`, error.message)
      failCount += batch.length
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Import Summary:')
  console.log(`  Total keys: ${keyCount}`)
  console.log(`  ✅ Success: ${successCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
  console.log('='.repeat(50))

  if (failCount > 0) {
    console.log('\n⚠️  Some imports failed. Please check the errors above.')
    process.exit(1)
  }

  console.log('\n✅ Import complete!')
  console.log('\n📝 Next steps:')
  console.log('  1. Verify data in Supabase dashboard → Table Editor')
  console.log('  2. Update .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  console.log('  3. Run "npm run dev" to test locally')

  process.exit(0)
}

// Run import
importData().catch(error => {
  console.error('❌ Import failed:', error)
  process.exit(1)
})
