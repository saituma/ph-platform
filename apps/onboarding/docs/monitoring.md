# Monitoring & Alerting Setup

## Sentry Alerts (configured in sentry.io dashboard)

### Recommended Alert Rules:

1. **High Error Rate** — Alert when error count > 10 in 5 minutes
   - Condition: `count() > 10` in `5m` window
   - Action: Slack notification to #ph-alerts

2. **New Issue** — Alert on first occurrence of a new error type
   - Condition: `is:unresolved is:new`
   - Action: Email to team

3. **Performance Degradation** — Alert when p95 transaction duration > 3s
   - Condition: `p95(transaction.duration) > 3000`
   - Action: Slack notification

4. **Crash Free Rate** — Alert when crash-free sessions drop below 99%
   - Condition: `crash_free_sessions < 99%`
   - Action: PagerDuty / urgent notification

## UptimeRobot / Better Uptime

Monitor endpoint: `https://ph-platform-onboarding.vercel.app/api/health`
- Check interval: 60 seconds
- Alert after: 2 consecutive failures
- Notification: Email + Slack

## Vercel Analytics

Enable in Vercel dashboard:
- Web Analytics (page views, visitors)
- Speed Insights (Core Web Vitals)
- Both are free tier compatible

## PostHog (when integrated)

- Session recordings: 10% sampling
- Feature flag analytics: automatic
- Funnel analysis: sign-up → onboarding → portal access
