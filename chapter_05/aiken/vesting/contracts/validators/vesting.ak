use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/string
use aiken/transaction.{ScriptContext}
use aiken/transaction/credential.{VerificationKey}

const version: ByteArray = "2024-08-30-1.0.8"

/// Create a datum with the owner PubKeyHash that will be included 
/// into each UTXO locked at this script address.
type Datum {
  owner: Hash<Blake2b_224, VerificationKey>,
}

/// The vesting contract can be either cancelled by the owner
/// or claimed by the beneificiary
type Redeemer {
  Cancel
  Claim { msg: ByteArray }
}

// Add hard coded message constant 
const message: ByteArray = "Hello World!"

validator {
  fn vesting(datum: Datum, redeemer: Redeemer, context: ScriptContext) -> Bool {
    trace string.from_bytearray(version)
    when redeemer is {
      Cancel ->
        // Tx must be singed by pkh in datum
        list.has(context.transaction.extra_signatories, datum.owner)
      Claim { msg } ->
        // Redeemer must match the message to spend this UTXO
        msg == message
    }
  }
}
