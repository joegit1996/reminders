import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSavedWebhooks,
  createSavedWebhook,
  initDatabase,
} from '@/lib/db';

let dbInitialized = false;

export async function GET() {
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }
    const webhooks = await getAllSavedWebhooks();
    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Error fetching saved webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved webhooks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const body = await request.json();
    const { name, webhookUrl } = body;

    // Validation
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

    const webhook = await createSavedWebhook(name, webhookUrl);
    return NextResponse.json(webhook, { status: 201 });
  } catch (error: any) {
    console.error('Error creating saved webhook:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A webhook with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create saved webhook' },
      { status: 500 }
    );
  }
}
