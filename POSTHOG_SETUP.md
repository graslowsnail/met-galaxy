# Simple PostHog Analytics Setup

## What This Tracks
- **Visitor Count**: How many people visit your site
- **Visitor Location**: Where your visitors are from (country/city)
- **Page Views**: Automatic tracking of page visits
- **Session Duration**: How long people stay on your site

That's it! No complex event tracking or user behavior analysis.

## Quick Setup

### 1. Get Your PostHog API Key
1. Sign up at https://posthog.com (free tier is plenty)
2. Create a new project
3. Copy your Project API Key from Settings

### 2. Add to Your Environment
Update `.env` with your key:
```bash
NEXT_PUBLIC_POSTHOG_KEY="your-api-key-here"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

### 3. That's It!
PostHog will automatically track:
- Each unique visitor
- Their location (from IP address)
- How many pages they view
- How long they stay

## View Your Analytics

In your PostHog dashboard, you'll see:
- **Insights > Web Analytics**: Total visitors, page views, and locations
- **Persons**: Individual visitor sessions with their location

No configuration needed - it just works!