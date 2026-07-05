# Lock UPP Season 2 - WebApp

A Telegram Mini App for sharing episode download links with join-request gating.

## Requirements

- Python 3.10+
- MongoDB running locally
- Telegram API credentials (from https://my.telegram.org)

## Setup

```bash
cd lockuapp
pip install -r requirements.txt
```

Edit `.env` with your credentials:
```
MONGODB_URI=mongodb://localhost:27017
ADMIN_KEY=your_admin_key
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
```

## Run

```bash
python app.py
```

First run will ask you to log in via Telegram (Pyrogram session). After that it auto-starts.

- **WebApp**: http://localhost:5000
- **Admin Panel**: http://localhost:5000/admin

## How It Works

1. User opens WebApp in Telegram
2. Clicks "Get Episode Download Links"
3. Selects an episode
4. App checks if user is in REQ2JOIN channel's pending join requests
5. If yes - shows the LINK channel button
6. If no - shows "Apply to Join" + "Check Status" buttons

## Admin

Go to `/admin` and enter your admin key. From there you can:
- Set REQ2JOIN channel (global, applies to all episodes)
- Set LINK channel (global default)
- Add/edit/delete episodes with per-episode channel overrides

## Project Structure

```
lockuapp/
├── app.py                 # Flask + Pyrogram backend
├── requirements.txt
├── .env
├── static/
│   ├── index.html         # Main WebApp
│   ├── admin.html         # Admin panel
│   ├── css/
│   │   ├── style.css      # Netflix theme
│   │   └── admin.css
│   └── js/
│       ├── app.js         # WebApp logic
│       └── admin.js       # Admin logic
└── templates/
```
