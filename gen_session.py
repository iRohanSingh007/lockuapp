import asyncio
import sys
from pyrogram import Client

app = Client(
    name="locku_session",
    api_id=3477714,
    api_hash="1264d2d7d397c4635147ee25ab5808d1"
)

PHONE = sys.argv[1] if len(sys.argv) > 1 else None

async def main():
    if not PHONE:
        print("Usage: python gen_session.py +91XXXXXXXXXX")
        return
    await app.send_code(PHONE)
    code = input("Enter the OTP code: ").strip()
    try:
        await app.sign_in(PHONE, code)
    except Exception as e:
        if "SessionPasswordNeeded" in str(e):
            pw = input("Enter 2FA password: ").strip()
            await app.sign_in(password=pw)
    session_string = await app.export_session_string()
    print("\n--- COPY THIS ---")
    print(session_string)
    print("--- END ---\n")
    await app.stop()

with app:
    app.loop.run_until_complete(main())
