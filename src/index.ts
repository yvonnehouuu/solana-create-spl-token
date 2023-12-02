/**
 * 
 * Solana pushed breaking changes to some transaction elements in October, 2022 to implement Versioned Transactions. 
 * A newer version of this code supporting versioned transactions is available here: 
 * https://github.com/quiknode-labs/qn-guide-examples/blob/main/solana/fungible-SPL-token/mintVersionedTest.ts
 * For more information on versioned transactions, please visit: 
 * https://www.quicknode.com/guides/solana-development/how-to-use-versioned-transactions-on-solana
 */

import { Transaction, SystemProgram, Keypair, Connection, PublicKey, sendAndConfirmTransaction, clusterApiUrl } from "@solana/web3.js";
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction } from '@solana/spl-token';
import { DataV2, createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { bundlrStorage, keypairIdentity, Metaplex, UploadMetadataInput } from '@metaplex-foundation/js';
import * as web3 from "@solana/web3.js"
import dotenv from "dotenv"
dotenv.config()

async function connectWallet(connection: web3.Connection): Promise<web3.Keypair> {
    // Use dotenv to get project and directory variables
    require('dotenv').config();
    const secret = process.env.PRIVATE_KEY;
  
    // connect wallet
    const bs58 = require('bs58');
    const secretKey = bs58.decode(secret);
    const wallet = web3.Keypair.fromSecretKey(secretKey);
  
    return wallet;
}
  
async function useMetaplex() {
    
    const connection = new Connection(clusterApiUrl("devnet"))

    const user = await connectWallet(connection)

    console.log("PublicKey:", user.publicKey.toBase58())
    
    const METAPLEX = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
        bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
        })
    )

    return METAPLEX
}

const MINT_CONFIG = {
    numDecimals: 6,
    numberTokens: 1000000
}

const MY_TOKEN_METADATA: UploadMetadataInput = {
    name: "TOKEN NAME",
    symbol: "",
    description: "",
    image: "add public URL to image you'd like to use"
}
const ON_CHAIN_METADATA = {
    name: MY_TOKEN_METADATA.name,
    symbol: MY_TOKEN_METADATA.symbol,
    uri: 'TO_UPDATE_LATER',
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
} as DataV2;

/**
 * 
 * @param wallet Solana Keypair
 * @param tokenMetadata Metaplex Fungible Token Standard object 
 * @returns Arweave url for our metadata json file
 */
const uploadMetadata = async (tokenMetadata: UploadMetadataInput): Promise<string> => {
    const metaplex = await useMetaplex();
    //Upload to Arweave
    const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
    console.log(`Arweave URL: `, uri);
    return uri;
}

const createNewMintTransaction = async (connection: Connection, payer: Keypair, mintKeypair: Keypair, destinationWallet: PublicKey, mintAuthority: PublicKey, freezeAuthority: PublicKey) => {
    const metaplex = await useMetaplex();
    //Get the minimum lamport balance to create a new account and avoid rent payments
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
    //metadata account associated with mint
    const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mintKeypair.publicKey });
    //get associated token account of your wallet
    const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, destinationWallet);


    const createNewTokenTransaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: requiredBalance,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
            mintKeypair.publicKey, //Mint Address
            MINT_CONFIG.numDecimals, //Number of Decimals of New mint
            mintAuthority, //Mint Authority
            freezeAuthority, //Freeze Authority
            TOKEN_PROGRAM_ID),
        createAssociatedTokenAccountInstruction(
            payer.publicKey, //Payer 
            tokenATA, //Associated token account 
            payer.publicKey, //token owner
            mintKeypair.publicKey, //Mint
        ),
        createMintToInstruction(
            mintKeypair.publicKey, //Mint
            tokenATA, //Destination Token Account
            mintAuthority, //Authority
            MINT_CONFIG.numberTokens * Math.pow(10, MINT_CONFIG.numDecimals),//number of tokens
        ),
        createCreateMetadataAccountV3Instruction({
            metadata: metadataPDA,
            mint: mintKeypair.publicKey,
            mintAuthority: mintAuthority,
            payer: payer.publicKey,
            updateAuthority: mintAuthority,
        }, {
            createMetadataAccountArgsV3: {
                data: ON_CHAIN_METADATA,
                isMutable: true,
                collectionDetails: null
            }
        })
    );

    return createNewTokenTransaction;
}

const main = async () => {
    console.log(`---STEP 1: Uploading MetaData---`);
    const connection = new Connection(clusterApiUrl("devnet"))
    const userWallet = await connectWallet(connection);

    let metadataUri = await uploadMetadata(MY_TOKEN_METADATA);
    ON_CHAIN_METADATA.uri = metadataUri;

    console.log(`---STEP 2: Creating Mint Transaction---`);
    let mintKeypair = Keypair.generate();
    console.log(`New Mint Address: `, mintKeypair.publicKey.toString());

    const newMintTransaction: Transaction = await createNewMintTransaction(
        connection,
        userWallet,
        mintKeypair,
        userWallet.publicKey,
        userWallet.publicKey,
        userWallet.publicKey
    );

    console.log(`---STEP 3: Executing Mint Transaction---`);
    let { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash('finalized');
    newMintTransaction.recentBlockhash = blockhash;
    newMintTransaction.lastValidBlockHeight = lastValidBlockHeight;
    newMintTransaction.feePayer = userWallet.publicKey;
    const transactionId = await sendAndConfirmTransaction(connection, newMintTransaction, [userWallet, mintKeypair]);
    console.log(`Transaction ID: `, transactionId);
    console.log(`Succesfully minted ${MINT_CONFIG.numberTokens} ${ON_CHAIN_METADATA.symbol} to ${userWallet.publicKey.toString()}.`);
    console.log(`View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`);
    console.log(`View Token Mint: https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`)
}

main();