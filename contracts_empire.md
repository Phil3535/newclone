# Empire Streams - IPTV Player Development Contract

## Overview
Build a premium IPTV player with Xtreme Codes API integration, professional cable-style TV guide, and subscription system.

## Core Features

### 1. Xtreme Codes API Integration
**Login Flow:**
- User inputs: Server URL, Username, Password
- Authenticate via player_api.php
- Store credentials securely (encrypted in backend)
- Session management with JWT tokens

**API Endpoints:**
```
Authentication: {server}/player_api.php?username={user}&password={pwd}&action=player_api
Live Streams: {server}/player_api.php?username={user}&password={pwd}&action=get_live_streams
Categories: {server}/player_api.php?username={user}&password={pwd}&action=get_live_categories
EPG Data: {server}/player_api.php?username={user}&password={pwd}&action=get_simple_data_table&type=epg
Stream URL: {server}/live/{username}/{password}/{stream_id}.m3u8
```

### 2. TV Guide (Cable-Style Grid)
**Layout:**
- Left sidebar: Channel list with logos
- Top header: Time slots (30-min intervals)
- Grid: Current and upcoming programs
- Highlight current time slot
- Smooth scrolling
- Click to play channel

**Features:**
- Current program info
- Upcoming shows preview
- Search across channels and programs
- Quick jump to specific time
- Channel number navigation

### 3. Video Player
**Technology:** HLS.js for m3u8 stream playback
**Features:**
- Fullscreen mode
- Volume control
- Quality selector (if multi-bitrate)
- Channel info overlay
- Quick channel switching (arrow keys)
- PIP (Picture-in-Picture)

### 4. Channel Management
- Categories (Sports, Movies, News, etc.)
- Favorites list
- Recently watched
- Channel search
- Sort by name/number
- Hide channels option

### 5. Subscription System
**Payment:** Stripe ACH Direct Debit
**Plans:**
- Free trial (7 days)
- Monthly: $9.99
- Yearly: $99.99 (2 months free)

**User States:**
- Trial
- Active subscription
- Expired/Payment failed
- Restrict features for expired users

### 6. User Management
**Features:**
- Account registration
- Email verification
- Password reset
- Multiple IPTV profiles per account
- Manage subscription
- Billing history

## Backend Endpoints

### Auth & User
- POST /api/auth/register - Create account
- POST /api/auth/login - Login to Empire Streams
- POST /api/auth/verify-email - Email verification
- POST /api/auth/reset-password - Password reset
- GET /api/user/profile - Get user info
- PUT /api/user/profile - Update profile

### IPTV Connection
- POST /api/iptv/connect - Save Xtreme Codes credentials
- GET /api/iptv/status - Check connection status
- DELETE /api/iptv/disconnect - Remove credentials
- GET /api/iptv/profiles - List saved IPTV profiles

### Content
- GET /api/content/channels - Get channel list
- GET /api/content/categories - Get categories
- GET /api/content/epg - Get EPG data
- GET /api/content/stream/{id} - Get stream URL
- POST /api/content/favorite - Add to favorites
- GET /api/content/favorites - Get favorites list

### Subscription
- POST /api/subscription/create - Start subscription
- GET /api/subscription/status - Check subscription
- POST /api/subscription/cancel - Cancel subscription
- GET /api/subscription/invoices - Get billing history
- POST /api/subscription/payment-method - Update payment

## Frontend Pages

### 1. Landing Page
- Empire Streams branding (neon theme)
- Feature showcase
- Pricing plans
- Sign up CTA

### 2. Auth Pages
- Login
- Register
- Email verification
- Forgot password

### 3. IPTV Connection
- Xtreme Codes login form
- Test connection
- Save credentials

### 4. Main App
- TV Guide (Grid layout)
- Video player
- Channel sidebar
- Categories filter
- Search
- Favorites

### 5. Settings
- Account info
- IPTV profiles management
- Subscription details
- Appearance settings
- Parental controls
- About

## Design System

### Colors (Neon Theme)
- Primary: Cyan/Blue (#00D9FF - from logo)
- Secondary: Pink/Magenta (#FF006E - from logo)
- Accent: Yellow (#FFD60A - from logo)
- Background: Dark (#0A0E27, #1A1F3A)
- Text: White (#FFFFFF), Gray (#A0A0A0)

### Typography
- Headings: Bold, futuristic font
- Body: Clean, readable sans-serif
- Monospace for technical info

### Components
- Neon glow effects
- Smooth transitions
- Glass morphism cards
- Animated backgrounds
- Hover effects with neon highlights

## Technical Stack
- Frontend: React, HLS.js, Tailwind CSS
- Backend: FastAPI, MongoDB
- Payments: Stripe
- Video: HLS.js for m3u8 playback
- Authentication: JWT tokens
- Encryption: AES-256 for IPTV credentials

## Security
- Encrypt IPTV credentials at rest
- HTTPS only
- JWT with expiration
- Rate limiting on API
- Input validation
- XSS protection
- CSRF tokens

## Performance
- Lazy load EPG data
- Cache channel list
- Optimize video player
- Progressive web app (PWA)
- CDN for static assets

## Monetization Features
- Trial period tracking
- Subscription enforcement
- Payment retry logic
- Dunning management
- Upgrade/downgrade flows
- Referral program (future)
