export { 
    AssetInfo,
    Event,
    Filter,
    PrintTicketInfo,
    Swap,
    Ticket,
    WalletChoice,
    WalletInfo
}

/**
 * AssetInfo
 */

class AssetInfo {
    public asset : string
    public mph : string
    public tn : string
    public qty : number

    /**
     * Create AssetInfo
     * @param {string} asset
     * @param {string} mph
     * @param {string} tn
     * @param {number} qty
     */

    constructor(asset : string,
                mph : string,
                tn : string,
                qty : number) {
        this.asset = asset;
        this.mph = mph;
        this.tn = tn;
        this.qty = qty;
    }
}

/**
* Event class for details on an event
*/

class Event {
    public asset: string
    public name: string 
    public location: string 
    public showtime: string
    public image: string 
    public allocated: number
    public holding: number
    public released: number
    public converted: number
    public holdValHash: string
    public paymentPKH: string
    public stakePKH: string
    public txId: string 
    public confirmed: boolean
    public active: boolean

    /**
     * Create Event
     * @param { string } asset
     * @param { string } name
     * @param { string } location
     * @param { string } showtime
     * @param { string } image
     * @param { number } allocated
     * @param { number } holding
     * @param { number } released
     * @param { number } converted
     * @param { string } holdValHash
     * @param { string } paymentPKH
     * @param { string } stakePKH
     * @param { string } txId
     * @param { boolean } confirmed
     * @param { boolean } active
     */
    constructor(asset: string,
                name: string,
                location: string,
                showtime: string,
                image: string,
                allocated: number,
                holding: number,
                released: number,
                converted: number,
                holdValHash: string,
                paymentPKH: string,
                stakePKH: string,
                txId: string,
                confirmed: boolean,
                active: boolean
                ) {
        this.asset = asset;
        this.name = name;
        this.location = location;
        this.showtime = showtime;
        this.image = image;
        this.allocated = allocated;
        this.holding = holding;
        this.released = released;
        this.converted = converted;
        this.holdValHash = holdValHash;
        this.paymentPKH = paymentPKH;
        this.stakePKH = stakePKH;
        this.txId = txId;
        this.confirmed = confirmed;
        this.active = active;
    }
}

/**
* Filter class for filtering on a swap
*/

class Filter {
    public text: string
    public offeredAsset: string
    public offeredAssetQty: string
    public startDate: string
    public endDate: string
    public askedAsset: string
    public askedAssetQty: string

    /**
     * Create Filter
     * @param { string } text
     * @param { string } offeredAsset
     * @param { string } offeredAssetQty
     * @param { string } startDate
     * @param { string } endDate
     * @param { string } askedAsset
     * @param { string } askedAssetQty
     */
    constructor(text: string,
                offeredAsset: string,
                offeredAssetQty: string,
                startDate: string,
                endDate: string,
                askedAsset: string,
                askedAssetQty: string
                ) {
        this.text = text;
        this.offeredAsset = offeredAsset;
        this.offeredAssetQty = offeredAssetQty;
        this.startDate = startDate;
        this.endDate = endDate;
        this.askedAsset = askedAsset;
        this.askedAssetQty = askedAssetQty;
    }
}

/**
 * PrintTicket represents the ticket cip68 datum metadata
 * that will be used for printing and verifying a ticket
 */

class PrintTicketInfo {
    public asset : string
    public mph : string
    public name : string
    public location : string
    public showtime : string
    public image : string
    public pkh : undefined | string

    /**
     * Create PrintTicket
     * @param {string} asset
     * @param {string} mph
     * @param {string} name
     * @param {string} location
     * @param {string} showtime
     * @param {string} image
     * @param {undefined | string} pkh
     */

    constructor(asset : string,
                mph : string,
                name : string,
                location : string,
                showtime : string,
                image : string,
                pkh : undefined | string) {
        this.asset = asset;
        this.mph = mph;
        this.name = name;
        this.location = location;
        this.showtime = showtime;
        this.image = image;
        this.pkh = pkh;
    }
}


/**
* Swap class for details on a swap
*/

class Swap {
    public name: string 
    public location: string 
    public showtime: number
    public image: string
    public description: string
    public askedAsset: string
    public askedAssetQty: number
    public offeredAsset: string
    public offeredAssetQty: number
    public beaconAsset: string
    public holdValHash: string
    public paymentPKH: string
    public stakePKH: string
    public ownerPKH: string
    public minLovelace: number
    public txId: string
    public confirmed: boolean

    /**
     * Create Swap
     * @param { string } name
     * @param { string } location
     * @param { number } showtime
     * @param { string } image
     * @param { string } description
     * @param { string } askedAsset
     * @param { number } askedAssetQty
     * @param { string } offeredAsset
     * @param { number } offeredAssetQty
     * @param { string } beaconAsset
     * @param { string } holdValHash
     * @param { string } paymentPKH
     * @param { string } stakePKH
     * @param { string } ownerPKH
     * @param { string } minLovelace
     * @param { string } txId
     * @param { boolean } confirmed
     */
    constructor(
        name: string,
        location: string,
        showtime: number,
        image: string,
        description: string,
        askedAsset: string,
        askedAssetQty: number,
        offeredAsset: string,
        offeredAssetQty: number,
        beaconAsset: string,
        holdValHash: string,
        paymentPKH: string,
        stakePKH: string,
        ownerPKH: string,
        minLovelace: number,
        txId: string,
        confirmed: boolean,
        ) {
    this.name = name;
    this.location = location;
    this.showtime = showtime;
    this.image = image;
    this.description = description;
    this.askedAsset = askedAsset;
    this.askedAssetQty = askedAssetQty;
    this.offeredAsset = offeredAsset;
    this.offeredAssetQty = offeredAssetQty;
    this.beaconAsset = beaconAsset;
    this.holdValHash = holdValHash;
    this.paymentPKH = paymentPKH;
    this.stakePKH = stakePKH;
    this.ownerPKH = ownerPKH;
    this.minLovelace = minLovelace;
    this.txId = txId;
    this.confirmed = confirmed;
    }
}


/**
* Ticket class for details on the ticket minting policy
*/

class Ticket {
    public txId: string
    public txIdx: number 
    public tokenName: string
    public location: string
    public showtime: string 
    public image: string 
    public tokenQty: number
    public paymentPKH: string
    public stakePKH: string
    public holdValHash: string
    public minLovelace: number
    
    /**
     * Create Ticket
     * @param { string } txId
     * @param { number } txIdx
     * @param { string } tokenName
     * @param { string } location
     * @param { string } showtime
     * @param { string } image
     * @param { number } tokenQty
     * @param { string } paymentPKH
     * @param { string } stakePKH
     * @param { string } holdValHash
     * @param { number } minLovelace
     */
    constructor(txId: string,
                txIdx: number,
                tokenName: string,
                location: string,
                showtime: string,
                image: string,
                tokenQty: number,
                paymentPKH: string,
                stakePKH: string,
                holdValHash: string,
                minLovelace: number
                ) {
            this.txId = txId;
            this.txIdx = txIdx;
            this.tokenName = tokenName;
            this.location = location;
            this.showtime = showtime;
            this.image = image;
            this.tokenQty = tokenQty;
            this.paymentPKH = paymentPKH;
            this.stakePKH = stakePKH;
            this.holdValHash = holdValHash;
            this.minLovelace = minLovelace;
    }
}


/**
 * WalletChoice values needed to select a wallet
 */

class WalletChoice {
    public name : string
    public imgSrc : any
    public api : string

    /**
     * Create WalletChoice
     * @param {string} name
     * @param {string} imgSrc
     * @param {string} api
     */

    constructor(name : string,
                imgSrc : string,
                api : string) {
        this.name = name;
        this.imgSrc = imgSrc;
        this.api = api;
    }
}


/**
* WalletInfo class info for all assets held by an address
*/

class WalletInfo {
    public addr: string
    public stakeAddr: string | null
    public lovelace: number
    public assets: AssetInfo[]

    /**
     * Create WalletInfo
     * @param {string} addr
     * @param {string | null} stakeAddr
     * @param {number} lovelace
     * @param {AssetInfo[]} assets
     * 
     */
    constructor(addr: string,
                stakeAddr: string | null,
                lovelace: number,
                assets: AssetInfo[]) {
        this.addr = addr;
        this.stakeAddr = stakeAddr;
        this.lovelace = lovelace;
        this.assets = assets;
    }
}
