#!/usr/bin/env node
/**
 * Verify Supabase Storage Buckets
 * This script checks if the required buckets exist
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const REQUIRED_BUCKETS = ['bills', 'admin-uploads'];

async function verifyBuckets() {
  try {
    console.log('🔍 Checking Supabase storage buckets...\n');

    // Try to list buckets (requires proper permissions)
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error accessing buckets:', error.message);
      console.log('\n⚠️  Note: Bucket listing requires admin privileges.');
      console.log('   This is expected with public key.');
      console.log('\n📝 Please verify buckets manually:');
      console.log(`   Dashboard: ${supabaseUrl}/storage/buckets`);
      return;
    }

    if (!buckets) {
      console.log('⚠️  Unable to retrieve bucket list');
      return;
    }

    const existingBuckets = buckets.map(b => b.name);
    console.log('📦 Existing buckets:', existingBuckets.join(', '));

    const missingBuckets = REQUIRED_BUCKETS.filter(
      bucket => !existingBuckets.includes(bucket)
    );

    console.log('');
    if (missingBuckets.length === 0) {
      console.log('✅ All required buckets exist!');
    } else {
      console.log('❌ Missing buckets:', missingBuckets.join(', '));
      console.log('\n📋 Please create the following buckets:');
      missingBuckets.forEach(bucket => {
        console.log(`   - ${bucket} (Public)`);
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyBuckets();
