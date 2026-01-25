import { NextRequest, NextResponse } from 'next/server';
import {
  getReminderById,
  markReminderComplete,
  updateReminderDueDate,
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
    const reminder = await getReminderById(id);

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reminder);
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminder' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const { action, dueDate } = body;

    if (action === 'complete') {
      const reminder = await markReminderComplete(id);
      return NextResponse.json(reminder);
    }

    if (action === 'update-due-date') {
      if (!dueDate) {
        return NextResponse.json(
          { error: 'dueDate is required' },
          { status: 400 }
        );
      }

      const result = await updateReminderDueDate(id, dueDate);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}
