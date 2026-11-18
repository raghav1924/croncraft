# Multi-Timezone Execution Synchronization

## Daylight Saving Time Drift

Schedules specified without explicit timezones frequently misfire during seasonal transitions (e.g., UTC vs EDT/PDT).

CronCraft dynamically maps each calculated timestamp across 6 primary developer timezones:
- **UTC:** Universal Coordinated Time (Cloud Default)
- **America/New_York (EST/EDT):** US Financial Core
- **America/Los_Angeles (PST/PDT):** Silicon Valley / Cloud Platforms
- **Europe/London (GMT/BST):** European Operations
- **Asia/Kolkata (IST):** South Asia Engineering Hubs
- **Asia/Tokyo (JST):** East Asia

---
*Authored by [Jatin Sharma](https://jatinsh.netlify.app/)*
