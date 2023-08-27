---
title: "Weights V2"
date: 2023-05-01T12:56:25+05:30
weight: 160
draft: false
summary: "Article explaining the new concept of Weights v2."
#tags: ["dsa"]
categories: ["polkadot", "substrate", "weights"]
aliases: [/dsa]
---

Weights V2 is a fundamental change in the way Weights works on Substrate particularly for Parachains. The main idea behind this change was to migrate from an unidimensional way to measure the weights to multi-dimensional. 

Multi-dimensional weights are a method of calculating transaction fees that takes into account multiple factors or dimensions, such as the computational time required, the storage resources used, memory usage...

It was proposed on 2019 for Ethereum by Gavin, with the term Chromatic gas ([here](https://arxiv.org/pdf/1903.04077.pdf)), in order to have different gas metering for different resource consumptions.

The main purpose of this migration is to add a new dimension into the Weights (2D Weights) to secure parachains weighting the size of the PoV.

> PoV stands for Proof of Validity and is the proof that a collator from a Parachain sends to the Relay Chain, for more info check this [blog post](https://medium.com/polkadot-network/the-path-of-a-parachain-block-47d05765d7a).
> 

Gavin define 2D Weigths it in the Sub0 conference as:

> Needed for automated functions to be executed on-parachain (e.g. migrations, XCM, scheduled stuff) safely.
> 

With WeightsV1 it can be a problem with certain extrinsics that might not take too much time for its execution but may end up having a huge footprint that increases the PoV size. This can open the parachains to DoS attacks trying to reach the PoV size limit.

Also this simple weight metrics may not accurately reflect the actual resource consumption of a transaction, which can lead to unfair fees or inefficient use of resources.

### Basics WeightsV1 to Weights V2
From the PR: https://github.com/paritytech/substrate/pull/10918

The Weight V1 system is a single `u64`value which measures the computational time to execute some runtime logic, in the Wasm environment, using some reference hardware.  These weights are calculated using the benchmarking system.

```rust
/// Numeric range of a transaction weight.
pub type Weight = u64;
```

It worked fine for solo-chains, where the only practical limitation was the block time. However, with the parachains protocol, another limit which has been introduced is the proof size, which is needed to execute the proof of validity function by validators on Polkadot.

To address that we need to update the Weight type to not only represent computational time, but also proof size, to ensure that parachains do not produce blocks which are invalid in the eyes of Polkadot.

- Execution Time on “Reference Hardware”
- Size of data required to create a Merkle Proof

```rust
#[derive(
	Encode, Decode, MaxEncodedLen, TypeInfo, Eq, PartialEq, Copy, Clone, RuntimeDebug, Default,
)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct Weight {
	#[codec(compact)]
	/// The weight of computational time used based on some reference hardware.
	ref_time: u64,
	#[codec(compact)]
	/// The weight of storage space used by proof of validity.
	proof_size: u64,
}
```

Notice all fields are private to allow adding of new fields without needing to touch everything, again.

### Example Re-Benchmarking your pallet
In the release v0.9.38 the`frame-benchmarking-cli` was updated to output estimated Proof-of-Validity sizes which are needed for the new weights.

This means you can use this tool to recalculate the Weights for your pallet to use the new type of Weights.

I have migrate the benchmarking of the pallet-template in the substrate-node-template to show how to  do it, see this commit to see the full example in this commit:

 https://github.com/paritytech/substrate/pull/13817/commits/ee95acf39c4b47be07f317bcc13905ff7e637e19

Changing the method `do_something()`:

```rust
use frame_benchmarking::v1::{benchmarks, whitelisted_caller};
use frame_system::RawOrigin;

benchmarks! {
	do_something {
		let s in 0 .. 100;
		let caller: T::AccountId = whitelisted_caller();
	}: _(RawOrigin::Signed(caller), s)
	verify {
		assert_eq!(Something::<T>::get(), Some(s));
	}

	impl_benchmark_test_suite!(Template, crate::mock::new_test_ext(), crate::mock::Test);
}
```

To use the new benchmarking:v2 tool:

```rust
use frame_benchmarking::v2::*;
use frame_system::RawOrigin;

#[benchmarks]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn do_something() {
		let value = 100u32.into();
		let caller: T::AccountId = whitelisted_caller();
		#[extrinsic_call]
		do_something(RawOrigin::Signed(caller), value); 

		assert_eq!(Something::<T>::get(), Some(value));
	}
}
```

Re-benchmarking it, generates the Weights with the new format (adding the proof_size):

```rust
  /// Storage: TemplateModule Something (r:0 w:1)
	/// Proof: TemplateModule Something (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	fn do_something() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `0`
		//  Estimated: `0`
		// Minimum execution time: 8_000_000 picoseconds.
		Weight::from_parts(8_000_000, 0)
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
```

### Other Interesting Code Changes
**1- Constructor**

```rust
/// Construct [`Weight`] from weight parts, 
/// namely reference time and proof size weights.
pub const fn from_parts(ref_time: u64, proof_size: u64) -> Self {
		Self { ref_time, proof_size }
}
```

**2- Change Sintaxis in the configuration of your pallet**

```rust
-	type WeightInfo = weights::pallet_$name::WeightInfo;
+	type WeightInfo = pallet_$name::weights::SubstrateWeight<Runtime>;
```

3- [**Remove Ord impl for Weights V2 and add comparison fns**](https://github.com/paritytech/substrate/pull/12183)

Replace all the unidimensional type of operation per new multi-dimensional operations.

An example in your pallet: 

```rust
assert!(info1.weight > info2.weight);
```

Per:

```rust
assert!(info1.weight.all_gt(info2.weight));
```

```rust
/// Returns true if all of `self`'s constituent weights is strictly greater 
/// than that of the `other`'s, otherwise returns false.
pub const fn all_gt(self, other: Self) -> bool {
	self.ref_time > other.ref_time && self.proof_size > other.proof_size
}
```

1. **Add [Proof Size to Weight Output](https://github.com/paritytech/substrate/pull/11637) (In v.0.9.38)**
    
    This updates the `frame-benchmarking-cli`to output estimated Proof-of-Validity sizes which are needed for the new weights.
    
    To migrate in your parachain:
    
    - If you have a custom [weight template](https://github.com/paritytech/substrate/blob/213e340742153e81cd7cef2fdc07e021a12629f2/.maintain/frame-weight-template.hbs#L61); update it according to the changes in this MR.
    - Re-benchmark all your pallets to generate new weights.
    - Ensure that the outputted proof sizes will not overflow your block limit for important tasks like democracy.**THIS IS IMPORTANT TO NOT STUCK YOUR CHAIN**Runtime upgrades itself should still work since they run in `on_initialize` which is mandatory and thereby not weight limited.

**5- Max Proof Size**

The default max proof size is set at `u64::MAX`, because not all substrate-based chains require submitting PoV blocks to the relay. (Standalone sovereign chains can safely ignore this weight component).

For parachains however, the proper parameter to set for the max proof size comes from the relay chain, and is stored a field called `max_pov_size.`

In Polkadot is set like this:
```rust
/// Maximum PoV size we support right now.
///
/// Used for:
/// * initial genesis for the Parachains configuration
/// * checking updates to this stored runtime configuration 
///   do not exceed this limit
/// * when detecting a PoV decompression bomb in the client
// NOTE: This value is used in the runtime so be careful when changing it.
pub const MAX_POV_SIZE: u32 = 5 * 1024 * 1024;
```

### History of the migration
##### Pre-Migration to V2 (Weights V1.5)

PR: [Weights V1.5: Opaque Struct](https://github.com/paritytech/substrate/pull/12138) 

Just keep it here for historical reason.

First part of the migration was in the release v0.9.29 there was a migration called [Weights V1.5: Opaque Struct](https://github.com/paritytech/substrate/pull/12138) which was an intermediate step in this migration.

Changes the previous type:

```rust
/// Numeric range of a transaction weight.
pub type Weight = u64;
```

To

```rust
/// The unit of measurement for computational time spent 
/// when executing runtime logic on reference hardware.
pub type RefTimeWeight = u64;

#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct Weight {
	/// The weight of computational time used based on 
  /// some reference hardware.
	ref_time: RefTimeWeight,
}
```

To migrate in your parachain use of regex for the migration in all places you use weights (pallets):

![Screenshot 2023-03-29 at 13.21.24.png](/images/weigthsv2/script.png)

Example migration on FRAME pallets:

https://github.com/paritytech/substrate/pull/12157/files 

Examples of the migration on a parachain Trappist:

https://github.com/paritytech/trappist/pull/68/files#diff-c1cd8c63c449f0325a5713742dee8ad63e14d964201ded5ceb3bc791dab6cbbd