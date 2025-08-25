# gluex_get_supported_chains

Description
List all supported blockchain networks on GlueX. This endpoint retrieves chain information from the /liquidity endpoint which provides both supported chains and their associated liquidity modules.

Category
gluex

Input schema

```
{}
```

Example request

```
{
  "tool": "gluex_get_supported_chains",
  "arguments": {}
}
```

Response shape

- chains[] array with chainID and networkID for each supported blockchain
- liquidityModules object containing available liquidity sources per chain
- timestamp indicating when the data was retrieved

Example response structure:

```json
{
  "chains": [
    {
      "chainID": "1",
      "networkID": "ethereum"
    }
  ],
  "liquidityModules": { ... }
}
```
