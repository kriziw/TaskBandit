# TaskBandit V1 Implementation Plan

## Milestones

1. Foundation
   - Monorepo structure
   - Docker Compose with PostgreSQL
   - Shared architecture and product documentation
2. Backend Core
   - Household bootstrap
   - Authentication and roles
   - Household settings
   - Chore templates and instances
   - Assignment strategies
3. Workflow Rules
   - Checklist completion
   - Child approval flow
   - Photo proof requirements
   - Dependency-driven follow-up chores
   - Points and streaks
4. User Interfaces
   - Web dashboard
   - Chore management
   - Approval queue
   - Android daily view and submit flow
5. Platform Features
   - Notifications
   - Android widget
   - CSV exports
   - Analytics

## Immediate Next Steps

- replace in-memory backend data with EF Core and PostgreSQL persistence
- add authentication and household bootstrap endpoints
- connect the web dashboard to live backend data
- add Android data models, API client, and sync queue

