# risk_perform_stress_test

Description
Perform portfolio stress testing with custom scenarios.

Category
risk_management

Input schema

```
{
  "scenarios?": [
    {
      "name": "string",
      "description": "string",
      "marketShock": number // -1 to 1
    }
  ]
}
```

Example request

```
{
  "tool": "risk_perform_stress_test",
  "arguments": {
    "scenarios": [
      { "name": "Crash", "description": "-30% across assets", "marketShock": -0.3 }
    ]
  }
}
```

Response shape

- results with scenario impacts (portfolioImpact, impactPercent, newPortfolioValue) and standardStressTests.
