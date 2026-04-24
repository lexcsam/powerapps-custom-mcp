# ⚡ PowerApps Custom MCP Server

> **All-in-one MCP server for Microsoft Power Platform** — manage environments, Dataverse tables, solutions, apps, Power Automate flows, custom connectors, security roles, and deploy templates from any AI coding assistant.

![Tools](https://img.shields.io/badge/tools-33-blue)
![MCP](https://img.shields.io/badge/protocol-MCP-green)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## Compatible With

| Platform | Status |
|----------|--------|
| **GitHub Copilot CLI** | ✅ Via MCP |
| **Claude Code / Antigravity** | ✅ Via stdio |
| **Claude Desktop** | ✅ Via `claude_desktop_config.json` |
| **VS Code (Copilot)** | ✅ Via `.vscode/mcp.json` |
| **Cursor** | ✅ Via MCP settings |
| **Azure AI Foundry** | ✅ Via tool registration |
| **Any MCP Client** | ✅ stdio transport |

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Credentials

```bash
cp .env.example .env
```

Edit `.env` with your Azure values:

```env
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
DATAVERSE_URL=https://yourorg.crm.dynamics.com
POWER_PLATFORM_ENV_ID=your-environment-id

# For headless (service principal) auth, also set:
AZURE_CLIENT_SECRET=your-client-secret
```

> **Tip:** Leave `AZURE_CLIENT_SECRET` empty for interactive Device Code flow — the server will display a URL and code for browser-based login.

### 3. Build

```bash
npm run build
```

### 4. Test with MCP Inspector

```bash
npm run inspect
```

### 5. Connect to Your AI Assistant

#### Claude Desktop

Add to `~/AppData/Roaming/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "powerapps": {
      "command": "node",
      "args": ["d:/Work/PowerApps Custom MCP/dist/index.js"],
      "env": {
        "AZURE_TENANT_ID": "your-tenant-id",
        "AZURE_CLIENT_ID": "your-client-id",
        "DATAVERSE_URL": "https://yourorg.crm.dynamics.com",
        "POWER_PLATFORM_ENV_ID": "your-environment-id"
      }
    }
  }
}
```

#### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "powerapps": {
        "type": "stdio",
        "command": "node",
        "args": ["${workspaceFolder}/dist/index.js"]
      }
    }
  }
}
```

## 🛠️ Available Tools (33)

### 🔐 Auth (2 tools)
| Tool | Description |
|------|-------------|
| `configure_auth` | Set/update Azure credentials at runtime |
| `test_connection` | Verify auth and connectivity |

### 🌍 Environments (4 tools)
| Tool | Description |
|------|-------------|
| `list_environments` | List all Power Platform environments |
| `get_environment` | Get environment details |
| `create_environment` | Provision a new environment |
| `switch_environment` | Change the active Dataverse URL |

### 📦 Solutions (4 tools)
| Tool | Description |
|------|-------------|
| `list_solutions` | List all solutions |
| `create_solution` | Create a new unmanaged solution |
| `export_solution` | Export solution as zip |
| `import_solution` | Import a solution zip |

### 🗄️ Dataverse (8 tools)
| Tool | Description |
|------|-------------|
| `create_table` | Create a custom table |
| `add_column` | Add a column to a table |
| `describe_table` | Get full table schema |
| `list_tables` | List all tables |
| `create_record` | Insert a record |
| `query_records` | Query with OData filters |
| `update_record` | Update a record |
| `delete_record` | Delete a record |

### 📱 Apps (4 tools)
| Tool | Description |
|------|-------------|
| `list_apps` | List all Power Apps |
| `get_app` | Get app details |
| `delete_app` | Delete an app |
| `share_app` | Share with users/groups |

### ⚡ Flows (4 tools)
| Tool | Description |
|------|-------------|
| `list_flows` | List cloud flows |
| `trigger_flow` | Trigger an instant flow |
| `get_flow_runs` | Get run history |
| `toggle_flow` | Enable or disable a flow |

### 🔌 Connectors (3 tools)
| Tool | Description |
|------|-------------|
| `list_connectors` | List available connectors |
| `get_connector` | Get connector details |
| `create_custom_connector` | Create from OpenAPI spec |

### 🛡️ Security (2 tools)
| Tool | Description |
|------|-------------|
| `list_security_roles` | List security roles |
| `assign_security_role` | Assign role to user |

### 📋 Templates (2 tools)
| Tool | Description |
|------|-------------|
| `list_templates` | List app scaffolding templates |
| `deploy_template` | Deploy tables + columns from template |

## Authentication

### Device Code Flow (Interactive)

Set `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` without a `CLIENT_SECRET`. The server will prompt you to visit a URL and enter a code in your browser.

### Client Credentials (Headless)

Set `AZURE_CLIENT_SECRET` for fully automated authentication. Ideal for CI/CD pipelines and Azure AI Foundry agents.

### Azure AD App Registration

Your app registration needs these API permissions:

| API | Permission | Type |
|-----|-----------|------|
| Dynamics CRM | `user_impersonation` | Delegated |
| Power Platform API | `AppManagement.ReadWrite.All` | Delegated |
| Power Automate | `Flows.Read.All`, `Flows.Manage.All` | Delegated |

## Complementary to Official Plugins

This MCP server is designed to work alongside the official `microsoft/power-platform-skills` plugins:

```
Official Microsoft                        This MCP Server
├── canvas-apps (YAML authoring)          ├── 🌍 Environment Provisioning
├── Dataverse MCP (tables/records)   →    ├── 📦 Solution Lifecycle
├── PAC CLI MCP (CLI operations)          ├── ⚡ Power Automate Flows
├── model-apps (generative pages)         ├── 🔌 Custom Connectors
└── power-pages (code sites)              ├── 🛡️ App Sharing & Security
                                          └── 📋 Templates & Scaffolding
```

## Development

```bash
# Watch mode (auto-restart on changes)
npm run dev

# Build
npm run build

# Run with MCP Inspector
npm run inspect
```

## License

MIT
