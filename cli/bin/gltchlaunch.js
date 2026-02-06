#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Wallet } from './wallet.js';
import { Network } from './network.js';
import { Token } from './token.js';

const BANNER = `
${chalk.magenta('   ██████╗ ██╗  ████████╗ ██████╗██╗  ██╗')}
${chalk.magenta('  ██╔════╝ ██║  ╚══██╔══╝██╔════╝██║  ██║')}
${chalk.cyan('  ██║  ███╗██║     ██║   ██║     ███████║')}
${chalk.cyan('  ██║   ██║██║     ██║   ██║     ██╔══██║')}
${chalk.magenta('  ╚██████╔╝███████╗██║   ╚██████╗██║  ██║')}
${chalk.magenta('   ╚═════╝ ╚══════╝╚═╝    ╚═════╝╚═╝  ╚═╝')}
${chalk.gray('              L A U N C H')}
`;

const program = new Command();

program
  .name('gltchlaunch')
  .description('The GLTCH agent network on Base')
  .version('0.1.0');

// Wallet command
program
  .command('wallet')
  .description('Show wallet address and balance')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const wallet = new Wallet();
    const info = await wallet.getInfo();
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, ...info }));
    } else {
      console.log(BANNER);
      console.log(chalk.yellow('Wallet'));
      console.log(`  Address: ${chalk.cyan(info.address)}`);
      console.log(`  Balance: ${chalk.green(info.balance)} ETH`);
      console.log(`  Network: ${info.network}`);
    }
  });

// Launch command
program
  .command('launch')
  .description('Launch a token on Base')
  .requiredOption('--name <name>', 'Token name')
  .requiredOption('--symbol <symbol>', 'Token symbol')
  .requiredOption('--description <desc>', 'Token description')
  .option('--image <path>', 'Path to token image')
  .option('--website <url>', 'Website URL for metadata')
  .option('--testnet', 'Use Base Sepolia testnet')
  .option('--simulate', 'Simulate launch without blockchain tx')
  .option('--direct', 'Direct contract deployment (uses gas, no image required)')
  .option('--no-sniper-protection', 'Disable sniper protection (Flaunch)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Launching token...').start();
    
    try {
      const token = new Token(options.testnet);
      const result = await token.launch({
        name: options.name,
        symbol: options.symbol,
        description: options.description,
        image: options.image,
        website: options.website,
        testnet: options.testnet,
        simulate: options.simulate,
        gasless: !options.direct,
        sniperProtection: options.sniperProtection !== false
      });
      
      spinner.succeed('Token launched!');
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, ...result }));
      } else {
        console.log(BANNER);
        console.log(chalk.green('✓ Token Launched!'));
        console.log(`  Name: ${result.name}`);
        console.log(`  Symbol: ${result.symbol}`);
        console.log(`  Address: ${chalk.cyan(result.tokenAddress)}`);
        console.log(`  Explorer: ${result.explorer}`);
      }
    } catch (error) {
      spinner.fail('Launch failed');
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

// Network command
program
  .command('network')
  .description('Discover GLTCH agents in the network')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching network...').start();
    
    try {
      const network = new Network();
      const agents = await network.getAgents();
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, count: agents.length, agents }));
      } else {
        console.log(BANNER);
        console.log(chalk.yellow(`Network: ${agents.length} agents\n`));
        
        for (const agent of agents.slice(0, 20)) {
          const powerColor = agent.powerScore > 40 ? chalk.green : 
                            agent.powerScore > 20 ? chalk.yellow : chalk.gray;
          console.log(`  ${chalk.cyan(agent.symbol.padEnd(10))} ${powerColor(`⚡${agent.powerScore}`)} ${chalk.gray(agent.marketCapETH + ' ETH')}`);
        }
      }
    } catch (error) {
      spinner.fail('Failed to fetch network');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Swap command
program
  .command('swap')
  .description('Trade agent tokens')
  .requiredOption('--token <address>', 'Token address to trade')
  .requiredOption('--amount <amount>', 'Amount to trade')
  .requiredOption('--side <side>', 'buy or sell')
  .option('--base <token>', 'Base token to trade against (ETH or XRGE)', 'ETH')
  .option('--memo <memo>', 'On-chain memo explaining trade')
  .option('--slippage <percent>', 'Slippage tolerance', '5')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const baseLabel = options.base.toUpperCase();
    const spinner = ora(`${options.side === 'buy' ? 'Buying' : 'Selling'} (${baseLabel} pair)...`).start();
    
    try {
      const token = new Token();
      const result = await token.swap({
        tokenAddress: options.token,
        amount: options.amount,
        side: options.side,
        memo: options.memo,
        slippage: parseFloat(options.slippage),
        base: options.base
      });
      
      spinner.succeed(`${options.side === 'buy' ? 'Bought' : 'Sold'}!`);
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, ...result }));
      } else {
        const dexLabel = result.dex === 'aerodrome' ? chalk.magenta('Aerodrome') : chalk.cyan('Uniswap');
        console.log(chalk.green(`✓ ${options.side.toUpperCase()} executed via ${dexLabel} (${baseLabel} pair)`));
        console.log(`  Tx: ${result.transactionHash}`);
        console.log(`  Amount: ${result.amountIn} ${options.side === 'buy' ? baseLabel : 'tokens'}`);
        if (result.expectedOutput) {
          console.log(`  Expected: ~${result.expectedOutput} ${options.side === 'buy' ? 'tokens' : baseLabel}`);
        }
        if (result.poolType) {
          console.log(`  Pool Type: ${result.poolType}`);
        } else if (result.poolFee) {
          console.log(`  Pool Fee: ${result.poolFee}`);
        }
        if (options.memo) console.log(`  Memo: "${options.memo}" ${result.memoOnChain ? chalk.green('(on-chain)') : ''}`);
      }
    } catch (error) {
      spinner.fail('Swap failed');
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

// Price command
program
  .command('price')
  .description('Get token price and info')
  .requiredOption('--token <address>', 'Token address')
  .option('--amount <eth>', 'ETH amount to simulate')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const network = new Network();
    const info = await network.getTokenPrice(options.token, options.amount);
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, ...info }));
    } else {
      console.log(chalk.cyan(info.name) + ` (${info.symbol})`);
      console.log(`  MCap: ${info.marketCapETH} ETH`);
      console.log(`  Price 24h: ${info.priceChange24h > 0 ? chalk.green('+') : chalk.red('')}${info.priceChange24h}%`);
      console.log(`  Holders: ${info.holders}`);
    }
  });

// Quote command - get expected output before swapping
program
  .command('quote')
  .description('Get swap quote (expected output)')
  .requiredOption('--token <address>', 'Token address')
  .requiredOption('--amount <amount>', 'Amount to swap')
  .requiredOption('--side <side>', 'buy or sell')
  .option('--base <token>', 'Base token to trade against (ETH or XRGE)', 'ETH')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const baseLabel = options.base.toUpperCase();
    const spinner = ora(`Getting quote (${baseLabel} pair)...`).start();
    
    try {
      const token = new Token();
      const quote = await token.quote({
        tokenAddress: options.token,
        amount: options.amount,
        side: options.side,
        base: options.base
      });
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, ...quote }));
      } else {
        const direction = options.side === 'buy' ? `${baseLabel} → Token` : `Token → ${baseLabel}`;
        const dexLabel = quote.dex === 'aerodrome' ? chalk.magenta('Aerodrome') : chalk.cyan('Uniswap');
        console.log(chalk.yellow(`Quote via ${dexLabel}: ${direction}`));
        console.log(`  Input: ${quote.amountIn} ${options.side === 'buy' ? baseLabel : 'tokens'}`);
        console.log(`  Expected: ${chalk.green(quote.expectedOutput)} ${options.side === 'buy' ? 'tokens' : baseLabel}`);
        if (quote.poolType) {
          console.log(`  Pool Type: ${quote.poolType}`);
        } else if (quote.poolFee) {
          console.log(`  Pool Fee: ${quote.poolFee}`);
        }
        if (quote.expectedOutput === '0') {
          console.log(chalk.gray('  (No liquidity or pool not found)'));
        }
      }
    } catch (error) {
      spinner.fail('Quote failed');
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

// Fees command
program
  .command('fees')
  .description('Check claimable fees')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const wallet = new Wallet();
    const fees = await wallet.getFees();
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, ...fees }));
    } else {
      console.log(chalk.yellow('Fees'));
      console.log(`  Claimable: ${chalk.green(fees.claimableETH)} ETH`);
      console.log(`  Can Claim: ${fees.canClaim ? chalk.green('Yes') : chalk.gray('No')}`);
    }
  });

// Claim command
program
  .command('claim')
  .description('Withdraw accumulated fees')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Claiming fees...').start();
    
    try {
      const wallet = new Wallet();
      const result = await wallet.claimFees();
      
      spinner.succeed('Fees claimed!');
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, ...result }));
      } else {
        console.log(chalk.green(`✓ Claimed ${result.amount} ETH`));
      }
    } catch (error) {
      spinner.fail('Claim failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Holdings command
program
  .command('holdings')
  .description('View token holdings')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const wallet = new Wallet();
    const holdings = await wallet.getHoldings();
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, count: holdings.length, holdings }));
    } else {
      console.log(chalk.yellow(`Holdings: ${holdings.length} tokens\n`));
      for (const h of holdings) {
        console.log(`  ${chalk.cyan(h.symbol.padEnd(10))} ${h.balance}`);
      }
    }
  });

// Fund command
program
  .command('fund')
  .description('Show wallet funding info')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const wallet = new Wallet();
    const info = await wallet.getFundingInfo();
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, ...info }));
    } else {
      console.log(BANNER);
      console.log(chalk.yellow('Fund Your Wallet\n'));
      console.log(`  Address: ${chalk.cyan(info.address)}`);
      console.log(`  Balance: ${info.balance} ETH`);
      console.log(`  Network: Base (Chain ID: 8453)`);
      console.log(`\n  ${chalk.gray('Send ETH to the address above on Base network')}`);
      console.log(`  ${chalk.gray('Minimum recommended: 0.005 ETH')}`);
    }
  });

// Status command
program
  .command('status')
  .description('Show launched tokens status')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const token = new Token();
    const launches = await token.getLaunches();
    
    if (options.json) {
      console.log(JSON.stringify({ success: true, count: launches.length, launches }));
    } else {
      console.log(chalk.yellow(`Your Tokens: ${launches.length}\n`));
      for (const t of launches) {
        console.log(`  ${chalk.cyan(t.symbol)} - ${t.tokenAddress}`);
      }
    }
  });

// Buy XRGE command - swap ETH for XRGE on Aerodrome
program
  .command('buy-xrge')
  .description('Buy XRGE (Rougecoin) with ETH via Aerodrome')
  .requiredOption('--amount <eth>', 'Amount of ETH to spend')
  .option('--slippage <percent>', 'Slippage tolerance', '5')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Buying XRGE on Aerodrome...').start();
    
    try {
      const token = new Token();
      const result = await token.buyXRGE({
        amount: options.amount,
        slippage: parseFloat(options.slippage)
      });
      
      spinner.succeed('XRGE purchased!');
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, ...result }));
      } else {
        console.log(chalk.green('✓ Bought XRGE via ') + chalk.magenta('Aerodrome'));
        console.log(`  Tx: ${result.transactionHash}`);
        console.log(`  Spent: ${result.amountIn} ETH`);
        console.log(`  Received: ~${result.expectedOutput} XRGE`);
        console.log(`  Explorer: ${result.explorer}`);
      }
    } catch (error) {
      spinner.fail('Purchase failed');
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

// Sell XRGE command - swap XRGE for ETH on Aerodrome
program
  .command('sell-xrge')
  .description('Sell XRGE (Rougecoin) for ETH via Aerodrome')
  .requiredOption('--amount <xrge>', 'Amount of XRGE to sell')
  .option('--slippage <percent>', 'Slippage tolerance', '5')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Selling XRGE on Aerodrome...').start();
    
    try {
      const token = new Token();
      const result = await token.sellXRGE({
        amount: options.amount,
        slippage: parseFloat(options.slippage)
      });
      
      spinner.succeed('XRGE sold!');
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, ...result }));
      } else {
        console.log(chalk.green('✓ Sold XRGE via ') + chalk.magenta('Aerodrome'));
        console.log(`  Tx: ${result.transactionHash}`);
        console.log(`  Sold: ${result.amountIn} XRGE`);
        console.log(`  Received: ~${result.expectedOutput} ETH`);
        console.log(`  Explorer: ${result.explorer}`);
      }
    } catch (error) {
      spinner.fail('Sale failed');
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

// XRGE balance command
program
  .command('xrge')
  .description('Check XRGE balance and price')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching XRGE info...').start();
    
    try {
      const token = new Token();
      const info = await token.getXRGEInfo();
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, ...info }));
      } else {
        console.log(chalk.magenta('XRGE (Rougecoin)'));
        console.log(`  Balance: ${chalk.green(info.balance)} XRGE`);
        console.log(`  Contract: ${chalk.gray(info.address)}`);
        if (info.priceETH) {
          console.log(`  Price: ${info.priceETH} ETH`);
        }
        console.log(`  Trade: ${chalk.cyan('Aerodrome')}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch XRGE info');
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

program.parse();
