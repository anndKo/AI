#!/usr/bin/env node
/**
 * Setup Supabase Storage Buckets
 * This script creates the required storage buckets for the payment system
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mlxzfwfxhertxgscudbf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1seHpmd2Z4aGVydHhnc2N1ZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzI4MzksImV4cCI6MjA4MzM0ODgzOX0.JbRwgbgIUV-gf8uTVXiiPJRiTIedpXygCceP6WivZt8';

// Note: For bucket creation, we need to use the Admin API
// This is a workaround using the anon key - in production, use service role key

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupBuckets() {
  try {
    console.log('🚀 Starting Supabase Storage bucket setup...\n');

    // Note: Creating buckets via the JS client requires admin privileges
    // We'll provide instructions for manual setup instead
    
    console.log('⚠️  Storage buckets need to be created manually in Supabase dashboard:');
    console.log('');
    console.log('1. Go to: https://app.supabase.com/project/mlxzfwfxhertxgscudbf/storage/buckets');
    console.log('');
    console.log('2. Create bucket named: "bills"');
    console.log('   - Visibility: Public');
    console.log('   - File size limit: 5MB');
    console.log('');
    console.log('3. Create bucket named: "admin-uploads"');
    console.log('   - Visibility: Public');
    console.log('   - File size limit: 5MB');
    console.log('');
    console.log('4. After creating buckets, this error should be resolved!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  }
}

setupBuckets();
