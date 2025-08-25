# gluex_track_transaction

Description
Track the status of a cross-chain transaction.

Category
gluex

Input schema

```
{
  "txHash": "string",
  "chainId": number
}
```

Example request

```
{
  "tool": "gluex_track_transaction",
  "arguments": { "txHash": "0x123...", "chainId": 42161 }
}
```

Response shape

- bridgeStatus with progress, estimatedCompletion, and step statuses.
