import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatIds = process.env.TELEGRAM_CHAT_ID;

    if (!telegramBotToken || !telegramChatIds) {
      console.error('Telegram credentials not configured');
      return NextResponse.json(
        { error: 'Telegram not configured' },
        { status: 500 }
      );
    }

    // Parse chat IDs - support comma-separated or space-separated values
    const chatIdArray = telegramChatIds
      .split(/[,\s]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (chatIdArray.length === 0) {
      console.error('No valid Telegram chat IDs found');
      return NextResponse.json(
        { error: 'No valid Telegram chat IDs configured' },
        { status: 500 }
      );
    }

    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const results = [];
    const errors = [];

    // Send message to all chat IDs
    for (const chatId of chatIdArray) {
      try {
        const response = await fetch(telegramApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Telegram API error for chat ${chatId}:`, errorData);
          errors.push({ chatId, error: errorData });
        } else {
          const result = await response.json();
          results.push({ chatId, success: true, result });
        }
      } catch (error) {
        console.error(`Error sending Telegram message to ${chatId}:`, error);
        errors.push({ chatId, error: String(error) });
      }
    }

    // Return success if at least one message was sent successfully
    if (results.length > 0) {
      return NextResponse.json({
        success: true,
        sent: results.length,
        total: chatIdArray.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } else {
      // All sends failed
      return NextResponse.json(
        {
          error: 'Failed to send Telegram message to all recipients',
          errors,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return NextResponse.json(
      { error: 'Failed to send Telegram message' },
      { status: 500 }
    );
  }
}
