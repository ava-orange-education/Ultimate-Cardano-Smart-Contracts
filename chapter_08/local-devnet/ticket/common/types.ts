export { TicketInfo,
        WalletInfo }

/**
 * TicketInfo class to capture all of the metadata related to this ticket
 */

class TicketInfo {
    public name : string
    public description : string
    public image : string
    public qty: string
    public utxoId : string
    public utxoIdx : string
    
    /**
     * Create TicketInfo
     * @param {string} name
     * @param {string} description
     * @param {string} image
     * @param {string} qty
     * @param {string} utxoId
     * @param {string} utxoIdx
     * 
     */

    constructor(name : string,
                description : string,
                image : string,
                qty : string,
                utxoId : string,
                utxoIdx: string) {
        this.name = name;
        this.description = description;
        this.image = image;
        this.qty = qty;
        this.utxoId = utxoId;
        this.utxoIdx = utxoIdx;
    }
}


/**
 * WalletInfo class for all assets held by the wallet
 */

class WalletInfo {
    public addr: string
    public balance: []
    
    /**
     * Create WalletInfo
     * @param {string} addr
     * @param {[]} balance
     * 
     */
    constructor(addr : string,
                balance : []) {
        this.addr = addr;
        this.balance = balance;
    }
}
