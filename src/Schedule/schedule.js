import React from 'react';
import { isNullOrUndefined } from "@syncfusion/ej2-base";
import { ScheduleComponent, ViewsDirective, ViewDirective, Day, Week, WorkWeek, Month, Agenda, Inject, Resize, DragAndDrop } from '@syncfusion/ej2-react-schedule';
import { DataManager, WebApiAdaptor } from "@syncfusion/ej2-data";
class Schedule extends React.Component {
    constructor() {
        super(...arguments);
        this.flag = true;
        this.calendarId = "YOUR_CALENDAR_ID";
        this.publicKey = "YOUR_API_KEY";
        this.dataManger = new DataManager({
          url:
            "https://www.googleapis.com/calendar/v3/calendars/" +
            this.calendarId +
            "/events?key=" +
            this.publicKey,
          adaptor: new WebApiAdaptor(),
          crossDomain: true
        });
      }
      onDataBinding(e) {
        if (this.flag) {
          window.window.gapi.client.load("calendar", "v3", function() {
            var SCOPES = "https://www.googleapis.com/auth/calendar";
            window.window.gapi.auth.authorize({
              client_id:
                "YOUR_CLIENT_ID",// use your client id generated 
              scope: SCOPES,
              immediate: false
            });
          });
        }
        this.flag = false;
        var items = e.result.items;
        var scheduleData = [];
        if (items.length > 0) {
          for (var i = 0; i < items.length; i++) {
            var event = items[i];
            var when = event.start.dateTime;
            var start = event.start.dateTime;
            var end = event.end.dateTime;
            if (!when) {
              when = event.start.date;
              start = event.start.date;
              end = event.end.date;
            }
            scheduleData.push({
              Id: event.id,
              Subject: event.summary,
              StartTime: new Date(start),
              EndTime: new Date(end),
              IsAllDay: !event.start.dateTime
            });
          }
        }
        e.result = scheduleData;
      }
      onActionBegin(args) {
        if (args.requestType == "eventCreate") {
          args.cancel = true;
          var app = isNullOrUndefined(args.data[0]) ? args.data : args.data[0];
          var resource = {
            summary: app.Subject,
            location: app.Location,
            start: {
              dateTime: app.StartTime
            },
            end: {
              dateTime: app.EndTime
            }
          };
          window.gapi.client.load("calendar", "v3", function() {
            var request = window.gapi.client.calendar.events.insert({
              calendarId: "YOUR_CALENDAR_ID", // use your Google calendar’s calendar id. 
              resource: resource
            });
            request.execute(function() {
              var sch = document.querySelector(".e-schedule").ej2_instances[0];
              sch.refreshEvents();
            });
          });
        }
        if (args.requestType == "eventChange") {
          args.cancel = true;
          var app = isNullOrUndefined(args.data[0]) ? args.data : args.data[0];
          var resource = {
            id: app.Id,
            summary: app.Subject,
            location: app.Location,
            start: {
              dateTime: app.StartTime
            },
            end: {
              dateTime: app.EndTime
            }
          };
          window.gapi.client.load("calendar", "v3", function() {
            var request = window.gapi.client.calendar.events.update({
              calendarId: "YOUR_CALENDAR_ID",
              eventId: resource.id,
              resource: resource
            });
            request.execute(function() {
              var sch = document.querySelector(".e-schedule").ej2_instances[0];
              sch.refreshEvents();
            });
          });
        }
        if (args.requestType == "eventRemove") {
          args.cancel = true;
          var app = isNullOrUndefined(args.data[0]) ? args.data : args.data[0];
          var resource = {
            id: app.Id,
            summary: app.Subject,
            location: app.Location,
            start: {
              dateTime: app.StartTime
            },
            end: {
              dateTime: app.EndTime
            }
          };
          window.gapi.client.load("calendar", "v3", function() {
            var request = window.gapi.client.calendar.events.delete({
              calendarId: "YOUR_CALENDAR_ID",
              eventId: resource.id
            });
            request.execute(function() {
              var sch = document.querySelector(".e-schedule").ej2_instances[0];
              sch.refreshEvents();
            });
          });
        }
      }
      render() {
        return (
           
          <div className="schedule-control-section">
            <div className="col-lg-12 control-section">
              <div className="control-wrapper drag-sample-wrapper">             
                <div className="schedule-container">
                  <ScheduleComponent
                    ref={schedule => (this.scheduleObj = schedule)}
                    width="100%"
                    height="650px"
                    selectedDate={new Date(2018, 10, 14)}
                    eventSettings={{ dataSource: this.dataManger }}
                    dataBinding={this.onDataBinding.bind(this)}
                    actionBegin={this.onActionBegin.bind(this)}
                  >
                    <ViewsDirective>
                      <ViewDirective option="Day" />
                      <ViewDirective option="Week" />
                      <ViewDirective option="WorkWeek" />
                      <ViewDirective option="Month" />
                      <ViewDirective option="Agenda" />
                    </ViewsDirective>
                    <Inject
                      services={[
                        Day,
                        Week,
                        WorkWeek,
                        Month,
                        Agenda,
                        Resize,
                        DragAndDrop
                      ]}
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