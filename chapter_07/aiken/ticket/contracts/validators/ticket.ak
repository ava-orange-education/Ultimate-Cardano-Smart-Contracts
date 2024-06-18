use aiken/dict
use aiken/list
use aiken/transaction.{OutputReference, ScriptContext, Transaction} as tx
use aiken/transaction/value

// Define the minting redeemer
type Redeemer {
  Mint
  Burn
}

// Create a minting policy and pass in the token_name 
// utxo_ref,and qty as contract parameters 

validator(token_name: ByteArray, qty: Int, utxo_ref: OutputReference) {
  fn ticket(redeemer: Redeemer, ctx: ScriptContext) -> Bool {
    let ScriptContext { transaction, purpose } = ctx
    expect tx.Mint(policy_id) = purpose
    let Transaction { inputs, mint, .. } = transaction
    // Check that the asset value is what is being minted
    // with this transaction
    expect [(asset_name, amount)] =
      mint
        |> value.from_minted_value
        |> value.tokens(policy_id)
        |> dict.to_list()

    when redeemer is {
      Mint -> {
        // Check that that the utxo_ref is included as input
        expect Some(_input) =
          list.find(inputs, fn(input) { input.output_reference == utxo_ref })
        // Confirm that both the token name and qty are correct
        amount == qty && asset_name == token_name
      }
      // Allow burning of any number of tokens per transaction
      Burn -> amount < 0 && asset_name == token_name
    }
  }
}
