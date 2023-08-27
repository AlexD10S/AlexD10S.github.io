---
title: "Add custom RPC to the node"
date: 2022-11-01T12:56:25+05:30
weight: 160
draft: false
summary: "A guide about how to add a custom RPC on your node."
#tags: ["dsa"]
categories: ["polkadot", "substrate", "substrate-node-template"]
aliases: [/dsa]
---

Remote Procedure Calls, or RPCs, are a way for an external program—for example, a browser or front-end application—to communicate with a Substrate node. 
Substrate comes with several default [RPCs](https://polkadot.js.org/docs/substrate/rpc/). 

### Learning Objectives
By the end of this document, you should be able to:
* Implement a custom RPC call in your pallet.
* Add your custom RPC methods in your node.
* Query them using Postman or Curl.

We use the Substrate node template and we will add a method in the template pallet.

### Set up
Clone the substrate node template repository and compile it.
```sh
git clone https://github.com/substrate-developer-hub/substrate-node-template

cd substrate-node-template

cargo build --release
```

### Add custom RPC in our pallet
Modify the pallet to add the custom RPC calls. The pallet template has a function `do_something` that store a value in the storage. 
For this tutorial we are going to create an RPC call that reads that value in the storage.
1.  Inside the pallet template folder create a new folder called rpc: `pallets/template/src/rpc`

2. The RPC call interacts with the pallet-tempate runtime API to call the function that gets the value. For that we will create a pallet-template-runtime-api. Create a new folder inside the rpc folder: `pallets/template/src/rpc/runtime-api`

    *This folder can live anywhere you like, but because it defines an API that is closely related to a particular pallet, it makes sense to include the API definition in the pallet's directory.*
    
3. Create the `Cargo.toml` file for the runtime-api package. In `pallets/template/src/rpc/runtime-api/Cargo.toml`
```toml
[package]
name = "pallet-template-runtime-api"
authors = ["Alex Bean <https://github.com/AlexD10S>"]
version = "1.0.0"
edition = "2021"

[package.metadata.docs.rs]
targets = ["x86_64-unknown-linux-gnu"]

[dependencies]
sp-api = { git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v0.9.28", default-features = false }

[features]
default = ["std"]
std = [
    "sp-api/std",
]
```
4. And define the runtime API interface:
`pallets/template/src/rpc/runtime-api/src/lib.rs`

    The code to define the API is quite simple, and looks almost like any old Rust trait. The one addition is that it must be placed in the decl_runtime_apis! macro. This macro allows the outer node to query the runtime API at specific blocks. Although this runtime API only provides a single function, you may write as many as you like.

```rs
#![cfg_attr(not(feature = "std"), no_std)]

// Here we declare the runtime API. It is implemented it the `impl` block in
// runtime file (the `runtime-api/src/lib.rs`)
sp_api::decl_runtime_apis! {
	pub trait TemplateApi {
		fn get_value() -> u32;
	}
}
```

5. Now define the RPC. Create a folder Cargo.toml in the rpc folder:
`pallets/template/src/rpc/Cargo.toml`

    Here import the runtime-api defined before:
`pallet-template-runtime-api = { path = "./runtime-api", default-features = false }`

    And the [JSON-RPC library] for Rust (https://github.com/paritytech/jsonrpsee)

    `jsonrpsee = { version = "0.15.1", features = ["server", "macros"] }`
    
    *Full file:*
```toml
[package]
name = "pallet-template-rpc"
version = "1.0.0"
edition = "2021"
authors = ["Alex Bean <https://github.com/AlexD10S>"]
description = 'RPC methods for the template pallet'

[package.metadata.docs.rs]
targets = ["x86_64-unknown-linux-gnu"]

[dependencies]
codec = { package = "parity-scale-codec", version = "3.0.0", default-features = false, features = [
	"derive",
] }

jsonrpsee = { version = "0.15.1", features = ["server", "macros"] }


# Substrate packages
sp-api = { default-features = false, version = "4.0.0-dev", git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v0.9.28" }
sp-blockchain = { default-features = false, version = "4.0.0-dev", git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v0.9.28" }
sp-runtime = { default-features = false, version = "6.0.0", git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v0.9.28" }

# local packages
pallet-template-runtime-api = { path = "./runtime-api", default-features = false }

[features]
default = ["std"]
std = [
  "sp-api/std",
  "sp-runtime/std",
  "pallet-template-runtime-api/std"
]
```
6. Inside the rpc folder create a src folder with a lib.rs where we will define the Pallet Template RPC.

    * 6.1.  First define the RPC interface. 
Notice that the struct that implements the RPC needs a reference to the client. This is necessary so we can actually call into the runtime. 
And the struct is generic over the BlockHash type. This is because it will call a runtime API, and runtime APIs must always be called at a specific block.
```rs
#[rpc(client, server)]
pub trait TemplateApi<BlockHash> {
	#[method(name = "template_getValue")]
	fn get_value(&self, at: Option<BlockHash>) -> RpcResult<u32>;
}

/// A struct that implements the `TemplateApi`.
pub struct TemplatePallet<C, Block> {
	// If you have more generics, no need to TemplatePallet<C, M, N, P, ...>
	// just use a tuple like TemplatePallet<C, (M, N, P, ...)>
	client: Arc<C>,
	_marker: std::marker::PhantomData<Block>,
}

impl<C, Block> TemplatePallet<C, Block> {
	/// Create new `TemplatePallet` instance with the given reference to the client.
	pub fn new(client: Arc<C>) -> Self {
		Self { client, _marker: Default::default() }
	}
}
```

 * 6.2. Now the RPC's implementation. 
The additional syntax here is related to calling the runtime at a specific block, as well as ensuring that the runtime we're calling actually has the correct runtime API available.

```rs
impl<C, Block> TemplateApiServer<<Block as BlockT>::Hash> for TemplatePallet<C, Block>
where
	Block: BlockT,
	C: Send + Sync + 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: TemplateRuntimeApi<Block>,
{
	fn get_value(&self, at: Option<<Block as BlockT>::Hash>) -> RpcResult<u32> {
		let api = self.client.runtime_api();
		let at = BlockId::hash(at.unwrap_or_else(||self.client.info().best_hash));

		api.get_value(&at).map_err(runtime_error_into_rpc_err)
	}
}

const RUNTIME_ERROR: i32 = 1;

/// Converts a runtime trap into an RPC error.
fn runtime_error_into_rpc_err(err: impl std::fmt::Debug) -> JsonRpseeError {
	CallError::Custom(ErrorObject::owned(
		RUNTIME_ERROR,
		"Runtime error",
		Some(format!("{:?}", err)),
	))
	.into()
}
```
* 6.3. The full file in `pallets/template/src/rpc/src/lib.rs`:
```rs
pub use pallet_template_runtime_api::TemplateApi as TemplateRuntimeApi;
use jsonrpsee::{
	core::{Error as JsonRpseeError, RpcResult},
	proc_macros::rpc,
	types::error::{CallError, ErrorObject},
};
use sp_api::ProvideRuntimeApi;
use sp_blockchain::HeaderBackend;
use sp_runtime::{generic::BlockId, traits::Block as BlockT};
use std::sync::Arc;

#[rpc(client, server)]
pub trait TemplateApi<BlockHash> {
	#[method(name = "template_getValue")]
	fn get_value(&self, at: Option<BlockHash>) -> RpcResult<u32>;
}

/// A struct that implements the `TemplateApi`.
pub struct TemplatePallet<C, Block> {
	// If you have more generics, no need to TemplatePallet<C, M, N, P, ...>
	// just use a tuple like TemplatePallet<C, (M, N, P, ...)>
	client: Arc<C>,
	_marker: std::marker::PhantomData<Block>,
}

impl<C, Block> TemplatePallet<C, Block> {
	/// Create new `TemplatePallet` instance with the given reference to the client.
	pub fn new(client: Arc<C>) -> Self {
		Self { client, _marker: Default::default() }
	}
}

impl<C, Block> TemplateApiServer<<Block as BlockT>::Hash> for TemplatePallet<C, Block>
where
	Block: BlockT,
	C: Send + Sync + 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: TemplateRuntimeApi<Block>,
{
	fn get_value(&self, at: Option<<Block as BlockT>::Hash>) -> RpcResult<u32> {
		let api = self.client.runtime_api();
		let at = BlockId::hash(at.unwrap_or_else(||self.client.info().best_hash));

		api.get_value(&at).map_err(runtime_error_into_rpc_err)
	}
}

const RUNTIME_ERROR: i32 = 1;

/// Converts a runtime trap into an RPC error.
fn runtime_error_into_rpc_err(err: impl std::fmt::Debug) -> JsonRpseeError {
	CallError::Custom(ErrorObject::owned(
		RUNTIME_ERROR,
		"Runtime error",
		Some(format!("{:?}", err)),
	))
	.into()
}
```

7. Modify the pallet implementation to have a function called get_value(), in `pallets/template/src/lib.rs`

Change:
`#[pallet::getter(fn something)]`
with
`#[pallet::getter(fn get_value)]`



### Set up the node for the pallet-template Custom RPC
1. Implement now in the runtime of the node the function get_value() declared in the pallet-template-runtime-api

    Add the runtime-api pallet in the configuration file of the pallet, in:
`runtime/Cargo.toml`
    ```toml
    # local packages
    pallet-template-runtime-api = { path = "../pallets/template/rpc/runtime-api", default-features = false }}
    ```
    And add in the std:
    ```toml
    std = [
        ...,
        "pallet-template-runtime-api/std",
    ]
    ```

    Add the implementation of the runtime function in the pallet:
    `runtime/src/lib.rs`
```rs
impl pallet_template_runtime_api::TemplateApi<Block> for Runtime {
    fn get_value() -> u32 {
        TemplateModule::get_value().unwrap_or(0)
    }
}
```

2. Install the RPC in our node
To add the node-specific RPC methods modify the files in the node to include our pallet RPC code manually.


*  First adding the new pallet in the configuration file in the node/Config.toml:
 `pallet-template-rpc = { version = "1.0.0", path = "../pallets/template/rpc" }`
 
 * Then adding the node-specific RPC methods. Modify the file node/rpc.rs and there include the pallet template  RPC code.
```rs
 /// Instantiate all full RPC extensions.
pub fn create_full<C, P>(
	deps: FullDeps<C, P>,
) -> Result<RpcModule<()>, Box<dyn std::error::Error + Send + Sync>>
where
	C: ProvideRuntimeApi<Block>,
	C: HeaderBackend<Block> + HeaderMetadata<Block, Error = BlockChainError> + 'static,
	C: Send + Sync + 'static,
	C::Api: substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Index>,
	C::Api: pallet_transaction_payment_rpc::TransactionPaymentRuntimeApi<Block, Balance>,
	C::Api: pallet_template_rpc::TemplateRuntimeApi<Block>,
	C::Api: BlockBuilder<Block>,
	P: TransactionPool + 'static,
{
	use pallet_transaction_payment_rpc::{TransactionPayment, TransactionPaymentApiServer};
	use substrate_frame_rpc_system::{System, SystemApiServer};
	use pallet_template_rpc::{TemplatePallet, TemplateApiServer};

	let mut module = RpcModule::new(());
	let FullDeps { client, pool, deny_unsafe } = deps;

	module.merge(System::new(client.clone(), pool.clone(), deny_unsafe).into_rpc())?;
	module.merge(TransactionPayment::new(client.clone()).into_rpc())?;
	module.merge(TemplatePallet::new(client).into_rpc())?;

	// Extend this RPC with a custom API by using the following syntax.
	// `YourRpcStruct` should have a reference to a client, which is needed
	// to call into the runtime.
	// `module.merge(YourRpcTrait::into_rpc(YourRpcStruct::new(ReferenceToClient, ...)))?;`

	Ok(module)
}
```

**Well done!**  👏  👏 

### Query the RPC calls
Now let's see how to query this call.
Compile the node and run it:
```sh
cargo build --release

./target/release/node-template --dev
```

To check the pallet RPC methods has been include open PokadotJS and go under the tab Development > RPC calls.
In the dropdown "Call the selected endpoint", pick rpc and the function methods() and you will see all the RPC methods available, included the one that we have just included.

![](https://i.imgur.com/zR9mVtj.png)


To test it, we are going to first store a value using the methods of the pallet. 
Going under Development > Extrinsics, in the Dropdown pick the templateModule and the function doSomething(something) and fill the value something, like in the picture below.
![](https://i.imgur.com/eOS2VW7.png)

We have stored a value there, and we can test our RPC method now to get that value.

Is possible to test the RPC request with Postman or CURL.

* An example with Postman, a POST method to query the template_getValue method:

![](https://i.imgur.com/vpqpVl1.png)


* And an example using CURL, in the command line:

`curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "template_getValue", "params": []}' http://localhost:9933/`

Will return the same as Postman in the console:
`{"jsonrpc":"2.0","result":100,"id":1}`

A full example of the code of this tutorial can be found here: https://github.com/AlexD10S/susbtrate-node-template/tree/rpc-custom-methods


Originally posted here: -

- [Hack.md - Add custom RPC to the node](https://hackmd.io/JpJCbu0nTa2jym0za1Tggw)
- [StackExchange - How to add custom RPCs?](https://substrate.stackexchange.com/questions/5554/how-to-add-custom-rpcs)
