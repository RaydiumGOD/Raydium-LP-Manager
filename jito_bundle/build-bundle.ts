import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { SearcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types";
import { isError } from "jito-ts/dist/sdk/block-engine/utils";
import { ClientReadableStream } from "@grpc/grpc-js";
import { buildSimpleTransaction } from "@raydium-io/raydium-sdk";

import {
  jito_auth_keypair,
  LP_wallet_keypair,
  swap_wallet_keypair,
  wallet_2_pay_jito_fees_keypair,
  connection,
  addLookupTableInfo,
  makeTxVersion,
} from "../config";
import { BundleResult } from "jito-ts/dist/gen/block-engine/bundle";

const MEMO_PROGRAM_ID = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";

export async function build_bundle(
  search: SearcherClient,
  // accounts: PublicKey[],
  // regions: string[],
  bundleTransactionLimit: number,
  lp_ix,
  swap_ix,
  conn: Connection
) {
  const _tipAccount = (await search.getTipAccounts())[0];
  console.log("tip account:", _tipAccount);
  const tipAccount = new PublicKey(_tipAccount);

  let message1 = "First TXN";
  let message2 = "Second TXN";

  const bund = new Bundle([], bundleTransactionLimit);
  const resp = await connection.getLatestBlockhash("processed");

  const willSendTx1 = await buildSimpleTransaction({
    connection,
    makeTxVersion,
    payer: LP_wallet_keypair.publicKey,
    innerTransactions: lp_ix,
    addLookupTableInfo: addLookupTableInfo,
  });

  const willSendTx2 = await buildSimpleTransaction({
    connection,
    makeTxVersion,
    payer: swap_wallet_keypair.publicKey,
    innerTransactions: swap_ix,
    addLookupTableInfo: addLookupTableInfo,
  });

  if (willSendTx1[0] instanceof VersionedTransaction) {
    willSendTx1[0].sign([LP_wallet_keypair]);
    // txids.push(await connection.sendTransaction(iTx, options));
              bund.addTransactions(willSendTx1[0]);
  }

  if (willSendTx2[0] instanceof VersionedTransaction) {
    willSendTx2[0].sign([swap_wallet_keypair]);
    // txids.push(await connection.sendTransaction(iTx, options));
              bund.addTransactions(willSendTx2[0]);
  }

  // bund.addTransactions(
  //   buildMemoTransaction(LP_wallet_keypair, resp.blockhash, message1)
  // );

  // bund.addTransactions(
  //   buildMemoTransaction(swap_wallet_keypair, resp.blockhash, message2)
  // );

  let maybeBundle = bund.addTipTx(
    wallet_2_pay_jito_fees_keypair,
    1000,
    tipAccount,
    resp.blockhash
  );

  if (isError(maybeBundle)) {
    throw maybeBundle;
  }
  console.log();

  try {
    const response_bund = await search.sendBundle(maybeBundle);
    console.log("response_bund:", response_bund);
  } catch (e) {
    console.error("error sending bundle:", e);
  }

  return maybeBundle;
}






export const onBundleResult = (c: SearcherClient): Promise<number> => {
  let first = 0;
  let isResolved = false; 

  return new Promise((resolve) => {
    // Set a timeout to reject the promise if no bundle is accepted within 5 seconds
    setTimeout(() => {
      resolve(first);
      isResolved = true
    }, 30000);

    c.onBundleResult(
      

      (result) => {
        
        if (isResolved) return first;
        // clearTimeout(timeout); // Clear the timeout if a bundle is accepted


        const bundleId = result.bundleId;
        const isAccepted = result.accepted;
        const isRejected = result.rejected;
        if (isResolved == false){

          if (isAccepted) {
            console.log(
              "bundle accepted, ID:",
              result.bundleId,
              " Slot: ",
              result.accepted.slot
            );
            first +=1;
            isResolved = true;
            resolve(first); // Resolve with 'first' when a bundle is accepted
          }
  
          if (isRejected) {
            console.log("bundle is Rejected:", result);
            // Do not resolve or reject the promise here
          }

        }
       
      },
      (e) => {
        console.error(e);
        // Do not reject the promise here
      }
    );
  });
};




export const buildMemoTransaction = (
  keypair: Keypair,
  recentBlockhash: string,
  message: string
): VersionedTransaction => {
  const ix = new TransactionInstruction({
    keys: [
      {
        pubkey: keypair.publicKey,
        isSigner: true,
        isWritable: true,
      },
    ],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(message),
  });

  const instructions = [ix];

  const messageV0 = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: recentBlockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  tx.sign([keypair]);

  return tx;
};
