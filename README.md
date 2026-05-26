<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7b65a1e7-f4fb-4345-9fd4-cf6240a01275

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   Open two terminals:

   Terminal 1 (API server):

   ```powershell
   npm run server
   ```

   Terminal 2 (Frontend Vite):

   ```powershell
   npm run dev
   ```

The backend uses a local SQLite file `server-data.sqlite` to store teams, athletes and audit logs. Run the API server to enable multi-device sync (WebSocket) and shared state.

Notes:
- The API runs on port `4000` by default. Vite runs on `3000`.
- To test synchronization between devices, open the app on multiple machines pointing to the same backend host (e.g., `http://<server-ip>:3000`) and ensure port 4000 is reachable.
