export interface SendEmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  idempotencyKey?: string;
}

export async function sendResendEmail(params: SendEmailParams): Promise<{ ok: boolean; status: number; body: unknown }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = params.from ?? process.env.NOTIFY_FROM_EMAIL ?? `no-reply@communitycraft.app`;

  if (!apiKey) {
    return { ok: false, status: 0, body: { error: 'RESEND_API_KEY not configured' } };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey;
  }

  const body = {
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body: data };
  } catch (_err) {
    return { ok: false, status: 0, body: { error: 'network' } };
  }
}

export function maskContact(contact: string, type: string): string {
  if (!contact) return '';
  try {
    if (type === 'email' && contact.includes('@')) {
      const [local, domain] = contact.split('@');
      if (local.length <= 2) return `**@${domain}`;
      const visible = local[0] + '*'.repeat(Math.min(3, Math.max(1, local.length - 2))) + local[local.length - 1];
      return `${visible}@${domain}`;
    }
    if (type === 'github') {
      return contact.length > 6 ? contact.slice(0, 3) + '...' + contact.slice(-2) : contact;
    }
    if (type === 'discord') {
      return contact.length > 6 ? contact.slice(0, 3) + '...' : contact;
    }
    return contact.length > 8 ? contact.slice(0, 4) + '...' + contact.slice(-2) : contact;
  } catch {
    return contact;
  }
}
