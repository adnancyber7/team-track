# Maintenance Mode - Complete Guide

## Overview

The Maintenance Mode system provides administrators with the ability to temporarily restrict access to the application while performing updates, maintenance, or troubleshooting. When enabled, all non-admin users are automatically logged out and prevented from logging back in.

## Features

### ✅ Real-Time Auto-Logout
- **Agent users** are automatically logged out within 2 seconds when maintenance mode is enabled
- **CS Allocator users** are automatically logged out within 2 seconds when maintenance mode is enabled
- Users receive a toast notification with the custom maintenance message before logout
- No manual intervention required from users

### ✅ Beautiful Maintenance Banner
- **Animated warning banner** appears on the login portal
- **Pulsing icon** with smooth animations to grab attention
- **Custom message display** shows admin-defined maintenance message
- **Fallback message** if no custom message is set
- **Professional design** with red gradient and translucent backdrop

### ✅ Admin-Only Access
- Administrators can still login during maintenance mode
- Admin can manage settings, enable/disable maintenance, and monitor the system
- Clear indication that only admins have access during maintenance

### ✅ Real-Time Updates
- Maintenance status checked every 2 seconds for agents and CS allocators
- Login portal checks maintenance status every 3 seconds
- No page refresh required - changes take effect immediately

## How It Works

### For Administrators

#### Enabling Maintenance Mode

1. Login as admin
2. Navigate to "Admin Settings" tab
3. Scroll to "Access Controls" section
4. Find "Maintenance Mode" card
5. Toggle the switch to enable
6. Enter a custom banner message (optional)
7. Click "Enable Maintenance & Logout Users" button

**What happens:**
- Maintenance mode flag is set in database
- All active agent and CS sessions are logged out immediately
- Custom message is saved and displayed on login portal
- Admin remains logged in

#### Disabling Maintenance Mode

1. Login as admin (you can login during maintenance)
2. Navigate to "Admin Settings" tab
3. Toggle the maintenance mode switch to OFF
4. Click "Save Maintenance Settings" button

**What happens:**
- Maintenance mode flag is removed from database
- Users can immediately login again
- Maintenance banner disappears from login portal

### For Agents and CS Allocators

#### When Maintenance is Enabled

**If logged in:**
- Real-time check detects maintenance mode within 2 seconds
- Toast notification appears with maintenance message
- Automatic logout after 1.5 second delay
- Redirected to login portal

**If trying to login:**
- Beautiful red gradient banner shows maintenance status
- Custom maintenance message is displayed
- Login form is accessible but login attempts are blocked
- Clear message: "Only administrators can login during this time"
- Error message shows if login is attempted

#### When Maintenance is Disabled

- Banner disappears from login portal immediately
- Users can login normally
- All features function as expected

## Technical Implementation

### Database Structure

The maintenance settings are stored in the `admin_config` table:

```sql
Table: admin_config
- config_key: 'main'
- maintenance_mode: boolean
- banner_message: text
- allow_admin_login: boolean (always true)
- allow_agent_login: boolean (controlled by maintenance)
- allow_cs_login: boolean (controlled by maintenance)
```

### Real-Time Checking

**Agent Dashboard** (DHLSheet.jsx, line 5585-5607):
```javascript
useEffect(() => {
  let stopped = false;
  const checkMaintenance = async () => {
    try {
      const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
      const cfg = (cfgs || [])[0];
      if (!stopped && cfg && cfg.maintenance_mode === true) {
        toast.error(cfg.banner_message || 'Maintenance mode activated...');
        setTimeout(() => onLogout(), 1500);
      }
    } catch {}
  };
  checkMaintenance();
  const interval = setInterval(checkMaintenance, 2000);
  return () => { stopped = true; clearInterval(interval); };
}, [onLogout]);
```

**CS Allocator Dashboard** (DHLSheet.jsx, line 5202-5224):
```javascript
// Same implementation as Agent Dashboard
```

**Login Portal** (UnifiedLoginPortal.jsx, line 28-43):
```javascript
useEffect(() => {
  let stopped = false;
  const fetchCfg = async () => {
    try {
      const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
      const cfg = (cfgs || [])[0];
      if (!stopped && cfg) {
        setMaintenance(!!cfg.maintenance_mode);
        setBanner(String(cfg.banner_message || '').trim());
      }
    } catch {}
  };
  fetchCfg();
  const id = setInterval(fetchCfg, 3000);
  return () => { stopped = true; clearInterval(id); };
}, []);
```

### Maintenance Banner Component

**Login Portal Banner** (UnifiedLoginPortal.jsx, line 264-313):
```jsx
<AnimatePresence>
  {maintenance && (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <Card className="backdrop-blur-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-400/50 shadow-2xl overflow-hidden">
        <div className="relative p-4">
          <div className="relative flex items-start gap-3">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="flex-shrink-0 mt-1"
            >
              <AlertCircle className="w-6 h-6 text-red-400" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className="text-red-100 font-bold text-base mb-1.5 flex items-center gap-2">
                Maintenance Mode Active
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  🔧
                </motion.span>
              </h3>
              <p className="text-red-200 text-sm leading-relaxed">
                {banner || 'We are doing some updates in the app. We will get back soon...'}
              </p>
              <div className="mt-2 text-xs text-red-300/80">
                Only administrators can login during this time.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )}
</AnimatePresence>
```

## Use Cases

### 1. Scheduled Maintenance
**Scenario:** Database migration or system upgrade

**Steps:**
1. Announce maintenance window to users
2. Enable maintenance mode with message: "Scheduled maintenance in progress. System will be back online at 3:00 PM."
3. All users are logged out automatically
4. Perform maintenance tasks
5. Test system as admin
6. Disable maintenance mode
7. Users can login immediately

### 2. Emergency Hotfix
**Scenario:** Critical bug needs immediate fix

**Steps:**
1. Enable maintenance mode with message: "Emergency maintenance. Please wait a few minutes."
2. Users are logged out instantly
3. Apply hotfix
4. Test as admin
5. Disable maintenance mode
6. Users resume work

### 3. Data Import/Export
**Scenario:** Large data migration

**Steps:**
1. Enable maintenance mode with message: "Data migration in progress. Do not login."
2. Perform data operations
3. Verify data integrity
4. Disable maintenance mode

### 4. System Configuration
**Scenario:** Changing critical settings

**Steps:**
1. Enable maintenance mode
2. Update configurations
3. Test changes
4. Disable maintenance mode

## Best Practices

### ✅ Do's

1. **Always set a custom message** explaining what's happening and when users can expect to login again
2. **Test in dev/staging first** before enabling in production
3. **Announce planned maintenance** to users in advance
4. **Keep maintenance windows short** - users are logged out immediately
5. **Monitor logs** during maintenance for any issues
6. **Test thoroughly** before disabling maintenance mode
7. **Communicate** when maintenance is complete

### ❌ Don'ts

1. **Don't enable without reason** - it logs out all users immediately
2. **Don't leave enabled longer than necessary** - users cannot work
3. **Don't use for testing** - use dev/staging environments
4. **Don't enable without announcement** for planned maintenance
5. **Don't forget to disable** after completing maintenance
6. **Don't enable during peak hours** unless it's an emergency

## Custom Messages

### Good Examples

**Scheduled Maintenance:**
```
"Scheduled maintenance in progress. We'll be back online at 3:00 PM EST. Thank you for your patience!"
```

**Database Update:**
```
"Database update in progress. This should take about 15 minutes. Please check back soon."
```

**Emergency Fix:**
```
"We're fixing a critical issue. The system will be available shortly. Thank you for understanding."
```

**Feature Deployment:**
```
"New features are being deployed! We'll be back in 10 minutes with exciting updates."
```

**System Optimization:**
```
"System optimization in progress to improve performance. Expected completion: 4:30 PM."
```

### Bad Examples

❌ "Down" - Too vague, no information
❌ "Maintenance" - No timeframe or details
❌ "Error" - Sounds like something is broken
❌ "" (empty) - Uses generic fallback message

## Troubleshooting

### Issue: Users not getting logged out

**Possible causes:**
1. Browser cache issues
2. Network connectivity problems
3. User's browser tab is inactive/suspended

**Solutions:**
1. Wait 2-3 seconds - check is every 2 seconds
2. User should refresh their page
3. Verify maintenance mode is actually enabled in database

### Issue: Admin cannot login during maintenance

**Cause:** Admin credentials might be incorrect

**Solution:**
1. Verify admin username and password
2. Check database for admin_config.allow_admin_login = true
3. Try resetting admin password

### Issue: Maintenance banner not showing

**Possible causes:**
1. Browser cache
2. Maintenance mode not properly saved
3. Network issues

**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Verify maintenance_mode flag in database
3. Check browser console for errors

### Issue: Users can still login during maintenance

**Cause:** Login validation might not be checking maintenance flag

**Solution:**
1. Verify maintenance mode is enabled in database
2. Check that login handlers are calling maintenance check
3. Review UnifiedLoginPortal.jsx line 63-66

## Monitoring

### Admin View

While maintenance mode is enabled, admin can:
- View all system settings
- Monitor active sessions (should be empty)
- Check audit logs
- Test functionality
- Prepare for re-enabling user access

### Audit Trail

All maintenance mode changes are logged:
```
Action: update_maintenance
Data: {
  maintenance_mode: true/false,
  banner_message: "Your message",
  timestamp: "2026-01-07T12:00:00Z"
}
```

## Security Considerations

1. **Admin-only control**: Only admins can enable/disable maintenance mode
2. **No backdoor access**: Regular users absolutely cannot bypass maintenance mode
3. **Secure logout**: Users are logged out properly, sessions invalidated
4. **Database validation**: All login attempts check database maintenance flag
5. **Real-time enforcement**: Continuous checking prevents unauthorized access

## Performance Impact

- **Check interval**: Every 2 seconds for logged-in users
- **Network overhead**: Minimal - single database query
- **User experience**: Smooth logout with toast notification
- **Login portal**: Banner renders without performance impact

## Future Enhancements

Potential improvements:
1. **Scheduled maintenance**: Set future date/time for automatic enable/disable
2. **Countdown timer**: Show users when maintenance will end
3. **Partial maintenance**: Allow specific users or roles during maintenance
4. **Maintenance history**: Track all maintenance windows
5. **Email notifications**: Auto-notify users when maintenance is scheduled
6. **Maintenance logs**: Detailed logging of actions during maintenance
7. **Read-only mode**: Allow viewing but not editing during maintenance

## API Reference

### Enable Maintenance Mode

```javascript
await adn7.functions.invoke('adminSettingsApi', {
  action: 'updateSettings',
  payload: {
    maintenance_mode: true,
    banner_message: 'Your custom message'
  }
});
```

### Disable Maintenance Mode

```javascript
await adn7.functions.invoke('adminSettingsApi', {
  action: 'updateSettings',
  payload: {
    maintenance_mode: false,
    banner_message: ''
  }
});
```

### Check Maintenance Status

```javascript
const cfgs = await adn7.entities.AdminConfig.filter({ config_key: 'main' });
const cfg = (cfgs || [])[0];
const isMaintenanceMode = !!cfg?.maintenance_mode;
const message = cfg?.banner_message || '';
```

## Summary

The Maintenance Mode system provides:
- ✅ Real-time auto-logout of non-admin users
- ✅ Beautiful, animated maintenance banner
- ✅ Custom message support
- ✅ Admin-only access during maintenance
- ✅ Instant activation and deactivation
- ✅ Professional user experience
- ✅ Secure enforcement
- ✅ Zero configuration required

Perfect for scheduled maintenance, emergency fixes, data migrations, and system updates.
