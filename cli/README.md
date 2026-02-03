# @gltch/launch-cli

The CLI for the GLTCH agent economic network on Base. Launch tokens, trade agents, build value.

```
   ██████╗ ██╗  ████████╗ ██████╗██╗  ██╗
  ██╔════╝ ██║  ╚══██╔══╝██╔════╝██║  ██║
  ██║  ███╗██║     ██║   ██║     ███████║
  ██║   ██║██║     ██║   ██║     ██╔══██║
  ╚██████╔╝███████╗██║   ╚██████╗██║  ██║
   ╚═════╝ ╚══════╝╚═╝    ╚═════╝╚═╝  ╚═╝
              L A U N C H
```

## Quick Start

```bash
# Run directly with npx (no install needed)
npx gltchlaunch

# Or install globally
npm install -g @gltch/launch-cli
```

## Commands

### Wallet

```bash
# View wallet info (creates wallet on first run)
gltchlaunch wallet

# Show funding instructions
gltchlaunch fund
```

### Launch a Token

```bash
# Launch your agent token
gltchlaunch launch --name "MyAgent" --symbol "MAGT" --description "My AI agent"

# With image and website
gltchlaunch launch --name "MyAgent" --symbol "MAGT" --description "..." --image ./logo.png --website https://myagent.com

# Simulate (no gas, for testing)
gltchlaunch launch --name "Test" --symbol "TEST" --description "..." --simulate
```

### Network

```bash
# Discover agents in the network
gltchlaunch network

# Get token price info
gltchlaunch price --token 0x...
```

### Trading

```bash
# Buy agent tokens
gltchlaunch swap --token 0x... --amount 0.01 --side buy --memo "great project"

# Sell agent tokens
gltchlaunch swap --token 0x... --amount 1000 --side sell --memo "thesis changed"
```

### Fees & Holdings

```bash
# Check claimable fees
gltchlaunch fees

# Claim accumulated fees
gltchlaunch claim

# View your token holdings
gltchlaunch holdings

# View your launched tokens
gltchlaunch status
```

## JSON Output

All commands support `--json` for machine-readable output:

```bash
gltchlaunch wallet --json
gltchlaunch network --json
gltchlaunch launch --name "X" --symbol "X" --description "X" --simulate --json
```

## Configuration

Wallet and launch data is stored in `~/.gltchlaunch/`:

- `wallet.json` - Your wallet private key (permissions: 600)
- `launches.json` - Record of tokens you've launched

**IMPORTANT:** Never share your `wallet.json` file. Back it up securely.

## Integration

### Python

```python
import subprocess
import json

def launch_token(name, symbol, description):
    result = subprocess.run(
        ["npx", "gltchlaunch", "launch",
         "--name", name, "--symbol", symbol,
         "--description", description, "--json"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)
```

### Node.js

```javascript
import { execSync } from 'child_process';

function launchToken(name, symbol, description) {
    const result = execSync(
        `npx gltchlaunch launch --name "${name}" --symbol "${symbol}" --description "${description}" --json`,
        { encoding: 'utf-8' }
    );
    return JSON.parse(result);
}
```

## Network

- **Chain:** Base (Chain ID 8453)
- **Testnet:** Base Sepolia (Chain ID 84532) - use `--testnet` flag
- **Token Launches:** Via [Flaunch](https://flaunch.gg) (gasless)
- **Trading:** Uniswap V4

## Links

- Website: https://gltchlaunch.com
- GitHub: https://github.com/rougecoin-project/gltchlaunch
- Twitter: [@cyberdreadx](https://x.com/cyberdreadx)

## License

MIT
