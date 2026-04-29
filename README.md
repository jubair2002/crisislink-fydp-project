# CrisisLink

Disaster Management, Volunteer Coordination & Donation Platform.

## Prerequisites

- Node.js (LTS recommended)
- npm (comes with Node.js)
- For mobile app testing:
  - Expo Go app (for physical device testing), or
  - Android Studio / Xcode simulator setup

## Project Structure

- `web/` - Next.js admin/web application
- `mobile/` - Expo React Native mobile application

## 1) Install Dependencies

Run these from the project root:

```bash
cd web
npm install

cd ../mobile
npm install
```

## 2) Environment Variables

Set up environment files before running:

- `web/.env.local`
- `mobile/.env`

Add the required keys/values for your local setup.

## 3) Run the Web App

```bash
cd web
npm run dev
```

Then open the local URL shown in terminal (usually `http://localhost:3000`).

## 4) Run the Mobile App

```bash
cd mobile
npx expo start
```

From the Expo terminal UI you can:

- press `a` for Android
- press `i` for iOS (macOS only)
- scan the QR code using Expo Go



## If Packages Change

If `package.json` or lock files change, reinstall dependencies in the affected app:

```bash
cd web
npm install

cd ../mobile
npm install
```
