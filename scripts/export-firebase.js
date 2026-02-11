/**
 * Export Firebase Realtime Database Data
 *
 * This script exports all data from the Firebase Realtime Database
 * under the 'portal' node to a JSON file for migration to Supabase.
 *
 * Usage:
 *   node scripts/export-firebase.js
 *
 * Output:
 *   firebase-export.json
 */

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, get } from 'firebase/database'
import fs from 'fs'

// Firebase configuration (from src/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyA3yT_4no9dn4v1GIVpUkYeLjQo8jrcSAM",
  authDomain: "kookminarchiportal.firebaseapp.com",
  databaseURL: "https://kookminarchiportal-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kookminarchiportal",
  storageBucket: "kookminarchiportal.firebasestorage.app",
  messagingSenderId: "196510835085",
  appId: "1:196510835085:web:8ccb9df98c9fd849539dc4",
  measurementId: "G-83HGXX5H9E"
}

async function exportData() {
  console.log('🔥 Connecting to Firebase...')

  // Initialize Firebase
  const app = initializeApp(firebaseConfig)
  const database = getDatabase(app)

  console.log('📥 Fetching data from portal node...')

  // Get all data under 'portal' node
  const snapshot = await get(ref(database, 'portal'))

  if (!snapshot.exists()) {
    console.log('⚠️  No data found at portal node')
    return
  }

  const data = snapshot.val()

  // Count keys
  const keyCount = Object.keys(data || {}).length
  console.log(`✅ Found ${keyCount} keys`)

  // Write to JSON file
  const outputFile = 'firebase-export.json'
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2))

  console.log(`💾 Data exported to ${outputFile}`)
  console.log('\nKeys exported:')
  Object.keys(data || {}).forEach((key, index) => {
    console.log(`  ${index + 1}. ${key}`)
  })

  console.log('\n✅ Export complete!')
  console.log(`Next step: Run 'node scripts/import-supabase.js' to import to Supabase`)

  process.exit(0)
}

// Run export
exportData().catch(error => {
  console.error('❌ Export failed:', error)
  process.exit(1)
})
