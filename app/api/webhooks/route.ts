import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getAllSavedWebhooks,
  createSavedWebhook,
} from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhooks = await getAllSavedWebhooks(supabase);
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
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const webhook = await createSavedWebhook(supabase, user.id, name, webhookUrl);
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
