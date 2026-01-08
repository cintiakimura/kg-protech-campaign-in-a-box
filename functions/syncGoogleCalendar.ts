import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function fetchCalendarEvents(accessToken) {
  const timeMin = new Date().toISOString();
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=50&orderBy=startTime&singleEvents=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const data = await response.json();
  if (!data.items) return [];

  return data.items.map(event => ({
    title: event.summary || 'No Title',
    description: event.description || '',
    start_time: event.start.dateTime || event.start.date,
    end_time: event.end.dateTime || event.end.date,
    meeting_link: event.hangoutLink || event.htmlLink || '',
    host_name: event.organizer?.displayName || event.organizer?.email || 'Unknown',
    attendees: event.attendees?.map(a => ({
      name: a.displayName || a.email,
      email: a.email,
      registered_at: new Date().toISOString()
    })) || []
  }));
}

async function createCalendarEvent(accessToken, event) {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start_time,
          timeZone: 'Europe/Paris'
        },
        end: {
          dateTime: event.end_time,
          timeZone: 'Europe/Paris'
        },
        attendees: event.attendees?.map(a => ({ email: a.email })) || [],
        conferenceData: {
          createRequest: {
            requestId: `webinar-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      })
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

    const { action, event } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    if (action === 'sync') {
      const events = await fetchCalendarEvents(accessToken);
      
      for (const evt of events) {
        const existing = await base44.entities.Webinar.filter({
          title: evt.title,
          start_time: evt.start_time
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.Webinar.create(evt);
        }
      }

      return Response.json({ 
        success: true, 
        synced: events.length 
      });
    }

    if (action === 'create') {
      const result = await createCalendarEvent(accessToken, event);
      
      const webinar = await base44.asServiceRole.entities.Webinar.create({
        title: event.title,
        description: event.description,
        start_time: event.start_time,
        end_time: event.end_time,
        meeting_link: result.hangoutLink || result.htmlLink,
        host_name: event.host_name || 'Cintia Kimura',
        attendees: event.attendees || []
      });

      return Response.json({ 
        success: true, 
        webinar,
        googleEventId: result.id 
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});