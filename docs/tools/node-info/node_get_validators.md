# node_get_validators

Description
Get information about HyperLiquid network validators.

Category
node_info

Input schema

```
{
  "page?": number (>=1, default 1),
  "limit?": number (1-100, default 50)
}
```

Example request

```
{
  "tool": "node_get_validators",
  "arguments": { "page": 1, "limit": 25 }
}
```

Response shape

- validators[] array with pagination and summary stats.
