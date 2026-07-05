import os
import asyncio
import threading
from datetime import datetime
from dotenv import load_dotenv

# Fix for Python 3.14 - create event loop before pyrogram import
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from flask import Flask, request, jsonify, send_from_directory
from pymongo import MongoClient
from pyrogram import Client, raw

load_dotenv()

app = Flask(__name__, static_folder='static')

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
ADMIN_KEY = os.getenv("ADMIN_KEY", "admin123")
API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
SESSION_STRING = os.getenv("PYROGRAM_SESSION_STRING", "")

client = MongoClient(MONGO_URI)
db = client["lockuapp"]
episodes_col = db["episodes"]
settings_col = db["settings"]

if SESSION_STRING:
    pyro_client = Client(
        name="locku_session",
        api_id=API_ID,
        api_hash=API_HASH,
        session_string=SESSION_STRING
    )
else:
    pyro_client = Client(
        name="locku_session",
        api_id=API_ID,
        api_hash=API_HASH,
        workdir="/tmp"
    )
pyro_ready = False


def get_setting(key, default=""):
    doc = settings_col.find_one({"key": key})
    return doc["value"] if doc else default


def set_setting(key, value):
    settings_col.update_one({"key": key}, {"$set": {"value": value, "updatedAt": datetime.utcnow()}}, upsert=True)


async def check_join_request_async(channel_id, user_id):
    async with pyro_client:
        offset_date = 0
        offset_user = raw.types.InputUserEmpty()
        while True:
            r = await pyro_client.invoke(
                raw.functions.messages.GetChatInviteImporters(
                    peer=await pyro_client.resolve_peer(channel_id),
                    limit=100,
                    offset_date=offset_date,
                    offset_user=offset_user,
                    requested=True,
                    q=""
                )
            )
            if not r.importers:
                break
            for importer in r.importers:
                if importer.user_id == int(user_id):
                    return True
            offset_date = r.importers[-1].date
            offset_user = await pyro_client.resolve_peer(r.importers[-1].user_id)
            if len(r.importers) < 100:
                break
    return False


def start_pyro():
    global pyro_ready
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(pyro_client.start())
    pyro_ready = True
    print("Pyrogram client ready")


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/admin")
def admin():
    return send_from_directory("static", "admin.html")


@app.route("/api/episodes", methods=["GET"])
def get_episodes():
    eps = list(episodes_col.find({}, {"_id": 0}).sort("number", 1))
    return jsonify(eps)


@app.route("/api/episodes/<int:number>", methods=["GET"])
def get_episode(number):
    ep = episodes_col.find_one({"number": number}, {"_id": 0})
    if not ep:
        return jsonify({"error": "not found"}), 404
    return jsonify(ep)


@app.route("/api/episodes", methods=["POST"])
def create_episode():
    if request.headers.get("X-Admin-Key") != ADMIN_KEY:
        return jsonify({"error": "unauthorized"}), 403
    data = request.json
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    episodes_col.update_one({"number": data["number"]}, {"$set": data}, upsert=True)
    return jsonify(data)


@app.route("/api/episodes/<int:number>", methods=["PUT"])
def update_episode(number):
    if request.headers.get("X-Admin-Key") != ADMIN_KEY:
        return jsonify({"error": "unauthorized"}), 403
    data = request.json
    data["updatedAt"] = datetime.utcnow()
    episodes_col.update_one({"number": number}, {"$set": data}, upsert=True)
    return jsonify(data)


@app.route("/api/episodes/<int:number>", methods=["DELETE"])
def delete_episode(number):
    if request.headers.get("X-Admin-Key") != ADMIN_KEY:
        return jsonify({"error": "unauthorized"}), 403
    episodes_col.delete_one({"number": number})
    return jsonify({"message": "deleted"})


@app.route("/api/settings", methods=["GET"])
def get_settings():
    docs = list(settings_col.find({}, {"_id": 0}))
    return jsonify({d["key"]: d["value"] for d in docs})


@app.route("/api/settings/<key>", methods=["PUT"])
def update_setting(key):
    if request.headers.get("X-Admin-Key") != ADMIN_KEY:
        return jsonify({"error": "unauthorized"}), 403
    data = request.json
    set_setting(key, data["value"])
    return jsonify({"key": key, "value": data["value"]})


@app.route("/api/check-join", methods=["POST"])
def check_join():
    data = request.json
    user_id = data.get("userId")
    if not user_id:
        return jsonify({"error": "userId required"}), 400
    channel = get_setting("req2join_username")
    if not channel:
        return jsonify({"error": "REQ2JOIN channel not set"}), 500
    if not pyro_ready:
        return jsonify({"error": "Pyrogram still starting, try again"}), 503
    try:
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(check_join_request_async(channel, user_id))
        return jsonify({"inJoinRequests": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health")
def health():
    return jsonify({"status": "ok", "pyro_ready": pyro_ready})


# Start Pyrogram on module load (for gunicorn)
t = threading.Thread(target=start_pyro, daemon=True)
t.start()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
