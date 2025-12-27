# Fix npm/npx Permission Issues

## ⚠️ Important Note

**This document is only relevant if you're using a locally installed MCP server that requires npm/npx.**

If you're using **HTTP-based configuration** (which is the recommended approach for Context7), you don't need to install anything locally and this document is not applicable.

Your current Context7 configuration uses HTTP-based setup:
```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "your-api-key"
      }
    }
  }
}
```

With this configuration, no local installation is needed!

---

## Problem Identified (For Local Installations Only)

If you were using a local MCP server installation, npm/npx permission issues would prevent the MCP server from starting. This is why you might see:
- "No server info found"
- "Client closed for command"

The error occurs when npm tries to access files in: `/Users/sandralatsson/.nvm/versions/node/v22.15.1/lib/node_modules/npm/`

## Solution: Fix npm Permissions

### Option 1: Fix npm Installation Permissions (Recommended)

1. **Check current permissions:**
   ```bash
   ls -la ~/.nvm/versions/node/v22.15.1/lib/node_modules/npm/
   ```

2. **Fix ownership (if you own the files):**
   ```bash
   sudo chown -R $(whoami) ~/.nvm/versions/node/v22.15.1/lib/node_modules/npm/
   sudo chown -R $(whoami) ~/.npm
   ```

3. **Fix file permissions:**
   ```bash
   chmod -R u+w ~/.nvm/versions/node/v22.15.1/lib/node_modules/npm/
   chmod -R u+w ~/.npm
   ```

### Option 2: Reinstall Node.js via nvm (Most Reliable)

1. **Reinstall your current Node.js version:**
   ```bash
   nvm uninstall 22.15.1
   nvm install 22.15.1
   nvm use 22.15.1
   ```

2. **Verify npm works:**
   ```bash
   npm --version
   npm view express
   ```

### Option 3: Use a Fresh Node.js Installation

If nvm continues to have issues:

1. **Install a fresh Node.js version:**
   ```bash
   nvm install --lts
   nvm use --lts
   ```

2. **Test npm:**
   ```bash
   npm --version
   npm view express
   ```

### Option 4: Fix npm Globally (Alternative)

If the above don't work, you can try fixing npm's internal cache:

```bash
# Fix npm cache permissions
npm cache clean --force
sudo chown -R $(whoami) ~/.npm

# Reinstall npm (if using nvm)
nvm install 22.15.1 --reinstall-packages-from=22.15.1
```

## After Fixing Permissions (For Local Installations Only)

1. **Test that npm works:**
   ```bash
   npm --version
   npm view express
   ```

2. **Test that npx works:**
   ```bash
   npx --version
   npx -y express --help
   ```

3. **Restart Cursor completely** (quit and reopen the application)

4. **Check if MCP server now works** - the errors should be gone

**Note**: If you're using HTTP-based configuration (recommended), you don't need to fix npm permissions for Context7 MCP server.

## Why This Happens

This permission issue typically occurs when:
- npm was installed with `sudo` at some point
- File permissions got corrupted
- System security settings changed
- Multiple users or installation methods conflicted

## Verification (For Local Installations Only)

After fixing, you should be able to run:
```bash
npm --version
npm view express
```

Without any permission errors. If this works, Cursor's locally installed MCP server should also work.

**Note**: With HTTP-based configuration, you don't need to verify npm/npx permissions for Context7 MCP server functionality.






