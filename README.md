# Solana Create SPL Token
reference: https://www.quicknode.com/guides/solana-development/spl-tokens/how-to-create-a-fungible-spl-token-with-the-new-metaplex-token-standard/

## Metaplex Token Standard
https://docs.metaplex.com/programs/token-metadata/token-standard#the-fungible-standard

## Setting up : Environment
1. Create a new project directory 
  
   ``` powershell
   $ mkdir mint-fungible-spl
   $ cd mint-fungible-spl
   ```
2. Create src Folder
   
   ``` powershell
   $ mkdir src
   ```
3. Create `index.ts` in src

4. Initialize your project
   
   ``` powershell
   $ yarn init
   or
   $ npm init
5. Create a `tsconfig.json` file

   ``` powershell
   $ tsc --init
   ```
   Open tsconfig.json and uncomment (or add) this to your file: "resolveJsonModule": true
6. Create `.env` and set your wallet's Private Key

   ![螢幕擷取畫面_2023-03-31_171331](/uploads/9a643b77762c928caba25564031ba0fb/螢幕擷取畫面_2023-03-31_171331.png)

![螢幕擷取畫面_2023-03-31_170728](/uploads/30c816f66b8be8f1ddcfa5882d20fbe3/螢幕擷取畫面_2023-03-31_170728.png)

## Build the Minting Tool
> * Set up : Import Dependencies 
> * Part 1 : Wallet and Connection
> * Part 2 : Your Spl Token 
> * Part 3 : Mint Transaction

### Set up : Import Dependencies
Import all dependencies we need in `index.ts` .

``` typescript
import { Transaction, SystemProgram, Keypair, Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction } from '@solana/spl-token';
import { DataV2, createCreateMetadataAccountV2Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { bundlrStorage, findMetadataPda, keypairIdentity, Metaplex, UploadMetadataInput } from '@metaplex-foundation/js';
import secret from './guideSecret.json';
import * as web3 from "@solana/web3.js"
import dotenv from "dotenv"
```

### Part 1 : Wallet and Connection
#### Connect Wallet
Set our Wallet that we use to Connect to the Solana Network:

``` typescript
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
```

This will retrieve the Private Key that we set in the .env file in the previous step. 

#### Solana Devnet Connection
Create a Connection to the Solana network using Metaplex:

``` typescript
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
```

Return METAPLEX to use in later steps.

### Part 2 : Your Spl Token
> * Create Mint Configuration and Metadata
> * Upload Metadata

#### Create Mint Configuration and Metadata
Create a variable called `MINT_CONFIG` that we'll use to define the number of decimals our token will have and the number of tokens we'd like to create(mint): 

``` typescript
const MINT_CONFIG = {
    numDecimals: 6,
    numberTokens: 1000000
}
```

Set the metadata of our Token to use in `uploadMetadata` method:

``` typescript
const MY_TOKEN_METADATA: UploadMetadataInput = {
    name: "Yv Coin💛",
    symbol: "YVC",
    description: "Yvonne's test token 💛",
    image: "https://zhcldtmwnsohl6odgpl6qxs6at4ukohxtg7i2syheuvl47gik7yq.arweave.net/ycSxzZZsnHX5wzPX6F5eBPlFOPeZvo1LByUqvnzIV_E?ext=png" //add public URL to image you'd like to use
}
```
And create `ON_CHAIN_METADATA` that will be loading onto Solana: (The transaction step)

``` typescript
const ON_CHAIN_METADATA = {
    name: MY_TOKEN_METADATA.name, 
    symbol: MY_TOKEN_METADATA.symbol,
    uri: 'TO_UPDATE_LATER',
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
} as DataV2;
```

* `DataV2`: 

   ```
   (alias) type DataV2 = {
       name: string;
       symbol: string;
       uri: string;
       sellerFeeBasisPoints: number;
       creators: beet.COption<Creator[]>;
       collection: beet.COption<Collection>;
       uses: beet.COption<Uses>;
   }
   ```

#### Upload Metadata
Upload our Token Metadata to Arweave:

``` typescript
const uploadMetadata = async(wallet: Keypair, tokenMetadata: UploadMetadataInput):Promise<string> => {
    //create metaplex instance on devnet using this wallet
    const metaplex = await useMetaplex();
    //Upload to Arweave
    const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
    console.log(`Arweave URL: `, uri);
    return uri;
}
```
Return Arweave URL to use in `ON_CHAIN_METADATA` > `uri`

### Part 3 : Mint Transaction
> * Create Transaction 
> * Main funtion

#### Create Transaction
Create a function that will create a Solana Transaction for our Mint:

``` typescript
const createNewMintTransaction = async (connection:Connection, payer:Keypair, mintKeypair: Keypair, destinationWallet: PublicKey, mintAuthority: PublicKey, freezeAuthority: PublicKey)=>{
    //Get the minimum lamport balance to create a new account and avoid rent payments
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
    //metadata account associated with mint
    const metadataPDA = await findMetadataPda(mintKeypair.publicKey);
    //get associated token account of your wallet
    const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, destinationWallet);   
    

>   const createNewTokenTransaction = new Transaction().add(...
    );

    return createNewTokenTransaction;
}
```

We're going to add 5 sets of instructions into `createNewTokenTransaction` variable:

1. createAccount - Create new mint account. 

``` typescript
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: requiredBalance,
            programId: TOKEN_PROGRAM_ID,
        }),
```

2. createInitializeMintInstruction - Initialize the new mint account.

``` typescript
        createInitializeMintInstruction(
          mintKeypair.publicKey, //Mint Address
          MINT_CONFIG.numDecimals, //Number of Decimals of New mint
          mintAuthority, //Mint Authority
          freezeAuthority, //Freeze Authority
          TOKEN_PROGRAM_ID),
```

3. createAssociatedTokenAccountInstruction - Create a new token account for the new mint in your destination wallet.

``` typescript
        createAssociatedTokenAccountInstruction(
          payer.publicKey, //Payer 
          tokenATA, //Associated token account 
          payer.publicKey, //token owner
          mintKeypair.publicKey, //Mint
        ),
```

4. createMintToInstruction - Instruction that will define what tokens to mint, where to mint them to, and how many to mint.

``` typescript
        createMintToInstruction(
          mintKeypair.publicKey, //Mint
          tokenATA, //Destination Token Account
          mintAuthority, //Authority
          MINT_CONFIG.numberTokens * Math.pow(10, MINT_CONFIG.numDecimals),//number of tokens
        ),
```

5. createCreateMetadataAccountV2Instruction - associate our token meta data with this mint.

``` typescript
        createCreateMetadataAccountV2Instruction({
            metadata: metadataPDA, 
            mint: mintKeypair.publicKey, 
            mintAuthority: mintAuthority,
            payer: payer.publicKey,
            updateAuthority: mintAuthority,
          },
          { createMetadataAccountArgsV2: 
            { 
              data: ON_CHAIN_METADATA, 
              isMutable: true 
            } 
          }
        )
```

#### Main Funnction
Create a _async function_ call `main` to execute our app:

``` typescript
const main = async() => {
    console.log(`---STEP 1: Uploading MetaData---`);

    const connection = new Connection(clusterApiUrl("devnet"))
    const userWallet = await connectWallet(connection);

    let metadataUri = await uploadMetadata(userWallet, MY_TOKEN_METADATA);
    ON_CHAIN_METADATA.uri = metadataUri;

    console.log(`---STEP 2: Creating Mint Transaction---`);

    let mintKeypair = Keypair.generate();   
    console.log(`New Mint Address: `, mintKeypair.publicKey.toString());

    const newMintTransaction:Transaction = await createNewMintTransaction(
        connection,
        userWallet,
        mintKeypair,
        userWallet.publicKey,
        userWallet.publicKey,
        userWallet.publicKey
    );

    console.log(`---STEP 3: Executing Mint Transaction---`);

    const transactionId =  await connection.sendTransaction(newMintTransaction, [userWallet, mintKeypair]);
    console.log(`Transaction ID: `, transactionId);
    console.log(`Succesfully minted ${MINT_CONFIG.numberTokens} ${ON_CHAIN_METADATA.symbol} to ${userWallet.publicKey.toString()}.`);
    console.log(`View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`);
    console.log(`View Token Mint: https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`)
}

main();
```

## Run the Code!🎉
```
$ npm start
```
![螢幕擷取畫面_2023-03-31_164940](/uploads/28271366d267e1b1bb1bb8003b47b655/螢幕擷取畫面_2023-03-31_164940.png)

![螢幕擷取畫面_2023-03-30_220637](/uploads/7c420842dada501459735c7b23f8359f/螢幕擷取畫面_2023-03-30_220637.png)

<br/><br/>

# 2023/6/28 Program Update
The main modifications are createNewMintTransaction() and main()

## Difference

### Create Mint Transaction
1. old :
    ```
    //metadata account associated with mint
    const metadataPDA = await findMetadataPda(mintKeypair.publicKey)
    ```
    new :
    ```
    //metadata account associated with mint
    const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mintKeypair.publicKey });
    ```

2. old :
    ```
    createMetadataAccountArgsV2:{ 
        data: ON_CHAIN_METADATA, 
        isMutable: true 
    } 
    ```
    new :
    ```
    createMetadataAccountArgsV3: {
        data: ON_CHAIN_METADATA,
        isMutable: true,
        collectionDetails: null
    }
    ```

### Main Function
1. old :
    ```
    console.log(`---STEP 3: Executing Mint Transaction---`);

    const transactionId =  await connection.sendTransaction(newMintTransaction, [userWallet, mintKeypair]);
    console.log(`Transaction ID: `, transactionId);
    console.log(`Succesfully minted ${MINT_CONFIG.numberTokens} ${ON_CHAIN_METADATA.symbol} to ${userWallet.publicKey.toString()}.`);
    console.log(`View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`);
    console.log(`View Token Mint: https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`)
    ```
    new :
    ```
    console.log(`---STEP 3: Executing Mint Transaction---`);
    let { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash('finalized');
    newMintTransaction.recentBlockhash = blockhash;
    newMintTransaction.lastValidBlockHeight = lastValidBlockHeight;
    newMintTransaction.feePayer = userWallet.publicKey;
    const transactionId = await sendAndConfirmTransaction(connection, newMintTransaction, [userWallet, mintKeypair]);
    console.log(`Transaction ID: `, transactionId);
    console.log(`Succesfully minted ${MINT_CONFIG.numberTokens} ${ON_CHAIN_METADATA.symbol} to ${userWallet.publicKey.toString()}.`);
    ```
