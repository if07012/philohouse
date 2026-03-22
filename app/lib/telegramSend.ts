/**
 * Send an HTML-formatted message to all configured Telegram chats.
 * Uses TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (comma/space-separated).
 */
export async function sendTelegramHtmlMessage(
  message: string
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatIds = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !telegramChatIds) {
    return { success: false, error: "Telegram not configured" };
  }

  const chatIdArray = telegramChatIds
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (chatIdArray.length === 0) {
    return { success: false, error: "No valid Telegram chat IDs" };
  }

  const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  let sent = 0;

  for (const chatId of chatIdArray) {
    try {
      const response = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      });
      if (response.ok) {
        sent += 1;
      } else {
        const err = await response.json().catch(() => ({}));
        console.error(`Telegram API error for chat ${chatId}:`, err);
      }
    } catch (e) {
      console.error(`Telegram send error for chat ${chatId}:`, e);
    }
  }

  if (sent > 0) {
    return { success: true, sent };
  }
  return { success: false, error: "Failed to send to all chats" };
}
