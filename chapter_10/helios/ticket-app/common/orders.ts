import { Assets,
    bytesToHex,
    hexToBytes,
    TxInput,
    Value } from "@hyperionbt/helios";         

import { Swap } from "../common/types"
import { assert } from './utils';

export { calcOrderDetails }


/**
* Determine the quantity of a product a buyer can purchase
* given the amount he is willing to pay.
* @param {TxInput} utxo
* @param {Value} swapAskedAssetValue 
* @param {Swap} swap
* @return {askedAssetVal: Value, 
*            buyAssetVal: Value,
*            offeredAssetVal: Value,
*            changeAssetVal: Value,
*            noChange : Boolean } 
*/
async function calcOrderDetails (utxo : TxInput, 
                                swapAskedAssetValue : Value,
                                swap : Swap ) : Promise<({
                                                                    askedAssetVal: Value;
                                                                    buyAssetVal: Value;
                                                                    offeredAssetVal: Value;
                                                                    changeAssetVal: Value;
                                                                    noChange: Boolean;
                                                                })> {

// swapAskedAssetValue can't have any negative values
swapAskedAssetValue.assertAllPositive();

// Check for valid utxo
if (!utxo ||
    !utxo.origOutput ||
    !utxo.origOutput.datum ||
    !utxo.origOutput.datum.data
    ) {
      throw console.error("calcOrderDetails: Invalid utxo");
}

const datum = JSON.parse(utxo.origOutput.getDatumData().toSchemaJson());

// Check the datum that it contains both the askedAsset and offeredAsset
assert(datum.list.length == 2, "calcOrderDetails: invalid datum");

const askedAssetMPH = datum.list[0].map[0].k.bytes as string;
const askedAssetTN = datum.list[0].map[0].v.map[0].k.bytes as string;
const askedAssetQty = datum.list[0].map[0].v.map[0].v.int as bigint;
const askedAssetLovelace = askedAssetMPH === "" as string;

const offeredAssetMPH = datum.list[1].map[0].k.bytes as string;
const offeredAssetTN = datum.list[1].map[0].v.map[0].k.bytes as string;
const offeredAssetQty = datum.list[1].map[0].v.map[0].v.int as bigint;
const offeredAssetLovelace = offeredAssetMPH === "" as string;

// Get Values from the swap datum
const swapAskedAssetMP = swapAskedAssetValue.assets.mintingPolicies;
let swapAskedAssetlovelace = false;
var swapAskedAssetMPH;
var swapAskedAssetTN;
var swapAskedAssetQty;

// Check if the swapAskedAsset is lovelace
if (swapAskedAssetMP.length == 0) {
   swapAskedAssetlovelace = true;
   swapAskedAssetQty = swapAskedAssetValue.lovelace;
} else { 
  // The swapAskedAsset is a native token and should only contain 1 MPH
  assert(swapAskedAssetMP.length == 1);
  swapAskedAssetMPH = swapAskedAssetValue.assets.mintingPolicies[0];
  swapAskedAssetTN = swapAskedAssetValue.assets.getTokenNames(swapAskedAssetMPH)[0];
  swapAskedAssetQty = swapAskedAssetValue.assets.get(swapAskedAssetMPH, swapAskedAssetTN);
}

// If asked assets is not lovelace and asked & swap assets MPHs & TNs exist
if (!askedAssetLovelace && 
   askedAssetMPH && 
   swapAskedAssetMPH &&
   askedAssetTN &&
   swapAskedAssetTN) {
   // Check that the askedAssets match
   if (!(askedAssetMPH === swapAskedAssetMPH.hex &&
       askedAssetTN === bytesToHex(swapAskedAssetTN.bytes))) {
       alert("Swap assets do not match");
       throw console.error("calcQtyToBuy: swap assets don't match")
   }
}

var qtyToBuy : bigint;
var qtyRemainder : bigint;
var changeAmt : bigint;

const price = askedAssetQty;
const qty = offeredAssetQty;
const spendAmt = swapAskedAssetQty;
const diff = BigInt(spendAmt) - BigInt(price) * BigInt(qty); 

assert(price > 0); // price must be greater than zero
const orderAmt = BigInt(spendAmt) / BigInt(price);  
if (orderAmt < 1) {
    alert("Not enough funds to cover the swap")
    throw console.error("calcRemainder: insufficient funds")
} else if (diff >= 0) { 
    qtyToBuy = qty;  // can purchase all available qty
    qtyRemainder = BigInt(0);
    changeAmt = spendAmt - qtyToBuy * price; // return the change to the buyer
} else {
    qtyToBuy = orderAmt; 
    qtyRemainder = BigInt(qty) - BigInt(orderAmt);  // calc the remaining qty at the utxo
    changeAmt = BigInt(spendAmt) - BigInt(qtyToBuy) * BigInt(price); // return the change to the buyer
}

// If the change amount is too small to be sent back as change,
// then just included it as part of the overall cost to avoid
// sending back change to the buyer's wallet
if (swapAskedAssetMP.length == 0) {
  // Check if the swapAskedAsset is lovelace
  if (changeAmt < BigInt(swap.minLovelace)) {
      changeAmt = BigInt(0);
  }
} else if (changeAmt < 1) {
  changeAmt = BigInt(0);  
} 

// Create the updated offeredAsset
var updatedOfferAssetValue;
if (!offeredAssetLovelace && offeredAssetMPH && offeredAssetTN) {
   
  const offeredToken : [number[], bigint][] = [[hexToBytes(offeredAssetTN), qtyRemainder]];
   const offeredAsset = new Assets([[offeredAssetMPH, offeredToken]]);
   updatedOfferAssetValue = new Value(BigInt(0), offeredAsset);

} else {
   updatedOfferAssetValue = new Value(qtyRemainder);
}

// Create the offeredAsset that is being bought
const buyOfferedAsset = new Assets();
var buyOfferAssetValue;
if (!offeredAssetLovelace && offeredAssetMPH && offeredAssetTN) {
   buyOfferedAsset.addComponent(
       offeredAssetMPH,
       offeredAssetTN,
       qtyToBuy
   );
   buyOfferAssetValue = new Value(BigInt(0), buyOfferedAsset);
} else {
   buyOfferAssetValue = new Value(qtyToBuy);
}

// Create the change for the asked asset
var noChangeAmt;
var changeAskedAssetValue;
if (changeAmt == BigInt(0)) {
  noChangeAmt = true;
} else {
  noChangeAmt = false;
}

if (!swapAskedAssetlovelace && askedAssetMPH && askedAssetTN) {
   // Change is a native asset
  const changeAskedAsset = new Assets();
  changeAskedAsset.addComponent(
      askedAssetMPH,
      askedAssetTN,
      changeAmt
  );
  changeAskedAssetValue = new Value(BigInt(0), changeAskedAsset);   

} else {
   // Change is in lovelace
   changeAskedAssetValue = new Value(changeAmt);
}  

// Construct the asked asset value
const askedAsset = new Assets();
askedAsset.addComponent(
  askedAssetMPH,
  askedAssetTN,
  askedAssetQty
);
const askedAssetValue = new Value(BigInt(0), askedAsset);

const orderInfo = { 
  askedAssetVal: askedAssetValue,
  buyAssetVal: buyOfferAssetValue,
  offeredAssetVal: updatedOfferAssetValue,
  changeAssetVal: changeAskedAssetValue,
  noChange: noChangeAmt,
}
return orderInfo
}