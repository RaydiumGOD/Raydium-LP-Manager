import * as readline from "readline";
import { exitProcess, logger } from "../utils/logger";
import {
  sell_swap_tokens_percentage,
  DEFAULT_TOKEN,
  LP_remove_tokens_percentage,
  sell_swap_take_profit_ratio,
  swap_sol_amount,
  LP_remove_tokens_take_profit_at_sol,
} from "../config";
import { connection } from "../config";
import {
  LP_wallet_keypair,
  swap_wallet_keypair,
  makeTxVersion,
} from "../config";
import {
  buildAndSendTx,
  build_swap_instructions,
} from "../utils/build_a_sendtxn";
import {
  Liquidity,
  ONE,
  Percent,
  TOKEN_PROGRAM_ID,
  Token,
  TokenAmount,
  parseBigNumberish,
} from "@raydium-io/raydium-sdk";
import {
  getATAAddress,
  getWalletTokenAccount,
  getWalletTokenAccountMint,
} from "../utils/get_balance";
import { getComputeBudgetConfigHigh } from "../utils/budget";

let userInput = "";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function get_lp_worth() {}
async function get_tokens_worth(
  poolKeys,
  inputTokenAmount,
  outputToken,
  slippage
) {
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: inputTokenAmount,
    currencyOut: outputToken,
    slippage: slippage,
  });
  return amountOut.raw / 10 ** amountOut.currency.decimals;
}

async function sell_swap(poolKeys, percentage) {
  try {
    const tokenAccountRawInfos_Swap = await getWalletTokenAccount(
      connection,
      swap_wallet_keypair.publicKey
    );

    const swapToken = new Token(
      TOKEN_PROGRAM_ID,
      poolKeys.baseMint,
      poolKeys.baseDecimals
    );
    const swapTokenAccount = getATAAddress(
      TOKEN_PROGRAM_ID,
      swap_wallet_keypair.publicKey,
      poolKeys.baseMint
    );
    let swap_account_balance1 = await connection.getTokenAccountBalance(
      swapTokenAccount.publicKey
    );
    console.log(
      "[SWAP] Total tokens in wallet: ",
      swapTokenAccount.publicKey.toString(),
      " - ",
      swap_account_balance1.value.amount
    );
    const percentBalance = percentAmount(
      swap_account_balance1.value.amount,
      percentage
    );
    console.log(
      `[Swap amount] swap_account_balance1 After Total: ${percentBalance}`
    );
    let inputTokenAmount = new TokenAmount(swapToken, percentBalance);
    const minAmountOut = new TokenAmount(
      DEFAULT_TOKEN.WSOL,
      parseBigNumberish(ONE)
    );

    const swap_ix = await build_swap_instructions(
      Liquidity,
      connection,
      poolKeys,
      tokenAccountRawInfos_Swap,
      swap_wallet_keypair,
      inputTokenAmount,
      minAmountOut
    );
    const txids = await buildAndSendTx(swap_wallet_keypair, swap_ix, {
      skipPreflight: false,
      maxRetries: 30,
    });
    logger.info(`Sell - Signature ${txids[0]}`);
    return txids[0];
  } catch (e: unknown) {
    logger.info(`[SWAP - SELL - ERROR] ${e}`);
  }
}

async function ammRemoveLiquidity(poolKeys, percentage) {
  try {
    // create LP remove instructions -----------------------------------------
    // create LP remove instructions -----------------------------------------
    // create LP remove instructions -----------------------------------------
    const lpToken = new Token(
      TOKEN_PROGRAM_ID,
      poolKeys.lpMint,
      poolKeys.lpDecimals
    ); // LP
    const lpTokenAccount = getATAAddress(
      TOKEN_PROGRAM_ID,
      LP_wallet_keypair.publicKey,
      poolKeys.lpMint
    );
    console.log("lpTokenAccount", lpTokenAccount.toString());
    let LP_account_balance1 = await connection.getTokenAccountBalance(
      lpTokenAccount.publicKey
    );
    logger.info(
      `LP_account_balance Total: ${LP_account_balance1.value.amount}`
    );
    const percentBalance = percentAmount(
      LP_account_balance1.value.amount,
      percentage
    );
    console.log(
      `[Remove amount] LP_account_balance After Total: ${percentBalance}`
    );
    let Amount_in = new TokenAmount(lpToken, percentBalance);

    const tokenAccountRawInfos_LP = await getWalletTokenAccount(
      connection,
      LP_wallet_keypair.publicKey
    );

    const lp_ix = await Liquidity.makeRemoveLiquidityInstructionSimple({
      connection,
      poolKeys,
      userKeys: {
        owner: LP_wallet_keypair.publicKey,
        payer: LP_wallet_keypair.publicKey,
        tokenAccounts: tokenAccountRawInfos_LP,
      },
      amountIn: Amount_in,
      makeTxVersion,
      computeBudgetConfig: await getComputeBudgetConfigHigh(),
    });

    let a = 1;

    let txids = await buildAndSendTx(
      LP_wallet_keypair,
      lp_ix.innerTransactions,
      { skipPreflight: false, maxRetries: 30 }
    );
    logger.info(`REMOVE LP - Signature: ${txids[0]}`);
    return txids[0];
  } catch (e: unknown) {
    logger.info(`[LP - REMOVE - ERROR]: ${e}`);
  }
}


export async function monitor_both(poolKeys) {
  console.log();
  console.log();

  userInput = "";

  let tokenAccountRawInfos_Swap = await getWalletTokenAccountMint(
    connection,
    swap_wallet_keypair.publicKey,
    poolKeys.baseMint
  );
  let swap_token_account;
  let swap_token_acocunt_balance;

  swap_token_account = tokenAccountRawInfos_Swap[0].pubkey;
  swap_token_acocunt_balance = tokenAccountRawInfos_Swap[0].accountInfo.amount;
  const TOKEN_TYPE2 = new Token(
    TOKEN_PROGRAM_ID,
    poolKeys.baseMint,
    poolKeys.baseDecimals,
    "ABC",
    "ABC"
  );
  const inputTokenAmount = new TokenAmount(
    TOKEN_TYPE2,
    swap_token_acocunt_balance
  );
  // swap_token_acocunt_balance = inputTokenAmount.raw.words[1];
  console.log(
    swap_token_account.toString(),
    swap_token_acocunt_balance.toString()
  );

  const slippage = new Percent(0, 100); //5% = 5,100 ..... 50% = 50,100
  console.log(
    "Swap Total Token Balance [Lamports]: ",
    swap_token_acocunt_balance.toString()
  );

  console.log();
  console.log();

  // Listen for user input
  rl.on("line", (input) => {
    userInput = input;
  });

  while (true) {
    try {
      if (userInput == "stop") {
        process.exit(0);
      } else if (userInput == "restart") {
        return;
      } else if (userInput == "sell_all_now") {
        await sell_swap(poolKeys, 1);
        return;
      } else if (userInput == "remove_all_lp_now") {
        await ammRemoveLiquidity(poolKeys, 1);
        return;
      }

      let swap_limit = sell_swap_take_profit_ratio * swap_sol_amount;

      let swap_worth = await get_tokens_worth(
        poolKeys,
        inputTokenAmount,
        DEFAULT_TOKEN.WSOL,
        slippage
      );

      let LP_worth =
        (await connection.getBalance(poolKeys.quoteVault)) /
        10 ** poolKeys.quoteDecimals;

      logger.info(
        `LP Worth: ${LP_worth} SOL - LP Limit: ${LP_remove_tokens_take_profit_at_sol} | Swap Worth: ${swap_worth} SOL - Swap Limit: ${swap_limit} SOL`
      );

      if (LP_worth >= LP_remove_tokens_take_profit_at_sol) {
        await ammRemoveLiquidity(poolKeys, LP_remove_tokens_percentage);
        return;
      }
      if (swap_worth >= swap_limit) {
        await sell_swap(poolKeys, sell_swap_tokens_percentage);
        return;
      }

      if (LP_worth < 0.01 && swap_worth < 0.01) {
        logger.info(
          `[LOW AMOUNTS DETECTED] => LP Worth: ${LP_worth} SOL  | Swap Worth: ${swap_worth}`
        );
        logger.info(`EXITING.....`);
        exitProcess(0);
      }

    } catch (e: unknown) {}

    await delay(1000);
  }
}

function percentAmount(amount: string, percent: number): string {
  const inputNum = BigInt(amount); // Convert string to BigInt
  const result = inputNum * BigInt(percent * 100); // Multiply by percent
  return (result / BigInt(100)).toString(); // Round down to the nearest integer
}
