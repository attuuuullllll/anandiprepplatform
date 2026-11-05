import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({
      configured: false,
      message: 'Supabase credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
    }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      const isMissingTable = error.code === 'PGRST205' || error.message.includes('Could not find the table');
      return NextResponse.json({
        configured: true,
        connected: false,
        tablesCreated: false,
        error: error.message,
        hint: isMissingTable 
          ? 'Tables not found yet. Please copy supabase-schema.sql and click Run in your Supabase SQL Editor.'
          : error.message
      }, { status: 200 });
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      tablesCreated: true,
      message: 'Supabase is fully connected and all tables are live!'
    });
  } catch (err: any) {
    return NextResponse.json({
      configured: true,
      connected: false,
      error: err.message || 'Failed to ping Supabase'
    }, { status: 500 });
  }
}
