import React from 'react';
import {
  ScheduleComponent,
  ViewsDirective,
  ViewDirective,
  Day,
  Week,
  WorkWeek,
  Month,
  Agenda,
  Inject,
  Resize,
  DragAndDrop
} from '@syncfusion/ej2-react-schedule';

function parseDateOnlyToLocal(dateStr) {
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatDateOnlyFromLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapGoogleToScheduler(items) {
  return (items || [])
    .map((evt) => {
      const isAllDay = Boolean(evt.start?.date && !evt.start?.dateTime);

      if (isAllDay) {
        const start = parseDateOnlyToLocal(evt.start.date);
        const end = parseDateOnlyToLocal(evt.end.date); 
        return {
          Id: evt.id,
          Subject: evt.summary || '(No title)',
          StartTime: start,
          EndTime: end,
          IsAllDay: true,
          Location: evt.location,
          Description: evt.description
        };
      }

      const start = evt.start?.dateTime;
      const end = evt.end?.dateTime;
      if (!start || !end) return null;

      return {
        Id: evt.id,
        Subject: evt.summary || '(No title)',
        StartTime: new Date(start),
        EndTime: new Date(end),
        IsAllDay: false,
        Location: evt.location,
        Description: evt.description
      };
    })
    .filter(Boolean);
}

function toGoogleEventResource(app) {
  if (app.IsAllDay) {
    const startDate = new Date(
      app.StartTime.getFullYear(),
      app.StartTime.getMonth(),
      app.StartTime.getDate()
    );
    let endDate = new Date(
      app.EndTime.getFullYear(),
      app.EndTime.getMonth(),
      app.EndTime.getDate()
    );
    if (+endDate <= +startDate) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }
    const resource = {
      summary: app.Subject,
      location: app.Location,
      description: app.Description,
      start: { date: formatDateOnlyFromLocal(startDate) },
      end: { date: formatDateOnlyFromLocal(endDate) }
    };
    if (app.RecurrenceRule) resource.recurrence = [`RRULE:${app.RecurrenceRule}`];
    return resource;
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const resource = {
    summary: app.Subject,
    location: app.Location,
    description: app.Description,
    start: { dateTime: new Date(app.StartTime).toISOString() },
    end: { dateTime: new Date(app.EndTime).toISOString() }
  };
  if (app.RecurrenceRule) {
    resource.start.timeZone = tz;
    resource.end.timeZone = tz;
    resource.recurrence = [`RRULE:${app.RecurrenceRule}`];
  }
  return resource;
}


//
class Schedule extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gisReady: false,
      token: null,
      events: []
    };
    this.calendarId = 'YOUR_CALENDAR_ID'; // USE YOUR CALENDAR_ID
    this.clientId =
      'YOUR_CLIENT_ID'; // USE YOUR CLIENT_ID
  }

  componentDidMount() {
    const ready = () =>
      !!(window.google && window.google.accounts && window.google.accounts.oauth2);

    if (ready()) {
      this.setState({ gisReady: true });
    } else {
      this._gisPoll = setInterval(() => {
        if (ready()) {
          clearInterval(this._gisPoll);
          this.setState({ gisReady: true });
        }
      }, 100);
    }
  }

  componentWillUnmount() {
    if (this._gisPoll) clearInterval(this._gisPoll);
  }

  signIn = () => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: async (resp) => {
        if (resp?.access_token) {
          this.setState({ token: resp.access_token }, async () => {
            await this.loadEvents();
          });
        }
      }
    });

    tokenClient.requestAccessToken();
  };

  //

  
  loadEvents = async () => {
    const { token } = this.state;
    if (!token) return;

    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        this.calendarId
      )}/events`
    );
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '2500');
    url.searchParams.set('timeMin', new Date(2020, 0, 1).toISOString());

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load events');

    const data = await res.json();
    const mapped = mapGoogleToScheduler(data.items || []);
    this.setState({ events: mapped });
  };

  onActionBegin = async (args) => {
    const { token } = this.state;

    if (['eventCreate', 'eventChange', 'eventRemove'].includes(args.requestType)) {
      args.cancel = true; 
    } else {
      return;
    }

    if (!token) return;

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const pickApp = () => {
      if (Array.isArray(args.data)) return args.data[0];
      if (args.data) return args.data;
      if (Array.isArray(args.changedRecords) && args.changedRecords.length)
        return args.changedRecords[0];
      return null;
    };

    if (args.requestType === 'eventCreate') {
      const app = pickApp();
      if (!app) return;

      const resource = toGoogleEventResource(app);
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          this.calendarId
        )}/events`,
        { method: 'POST', headers, body: JSON.stringify(resource) }
      );
      if (!res.ok) return;
      await this.loadEvents();
    }

    if (args.requestType === 'eventChange') {
      const app = pickApp();
      if (!app) return;

      const resource = toGoogleEventResource(app);
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          this.calendarId
        )}/events/${encodeURIComponent(app.Id)}`,
        { method: 'PATCH', headers, body: JSON.stringify(resource) }
      );
      if (!res.ok) return;
      await this.loadEvents();
    }

    if (args.requestType === 'eventRemove') {
      const app = pickApp();
      if (!app) return;

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          this.calendarId
        )}/events/${encodeURIComponent(app.Id)}`,
        { method: 'DELETE', headers }
      );
      if (!res.ok) return;
      await this.loadEvents();
    }
  };

  render() {
    const { gisReady, token, events } = this.state;

    return (
      <div className="schedule-control-section">
        <div className="col-lg-12 control-section">
          <div className="control-wrapper drag-sample-wrapper">
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={this.signIn}
                disabled={!gisReady}
                style={{ marginRight: 8 }}
              >
                {gisReady ? 'Authorize & Load' : 'Loading Google…'}
              </button>
              <button onClick={this.loadEvents} disabled={!token}>
                Reload Events
              </button>
            </div>

            <div className="schedule-container">
              <ScheduleComponent
                allowDragAndDrop={true}
                allowResizing={true}
                width="100%"
                height="650px"
                selectedDate={new Date()}
                eventSettings={{ dataSource: events }}
                actionBegin={this.onActionBegin}
              >
                <ViewsDirective>
                  <ViewDirective option="Day" />
                  <ViewDirective option="Week" />
                  <ViewDirective option="WorkWeek" />
                  <ViewDirective option="Month" />
                  <ViewDirective option="Agenda" />
                </ViewsDirective>
                <Inject services={[Day, Week, WorkWeek, Month, Agenda, Resize, DragAndDrop]} />
              </ScheduleComponent>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Schedule;