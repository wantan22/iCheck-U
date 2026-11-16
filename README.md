# iCheck-U — No one left unchecked

A neighbourhood disaster safety check-in app for Malaysian households, small shoplot businesses and rescue teams. When disaster strikes, iCheck-U asks every household and shop if everyone is safe. It alerts neighbours when someone is missing, keeps following up on anyone who doesn't answer, and gives rescuers a ranked list of who to reach first.

Built for a hackathon. Everything runs in the browser with sample data for **Taman Seri Harmoni, Shah Alam** (a fictional taman). There is no backend, and no real SMS, WhatsApp or emergency calls.

## Run it

Requires Node 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build (offline mode and phone notifications)
```

Demo data is saved in the browser. Use **Demo → Reset data** to start fresh.

## How to use the demo

- **Sign up or log in.** Everyone says who they are: a family, a shop worker, a shop owner or a rescuer. Rescuers must upload certificates and wait for an admin to approve them. The demo code is always `123456`.
- **Demo accounts** (on the Log in screen): household 012-338 4471, shop worker 016-882 1043, shop owner 012-990 4412, rescuer 012-300 9911, admin 03-5510 0999.
- **Demo button** (bottom-left): simulate a flood, issue a warning, end the event, speed up timers, simulate no Wi-Fi, reset data or switch role.

## Main features

- **Emergency check-in:** a full-screen red alert with an ambulance-style siren asks "Is everyone in your family safe?". Answer with one tap.
- **Missing person alerts:** sent to the nearest neighbours, who can reply "I'm searching" or "Found".
- **If nobody answers:** a reminder by SMS and WhatsApp, then neighbours are asked to check, then the rescue team is told.
- **Rescue dashboard:** a live map and a ranked "Reach first" list, with the reason for each household's place.
- **SOS and a pretend 999 call screen** (clearly marked as a demo).
- **Grab list:** what to take in an emergency and exactly where it is kept, plus recovery guides afterwards.
- **Safe places:** the nearest relief centres and hospitals, with routes that avoid flooded roads.
- **Colours with meaning:** green = all OK, yellow = pay attention, red = emergency.
- **For everyone:** English, Bahasa Malaysia, 中文 and தமிழ், big text and buttons, dark mode, and works offline.
- **Privacy:** rescuers see household details only during an emergency, and every view is logged.

## Project structure

```
src/
  components/   layout, alerts, map, SOS button, 999 call screen, shared UI
  pages/        sign-up, log in, safe places, settings, privacy, messages
    household/  home, family, check-in, alerts, grab list, recovery
    business/   shop home, workers, check-in, hazard report
    worker/     shop worker home
    responder/  dashboard, rescue board, teams, safety points, summary
    admin/      event control, approvals, access log
  store/        app state, emergency events, escalation timer, sample replies
  data/         sample households, shops, safety points, rescue teams
  i18n/         English, Bahasa Malaysia, Chinese and Tamil text
  utils/        alerts and siren, priority scoring, routing, formatting
public/         icon, offline service worker, app manifest
```

Built with React, Vite, Tailwind CSS, Zustand and Leaflet (OpenStreetMap).

## Note

This is a prototype with sample data. It is not connected to any real emergency service. In a real emergency, call **999**.
