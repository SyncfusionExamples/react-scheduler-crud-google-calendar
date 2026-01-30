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

function getClientIdFromMeta() {
  const el = document.querySelector('meta[name="google-signin-client_id"]');
  return el ? el.content : '';
}

// Map Google Calendar events -> Syncfusion Scheduler events
function mapGoogleToScheduler(items) {
  return (items || [])
    .map((evt) => {
      const isAllDay = Boolean(evt.start?.date && !evt.start?.dateTime);
      const start = evt.start?.dateTime || evt.start?.date;
      const end = evt.end?.dateTime || evt.end?.date;
      if (!start || !end) return null;
      return {
        Id: evt.id,
        Subject: evt.summary || '(No title)',
        StartTime: new Date(start),
        EndTime: new Date(end),
        IsAllDay: isAllDay,
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
    const endDate = new Date(
      app.EndTime.getFullYear(),
      app.EndTime.getMonth(),
      app.EndTime.getDate()
    );
    if (+startDate === +endDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    return {
      summary: app.Subject,
      location: app.Location,
      description: app.Description,
      start: { date: startDate.toISOString().slice(0, 10) },
      end: { date: endDate.toISOString().slice(0, 10) }
    };
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    summary: app.Subject,
    location: app.Location,
    description: app.Description,
    start: {
      dateTime: new Date(app.StartTime).toISOString(),
      timeZone: tz
    },
    end: {
      dateTime: new Date(app.EndTime).toISOString(),
      timeZone: tz
    }
  };
}

class Schedule extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gisReady: false,
      token: null,
      events: []
    };
    this.calendarId = 'primary';//USE YOUR CALENDAR_ID OR USE primary
    this.clientId = getClientIdFromMeta();
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
      scope: 'openid email profile https://www.googleapis.com/auth/calendar',
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

    if (args.requestType === 'eventCreate') {
      const app = Array.isArray(args.data) ? args.data[0] : args.data;
      const resource = toGoogleEventResource(app);

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          this.calendarId
        )}/events`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(resource)
        }
      );
      if (!res.ok) return;

      await this.loadEvents();
    }

    if (args.requestType === 'eventChange') {
      const app = Array.isArray(args.data) ? args.data[0] : args.data;
      const resource = toGoogleEventResource(app);

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          this.calendarId
        )}/events/${encodeURIComponent(app.Id)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(resource)
        }
      );
      if (!res.ok) return;

      await this.loadEvents();
    }

    if (args.requestType === 'eventRemove') {
      const app = Array.isArray(args.data) ? args.data[0] : args.data;

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          this.calendarId
        )}/events/${encodeURIComponent(app.Id)}`,
        {
          method: 'DELETE',
          headers
        }
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
                ref={(schedule) => (this.scheduleObj = schedule)}
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
                <Inject
                  services={[Day, Week, WorkWeek, Month, Agenda, Resize, DragAndDrop]}
                />
              </ScheduleComponent>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Schedule;