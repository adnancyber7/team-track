# Real-Time Updates Implementation

This document describes the real-time functionality implemented in the application, enabling instant synchronization across all users without page refreshes.

## Overview

The application now features full real-time updates using Supabase Realtime. Changes made by any user (admin, agent, or CS) are instantly visible to all other connected users.

## Architecture

### 1. Database Layer
- **Read-Only RLS Policies**: Anonymous users can read data for real-time subscriptions
- **Write-Through Edge Function**: All write operations go through secure Edge Functions
- **Real-Time Replication**: Enabled on all application tables

### 2. Security Model
```
┌─────────────┐
│   Frontend  │
└─────────────┘
      │
      ├─── READ ────────► Supabase Realtime (Direct)
      │                   - Anonymous key
      │                   - SELECT only
      │
      └─── WRITE ───────► Edge Function (Secure)
                          - Service role key
                          - Authorization logic
                          - Validation
```

## Real-Time Enabled Tables

All tables have real-time replication enabled:

1. **AdminConfig** - Maintenance mode & banners
2. **AgentUser** - Agent profiles & status
3. **CSUser** - CS user accounts
4. **AppState** - Shared application state
5. **SheetData** - Sheet configurations
6. **SheetRow** - Individual sheet rows
7. **AgentBreak** - Break tracking
8. **PriorityConfig** - Priority settings
9. **AuditLog** - Audit trail

## Usage

### Basic Real-Time Hook

```jsx
import { useRealtimeTable } from '@/lib/RealtimeContext';

function MyComponent() {
  // Get all agents with automatic real-time updates
  const agents = useRealtimeTable('AgentUser');

  return (
    <div>
      {agents.map(agent => (
        <div key={agent.id}>{agent.username}</div>
      ))}
    </div>
  );
}
```

### Filtered Real-Time Data

```jsx
import { useRealtimeTable } from '@/lib/RealtimeContext';

function ActiveAgents() {
  // Only get active agents
  const activeAgents = useRealtimeTable(
    'AgentUser',
    (agent) => agent.is_active === true
  );

  return <div>Active: {activeAgents.length}</div>;
}
```

### Real-Time Queries

```jsx
import { useRealtimeQuery } from '@/lib/RealtimeContext';

function MaintenanceMode() {
  const config = useRealtimeQuery('AdminConfig', (data) =>
    data.find(cfg => cfg.config_key === 'main')
  );

  if (config?.maintenance_mode) {
    return <div>System under maintenance</div>;
  }

  return <div>System operational</div>;
}
```

### AppState Synchronization

```jsx
import { useRealtimeAppState } from '@/hooks/useRealtimeSync';

function SyncedComponent() {
  const [csSheet, setCSSheet] = useState(null);

  useRealtimeAppState('cs_sheet', (data) => {
    setCSSheet(data);
    // Data automatically updates when any user changes it
  });

  return <div>{/* Use csSheet */}</div>;
}
```

### Custom Subscriptions

```jsx
import { useRealtime } from '@/lib/RealtimeContext';
import { useEffect } from 'react';

function CustomSubscriber() {
  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribe('AgentUser', ({ eventType, record }) => {
      if (eventType === 'INSERT') {
        console.log('New agent added:', record);
      } else if (eventType === 'UPDATE') {
        console.log('Agent updated:', record);
      } else if (eventType === 'DELETE') {
        console.log('Agent deleted:', record);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  return <div>Listening to agent changes...</div>;
}
```

## Connection Status Indicator

Display real-time connection status to users:

```jsx
import RealtimeIndicator from '@/components/RealtimeIndicator';

function Header() {
  return (
    <div className="header">
      <h1>My App</h1>
      <RealtimeIndicator />
    </div>
  );
}
```

The indicator shows:
- **Live** (Green) - Connected and receiving updates
- **Connecting** (Yellow) - Attempting to connect
- **Offline** (Red) - Disconnected

## Real-Time Hooks Reference

### Core Hooks

#### `useRealtime()`
Access the entire real-time context.

```jsx
const { data, connectionStatus, subscribe, getTableData, refreshTable } = useRealtime();
```

#### `useRealtimeTable(tableName, filter?)`
Get all records from a table with optional filtering.

```jsx
const agents = useRealtimeTable('AgentUser');
const activeAgents = useRealtimeTable('AgentUser', agent => agent.is_active);
```

#### `useRealtimeQuery(tableName, queryFn)`
Run a query on table data.

```jsx
const mainConfig = useRealtimeQuery('AdminConfig', data =>
  data.find(cfg => cfg.config_key === 'main')
);
```

#### `useRealtimeRecord(tableName, id)`
Get a single record by ID.

```jsx
const agent = useRealtimeRecord('AgentUser', agentId);
```

### Specialized Hooks

#### `useRealtimeAppState(stateKey, onUpdate)`
Subscribe to AppState changes for a specific key.

```jsx
useRealtimeAppState('cs_sheet', (data) => {
  console.log('CS Sheet updated:', data);
});
```

#### `useRealtimeAdminConfig(onUpdate)`
Subscribe to admin configuration changes.

```jsx
useRealtimeAdminConfig((config) => {
  if (config.maintenance_mode) {
    // Handle maintenance mode
  }
});
```

#### `useRealtimeAgents(onUpdate)`
Subscribe to agent list changes.

```jsx
useRealtimeAgents((agents) => {
  console.log('Agents updated:', agents.length);
});
```

## Real-World Scenarios

### Scenario 1: Admin Updates Maintenance Mode
1. Admin toggles maintenance mode ON
2. Update is written to database via Edge Function
3. Real-time system broadcasts change to all clients
4. All users see maintenance banner instantly
5. Non-admin users are logged out immediately

### Scenario 2: Agent Completes Task
1. Agent marks task as DONE
2. Update is written via Edge Function
3. Admin dashboard updates instantly
4. CS dashboard shows new status
5. Other agents see updated counts

### Scenario 3: Multi-User Sheet Editing
1. User A edits cell in row 5
2. Update propagates through Edge Function
3. User B sees the change in real-time
4. User C receives the update simultaneously
5. No conflicts, no refresh needed

## Performance Considerations

### Optimizations Implemented

1. **Efficient Subscriptions**: Single subscription per table for entire app
2. **Smart Updates**: Only re-render components when their specific data changes
3. **Debounced Writes**: Bulk operations are batched
4. **Selective Filtering**: Components only subscribe to data they need

### Best Practices

1. **Use Specific Hooks**: Prefer `useRealtimeTable` over full context access
2. **Filter Early**: Apply filters in hooks, not in components
3. **Memoize Callbacks**: Use `useCallback` for subscription handlers
4. **Avoid Deep Queries**: Keep data structures flat when possible

## Troubleshooting

### Connection Issues

If users experience connection problems:

1. Check browser console for WebSocket errors
2. Verify Supabase realtime is enabled on project
3. Ensure RLS policies allow SELECT for anonymous role
4. Check network/firewall settings for WebSocket support

### Data Not Updating

If changes don't appear in real-time:

1. Verify table is in `supabase_realtime` publication
2. Check that writes go through Edge Function
3. Ensure component is using real-time hooks
4. Look for console errors in browser dev tools

### Performance Issues

If app becomes slow with real-time:

1. Review subscription count (should be 1 per table max)
2. Check for memory leaks in subscriptions
3. Verify cleanup in `useEffect` return statements
4. Consider pagination for large datasets

## Migration from Polling

The application previously used polling intervals to check for updates. These have been replaced with real-time subscriptions:

**Before:**
```jsx
useEffect(() => {
  const interval = setInterval(async () => {
    const data = await fetchData();
    setData(data);
  }, 3000);
  return () => clearInterval(interval);
}, []);
```

**After:**
```jsx
const data = useRealtimeTable('TableName');
```

Benefits:
- Instant updates (no 3-second delay)
- Reduced server load (no constant polling)
- Lower bandwidth usage
- Better user experience

## Security Notes

### Read-Only Access
Anonymous users can read data but cannot write. All writes must go through Edge Functions where:
- Authentication is validated
- Authorization is checked
- Business logic is enforced
- Data is sanitized

### Sensitive Data
If tables contain sensitive fields (passwords, tokens, etc.), consider:
1. Excluding fields from SELECT policies
2. Using views with filtered columns
3. Implementing field-level encryption
4. Using RLS USING clauses to hide specific rows

## Future Enhancements

Potential improvements:
1. Presence tracking (show who's online)
2. Typing indicators (show who's editing)
3. Conflict resolution for concurrent edits
4. Offline support with sync on reconnect
5. Real-time notifications
6. Change history/undo functionality

## Conclusion

The real-time implementation provides a modern, responsive user experience where all users stay synchronized without manual refreshes. The security model ensures data integrity while maintaining instant updates across the entire application.
