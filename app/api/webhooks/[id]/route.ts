import { NextRequest, NextResponse } from 'next/server';
import {
  updateSavedWebhook,
  deleteSavedWebhook,
  initDatabase,
} from '@/lib/db';

let dbInitialized = false;

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
    const { name, webhookUrl } = body;

    if (!name || !webhookUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name and webhookUrl' },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'Invalid Slack webhook URL' },
        { status: 400 }
      );
    }

    const webhook = await updateSavedWebhook(id, name, webhookUrl);
    return NextResponse.json(webhook);
  } catch (error: any) {
    console.error('Error updating saved webhook:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A webhook with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update saved webhook' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const id = parseInt(params.id);
    await deleteSavedWebhook(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved webhook' },
      { status: 500 }
    );
  }
}
