#!/bin/bash

# Script to diagnose MCP server configuration
# Note: Context7 uses HTTP-based configuration, no local installation needed

echo "=== MCP Server Diagnostics ==="
echo ""

echo "1. Checking MCP configuration:"
if [ -f ~/.cursor/mcp.json ]; then
    echo "✅ MCP config file exists"
    if command -v jq &> /dev/null; then
        cat ~/.cursor/mcp.json | jq '.'
        
        # Check if context7 is configured
        CONTEXT7_CONFIG=$(cat ~/.cursor/mcp.json | jq '.mcpServers.context7 // empty')
        if [ -n "$CONTEXT7_CONFIG" ] && [ "$CONTEXT7_CONFIG" != "null" ]; then
            echo ""
            echo "✅ Context7 MCP server is configured"
            
            # Check configuration type
            CONFIG_TYPE=$(cat ~/.cursor/mcp.json | jq -r '.mcpServers.context7 | keys[]' | head -1)
            if [ "$CONFIG_TYPE" = "url" ]; then
                URL=$(cat ~/.cursor/mcp.json | jq -r '.mcpServers.context7.url // empty')
                echo "   Configuration type: HTTP-based (URL: $URL)"
                
                # Check if API key is in headers
                API_KEY_IN_HEADERS=$(cat ~/.cursor/mcp.json | jq -r '.mcpServers.context7.headers.CONTEXT7_API_KEY // empty')
                if [ -n "$API_KEY_IN_HEADERS" ] && [ "$API_KEY_IN_HEADERS" != "null" ]; then
                    echo "   ✅ API key configured in headers"
                else
                    echo "   ⚠️  No API key found in headers"
                fi
            else
                echo "   Configuration type: Other (may require local installation)"
            fi
        else
            echo "❌ Context7 MCP server not configured"
        fi
    else
        cat ~/.cursor/mcp.json
        echo ""
        echo "⚠️  jq not found. Install jq for better output formatting: brew install jq"
    fi
else
    echo "❌ MCP config file not found at ~/.cursor/mcp.json"
fi
echo ""

echo "2. Configuration Notes:"
echo "   - Context7 uses HTTP-based configuration (no local installation needed)"
echo "   - Configuration should be in ~/.cursor/mcp.json"
echo "   - API key should be in headers.CONTEXT7_API_KEY"
echo "   - No npm/npx installation required for HTTP-based setup"
echo ""

echo "3. Testing connection:"
echo "   - The MCP server connection is handled by Cursor IDE"
echo "   - Restart Cursor completely if configuration was just changed"
echo "   - Check Cursor's MCP server status in settings/status panel"
echo ""

echo "=== Diagnostics Complete ==="






