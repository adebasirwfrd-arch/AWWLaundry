/** Server-side env helpers — jangan expose secret ke client. */

export function getAppUrl() {
  return process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export function isGoogleAuthConfigured() {
  return !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseStorageConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    (process.env.SUPABASE_STORAGE_BUCKET || process.env.S3_BUCKET_NAME)
  );
}

export function isBrevoConfigured() {
  return !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export function isOpenAIConfigured() {
  return !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('your_');
}

export function getOpenAIModel(kind: 'chatbot' | 'business' = 'chatbot') {
  return kind === 'business'
    ? process.env.OPENAI_MODEL_BUSINESS ?? 'gpt-4o-mini'
    : process.env.OPENAI_MODEL_CHATBOT ?? 'gpt-4o-mini';
}

export function getBrevoConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY ?? '',
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? 'noreply@awwlaundry.com',
    senderName: process.env.BREVO_SENDER_NAME ?? 'AWW Laundry',
  };
}

export function getOwnerNotificationEmail() {
  return process.env.OWNER_NOTIFICATION_EMAIL ?? 'ade.basirwfrd@gmail.com';
}

export function isWhatsAppConfigured() {
  return !!(
    (process.env.FONNTE_API_KEY && !process.env.FONNTE_API_KEY.startsWith('your_')) ||
    (process.env.WABLAS_API_KEY && !process.env.WABLAS_API_KEY.startsWith('your_'))
  );
}
