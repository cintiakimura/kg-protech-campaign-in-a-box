import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function getAccessToken() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth credentials. Please configure GOOGLE_CLIENT_ID, google_oauth_client_secret, and GOOGLE_REFRESH_TOKEN in environment variables.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${data.error_description || data.error || 'Unknown error'}`);
  }
  
  return data.access_token;
}

async function fetchGmailMessages(accessToken) {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50',
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const data = await response.json();
  if (!data.messages) return [];

  const messages = await Promise.all(
    data.messages.map(async (msg) => {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return msgResponse.json();
    })
  );

  return messages.map(msg => {
    const headers = msg.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
    
    return {
      subject: getHeader('Subject'),
      from_email: getHeader('From').match(/<(.+?)>/)?.[1] || getHeader('From'),
      to_email: getHeader('To').match(/<(.+?)>/)?.[1] || getHeader('To'),
      date: getHeader('Date'),
      body: msg.snippet || '',
      folder: msg.labelIds?.includes('SENT') ? 'sent' : 'inbox',
      is_read: !msg.labelIds?.includes('UNREAD')
    };
  });
}

async function sendGmailMessage(accessToken, to, subject, body) {
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body
  ].join('\r\n');

  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    }
  );

  return response.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, to, subject, body } = await req.json();
    const accessToken = await getAccessToken();

    if (action === 'sync') {
      const messages = await fetchGmailMessages(accessToken);
      
      for (const msg of messages) {
        const existing = await base44.entities.EmailMessage.filter({
          subject: msg.subject,
          from_email: msg.from_email,
          date: msg.date
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.EmailMessage.create(msg);
        }
      }

      return Response.json({ 
        success: true, 
        synced: messages.length 
      });
    }

    if (action === 'send') {
      const result = await sendGmailMessage(accessToken, to, subject, body);
      
      await base44.asServiceRole.entities.EmailMessage.create({
        subject,
        from_email: 'info@kgprotech.com',
        to_email: to,
        body,
        folder: 'sent',
        is_read: true,
        date: new Date().toISOString()
      });

      return Response.json({ success: true, messageId: result.id });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Gmail sync error:', error);
    return Response.json({ 
      error: error.message || 'Unknown error',
      details: error.stack
    }, { status: 500 });
  }
});