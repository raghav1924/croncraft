# Schedule Collision Detection & Resource Contention

## The Concurrency Hazard in Background Jobs

When multiple independent background tasks fire simultaneously, they compete for:
- Database connection pools (e.g., PostgreSQL max connections)
- CPU and memory bandwidth on worker nodes
- External API rate limits

### Contention Scoring Formula

CronCraft evaluates collisions across a rolling 24-hour window using clustering analysis:
$$\text{Risk Score} = \min\left(100, \sum_{c \in C} w(c)\right)$$

Where $w(c)$ assigns weights:
- **High Severity ($w=20$):** 4+ jobs or exact same-minute trigger
- **Medium Severity ($w=10$):** 2-3 jobs triggering within 5 minutes
- **Low Severity ($w=5$):** Staggered jobs with minor overlap

---
*Authored by [Jatin Sharma](https://jatinsh.netlify.app/)*
