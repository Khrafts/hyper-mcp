# node_get_network_health

Description
Perform comprehensive network health assessment.

Category
node_info

Input schema

```
{}
```

Example request

```
{
  "tool": "node_get_network_health",
  "arguments": {}
}
```

Response shape

- healthReport with overallStatus, score, issues, recommendations, lastAssessment.
