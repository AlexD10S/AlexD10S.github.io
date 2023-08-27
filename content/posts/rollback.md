---
title: "Parachain State Rollback"
date: 2022-08-01T12:56:25+05:30
weight: 160
draft: false
summary: "A step by step how to do a state rollback in a Parachain."
#tags: ["dsa"]
categories: ["polkadot", "substrate", "parachains"]
aliases: [/dsa]
featuredImage: "/images/rollback/cover-image.png"
images: ["/images/rollback/cover-image.png"]
---

In this document we are going to see step by step how to do a state rollback in a Parachain that is connected already to a Relay Chain. 

To test the process about exporting the state and creating a new chain spec we will run a Parachain node connected to a Relay Chain with two validators.

Follow this tutorials for more information about [running a relay chain](https://docs.substrate.io/tutorials/connect-other-chains/prepare-a-local-relay-chain/) and [connecting a parachain to it](https://docs.substrate.io/tutorials/connect-other-chains/connect-a-local-parachain/).

> Other option to start a Relay chain with validators automatically it can be done using Zombienet too, check this [guide](https://hackmd.io/kSFS2ButRESeJ7hu_iKKoA) to know how to do it.

Once we have all the relay chain running and the parachain connected to it we can do some transfers between different accounts to modify the state, just for demo purposes.

Now we are going to stop the collators of the parachain (`Ctrl + C`):

1. First export the state by default in the last block number:
    ```sh
    ./target/release/parachain-template-node export-state --chain=raw-parachain-chainspec.json --pruning=archive > chain-exported.json
    ```

    In case we want to export it from a specific block number, it has to be specified in the command (Ex: block 20) and the base path of the DB:
    ```sh
    ./target/release/parachain-template-node export-state --chain=raw-parachain-chainspec.json --base-path /tmp/parachain/alice 20 > chain-exported-20.json
    ```
2. Generate a parachain genesis state, indicating the chain file created above.
    ```sh
    ./target/release/parachain-template-node export-genesis-state --chain=chain-exported.json > chain-exported-genesis-state
    ```
    or for a specific block:

    ```sh
    ./target/release/parachain-template-node export-genesis-state --chain=chain-exported-20.json > chain-exported-genesis-state-20
    ```
3. Export the WebAssembly runtime for the parachain, indicating the chain file created above.
    ```sh
    ./target/release/parachain-template-node export-genesis-wasm --chain=chain-exported.json > chain-exported-genesis-wasm
    ```

    or for a specific block:

    ```sh
    ./target/release/parachain-template-node export-genesis-wasm --chain=chain-exported-20.json > chain-exported-genesis-wasm-20
    ```
4. Now we can stop all the collators of the parachain `(Ctrl +C)`


For the demo now, we going to delete all the information left in the databases of the parachain and make the parachain lost its lease on the relay chain.

1. Wipe parachain DBs
    By deleting the DB manually:
    ```sh
    rm -rf /tmp/parachain/alice` 
    ```
    The path has been set when running the node:
    `--base-path /tmp/parachain/alice \`

    Or using the purge-chain command:
    ```sh
    ./target/release/parachain-template-node purge-chain --base-path=/tmp/parachain/alice` 
    ```
2. Offboard the parachain
    Going under the Sudo sub-page, pick parasSudoWrapper > sudoScheduleParaCleanup and the id of our parachain in our case 2002 (By default following the tutorial should be 2000).
    ![](https://i.imgur.com/piKAy8P.png)

    If you go under the Network > Parachains sub-page, you will see is offboarding the parachain.
    ![](https://i.imgur.com/eT57XCW.png)

### Restart the parachain
After that we want to restart our parachain in the same block 20 as we saved the state.
Now we run a node of our parachain again, setting the new chain state JSON file.

```sh
./target/release/parachain-template-node \
--alice \
--collator \
--force-authoring \
--chain chain-exported-20.json \
--base-path /tmp/parachain/alice \
--port 40333 \
--ws-port 8844 \
-- \
--execution wasm \
--chain relay-chain-spec.json \
--port 30343 \
--ws-port 9977
```

And register the parachain again going under the Sudo sub-page, pick parasSudoWrapper > sudoScheduleParaInitialize, using the new genesisHead: `chain-exported-genesis-state-20` and validationCode: `chain-exported-genesis-wasm`

![](https://i.imgur.com/h1XUBTl.png)

Originally posted here: -

- [Parachain Rollback](https://hackmd.io/3BAy3HEzRVO2sBFnUaBVKA)

