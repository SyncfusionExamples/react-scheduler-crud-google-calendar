# ej2-react-scheduler-integration-with-google-api

This is the project to explain how can we perform the CRUD actions in EJ2-React Scheduler by integrating Google Calendar API.

To run this project follow the below steps, 

1. Clone this project 
2. Install packages using `npm install` 
3. Create a google cloud console project.
    - Go to google cloud console.
    - Create a new project.
    - Go to navigation bar.
    - Click APIs and services.
    - Click Configure consent screen.
        - Click get started.
        - Fill the details and click create.
    - Navigate to Audience.
        -   Add your mail-id in test-users.
    - Navigate to clients.
        - Create client.
        - Application type - web application.
        - Add http://localhost:3000/ to Authorised JavaScript origins and Authorised redirect URIs.
        - Save the client-id for future uses.
    - Navigate to Navigation bar -> APIs and services  -> library.
        - Search for google calendar API.
        - Click enable.
4. Replace your **calendar-id** and **client-id** in the **schedule.js**.
5. Run this project using `npm start` command.

To generate the Client ID please visit the [quickstart](https://developers.google.com/youtube/v3/quickstart/js) page.

This integration allows you to sync events between the EJ2 Scheduler and your Google Calendar, enabling real-time updates and seamless data management. It demonstrates how to connect external APIs with Syncfusion components in a React environment. Make sure you enable the required Google Calendar API scopes and configure OAuth consent properly for smooth authentication and access. This project is ideal for developers looking to build calendar-based applications with cloud sync capabilities.
