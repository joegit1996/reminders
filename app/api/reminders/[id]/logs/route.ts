import { NextRequest, NextResponse } from 'next/server';
import {
  getUpdateLogs,
  initDatabase,
} from '@/lib/db';

let dbInitialized = false;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const id = parseInt(params.id);
    const logs = await getUpdateLogs(id);

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching update logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch update logs' },
      { status: 500 }
    );
  }
}
