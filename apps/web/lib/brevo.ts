import { getAppUrl, getBrevoConfig, isBrevoConfigured } from './env';
import { formatCurrency } from '@aww/shared';

interface SendEmailInput {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: Array<{ name: string; contentBase64: string }>;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!isBrevoConfigured()) {
    console.warn('[Brevo] Email skipped — BREVO_API_KEY or BREVO_SENDER_EMAIL not configured');
    return { ok: false, skipped: true };
  }

  const { apiKey, senderEmail, senderName } = getBrevoConfig();
  const timeoutMs = input.attachments?.length ? 45_000 : 15_000;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [input.to],
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent ?? input.htmlContent.replace(/<[^>]+>/g, ''),
      attachment: input.attachments?.map((a) => ({
        name: a.name,
        content: a.contentBase64,
      })),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API error: ${err}`);
  }

  return { ok: true };
}

export async function sendWelcomeEmail(email: string, name: string) {
  const appUrl = getAppUrl();
  return sendEmail({
    to: { email, name },
    subject: 'Selamat datang di AWW Laundry!',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1E3A6E">Halo ${name}! 👋</h2>
        <p>Akun AWW Laundry Anda sudah aktif. Pesan cucian, lacak status, dan kumpulkan poin loyalty.</p>
        <p><a href="${appUrl}/customer" style="background:#FF8C2A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Buka Aplikasi</a></p>
        <p style="color:#888;font-size:12px">FRESH • CLEAN • FUN</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  return sendEmail({
    to: { email, name },
    subject: 'Reset Password AWW Laundry',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1E3A6E">Reset Password</h2>
        <p>Halo ${name}, klik tombol di bawah untuk reset password. Link berlaku 1 jam.</p>
        <p><a href="${resetUrl}" style="background:#4A90D9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a></p>
        <p style="color:#888;font-size:12px">Jika Anda tidak meminta reset, abaikan email ini.</p>
      </div>
    `,
  });
}

export async function sendCapexDueReminderEmail(input: {
  to: string;
  name: string;
  expenseTitle: string;
  branchName: string;
  vendor: string | null;
  amount: number;
  dueDate: Date;
  leadTime: '3 bulan' | '1 bulan';
}) {
  const dueLabel = input.dueDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const amountLabel = formatCurrency(input.amount);
  const appUrl = getAppUrl();

  return sendEmail({
    to: { email: input.to, name: input.name },
    subject: `[AWW Laundry] Pengingat CAPEX — jatuh tempo ${input.leadTime} lagi`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1E3A6E">
        <h2 style="color:#1E3A6E">Pengingat Pembayaran CAPEX</h2>
        <p>Halo ${input.name},</p>
        <p>Pembayaran CAPEX berikut akan <strong>jatuh tempo dalam ${input.leadTime}</strong>:</p>
        <div style="background:#F0F9FF;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>${input.expenseTitle}</strong></p>
          <p style="margin:0 0 4px">Cabang: ${input.branchName}</p>
          ${input.vendor ? `<p style="margin:0 0 4px">Vendor: ${input.vendor}</p>` : ''}
          <p style="margin:0 0 4px">Nominal: <strong style="color:#FF8C2A">${amountLabel}</strong></p>
          <p style="margin:0">Due date: <strong>${dueLabel}</strong></p>
        </div>
        <p>Segera siapkan pembayaran agar operasional cabang tidak terganggu.</p>
        <p><a href="${appUrl}/owner/cashflow" style="background:#FF8C2A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Lihat Cashflow</a></p>
        <p style="color:#888;font-size:12px;margin-top:24px">AWW Laundry — FRESH • CLEAN • FUN</p>
      </div>
    `,
  });
}

export async function sendStockOpnamePendingEmail(input: {
  to: string;
  name: string;
  branchName: string;
  submittedBy: string;
  periodLabel: string;
  lineCount: number;
  totalVarianceCost: number;
  cashVariance: number | null;
  inboxUrl: string;
}) {
  const varianceLabel = formatCurrency(input.totalVarianceCost);
  const cashLabel =
    input.cashVariance != null ? formatCurrency(input.cashVariance) : '—';

  return sendEmail({
    to: { email: input.to, name: input.name },
    subject: `[AWW Laundry] Stock Opname menunggu persetujuan — ${input.branchName}`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1E3A6E">
        <h2 style="color:#1E3A6E">Stock Opname Perlu Review</h2>
        <p>Halo ${input.name},</p>
        <p><strong>${input.submittedBy}</strong> telah menyelesaikan stock opname dan mengajukan persetujuan Anda:</p>
        <div style="background:#FFF7ED;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #FF8C2A33">
          <p style="margin:0 0 8px"><strong>${input.branchName}</strong></p>
          <p style="margin:0 0 4px">Periode: ${input.periodLabel}</p>
          <p style="margin:0 0 4px">Item dihitung: ${input.lineCount}</p>
          <p style="margin:0 0 4px">Selisih nilai stok: <strong style="color:#FF8C2A">${varianceLabel}</strong></p>
          <p style="margin:0">Selisih kas: <strong>${cashLabel}</strong></p>
        </div>
        <p>Silakan review dan approve di kotak masuk aplikasi.</p>
        <p><a href="${input.inboxUrl}" style="background:#FF8C2A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Buka Kotak Masuk</a></p>
        <p style="color:#888;font-size:12px;margin-top:24px">AWW Laundry — FRESH • CLEAN • FUN</p>
      </div>
    `,
  });
}

export async function sendMachineTroubleEmail(input: {
  to: string;
  name: string;
  machineName: string;
  machineType: string;
  branchName: string;
  reportedBy: string;
  note: string;
  inboxUrl: string;
}) {
  return sendEmail({
    to: { email: input.to, name: input.name },
    subject: `[AWW Laundry] Gangguan mesin — ${input.machineName} (${input.branchName})`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1E3A6E">
        <h2 style="color:#DC2626">Laporan Gangguan Mesin</h2>
        <p>Halo ${input.name},</p>
        <p><strong>${input.reportedBy}</strong> melaporkan masalah pada peralatan cabang:</p>
        <div style="background:#FEF2F2;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #FECACA">
          <p style="margin:0 0 8px"><strong>${input.machineName}</strong> <span style="color:#888">(${input.machineType})</span></p>
          <p style="margin:0 0 8px">Cabang: <strong>${input.branchName}</strong></p>
          <p style="margin:0">Keterangan: ${input.note}</p>
        </div>
        <p>Segera tindak lanjuti dan update status mesin di aplikasi.</p>
        <p><a href="${input.inboxUrl}" style="background:#FF8C2A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Buka Kotak Masuk</a></p>
        <p style="color:#888;font-size:12px;margin-top:24px">AWW Laundry — FRESH • CLEAN • FUN</p>
      </div>
    `,
  });
}

export async function sendCashflowReportEmail(input: {
  to: string;
  name: string;
  reportTitle: string;
  periodLabel: string;
  htmlContent: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
  csvBuffer: Buffer;
  csvFilename: string;
}) {
  const appUrl = getAppUrl();

  return sendEmail({
    to: { email: input.to, name: input.name },
    subject: `[AWW Laundry] ${input.reportTitle}`,
    htmlContent: `
      ${input.htmlContent}
      <div style="font-family:Arial,sans-serif;max-width:720px;margin:16px auto 0;text-align:center">
        <a href="${appUrl}/owner/cashflow" style="background:#FF8C2A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px">Buka Dashboard Cashflow</a>
      </div>
    `,
    attachments: [
      {
        name: input.pdfFilename,
        contentBase64: input.pdfBuffer.toString('base64'),
      },
      {
        name: input.csvFilename,
        contentBase64: input.csvBuffer.toString('base64'),
      },
    ],
  });
}
