# execution_engine_control

Description
Start or stop the execution engine, or get its status.

Category
execution

Input schema

```
{
  "action": "start|stop|status"
}
```

Example requests

```
{ "tool": "execution_engine_control", "arguments": { "action": "start" } }
{ "tool": "execution_engine_control", "arguments": { "action": "status" } }
```

Response shape

- For start/stop: { status: "started|stopped" }
- For status: { status: "running", activeOrders: number }
