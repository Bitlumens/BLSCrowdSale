/*
 * Utilities functions
 */

// Ethers
function ether(n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}

// Latest time
function latestTime() {
  return web3.eth.getBlock('latest').timestamp;
}

const EVMRevert = 'revert';

// Advances the block number so that the last mined block is `number`
function advanceBlock() {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: Date.now(),
    }, (err, res) => {
      return err ? reject(err) : resolve(res);
    });
  });
}

// Increase time

function increaseTime(duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err1 => {
      if (err1) return reject(err1);

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
}

function increaseTimeTo(target) {
  let now = latestTime();
  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  let diff = target - now;
  return increaseTime(diff);
}

const duration = {
  seconds: function(val) {
    return val;
  },
  minutes: function(val) {
    return val * this.seconds(60);
  },
  hours: function(val) {
    return val * this.minutes(60);
  },
  days: function(val) {
    return val * this.hours(24);
  },
  weeks: function(val) {
    return val * this.days(7);
  },
  years: function(val) {
    return val * this.days(365);
  },
};

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();


const _ = require('lodash')
const {
  ecsign
} = require('ethereumjs-util')
const abi = require('ethereumjs-abi')
const BN = require('bn.js')

//var kycSigners = ['0xdd5ecefcaa0cb5d75f7b72dc9d2ce446d6d00520'.toLowerCase(),'0x4e315e5de2abbf7b745d9628ee60e4355c0fab86'.toLowerCase()] ;



const SIGNER_PK = Buffer.from('c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3', 'hex')
const SIGNER_ADDR = '0x627306090abaB3A6e1400e9345bC60c78a8BEf57'.toLowerCase()
const OTHER_PK = Buffer.from('0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1', 'hex')
const OTHER_ADDR = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'.toLowerCase()
const MAX_AMOUNT = '150000000000000000000' // 50 ether

const BITLUMENSACCOUNT = '0xa9e295a6fc80d93be8fb54d946212228b0377ea8'.toLowerCase();
const TEAMACCOUNT = '0xe3868fd3e3af480a8af08ca3d5c06cdd136c2e14'.toLowerCase();
const BOUNTYACCOUNT = '0x27875879e1ec293ea578bf695856c735642288ad'.toLowerCase();

const getKycData = (userAddr, userid, icoAddr, pk) => {
  const hash = abi.soliditySHA256(
    ['string', 'address', 'address', 'uint64', 'uint'], ['Eidoo icoengine authorization', icoAddr, userAddr, new BN(userid), new BN(MAX_AMOUNT)]
  )
  const sig = ecsign(hash, pk)
  return {
    id: userid,
    max: MAX_AMOUNT,
    v: sig.v,
    r: '0x' + sig.r.toString('hex'),
    s: '0x' + sig.s.toString('hex')
  }
}

const expectEvent = (res, eventName) => {
  const ev = _.find(res.logs, {
    event: eventName
  })
  expect(ev).to.not.be.undefined
  return ev
}

const BitLumensCrowdsale = artifacts.require('BitLumensCrowdsale');
const BLS = artifacts.require('BLS');
//const TokenTimelock = artifacts.require('TokenTimelock');


contract('BitLumensCrowdsale', function([_, investor, wallet, purchaser]) {

  // divide caps by 100 for the sake of testing
  var ETHUSDEXCHANGE = 1000 * 100;
  var BLS_PRE_ICO =   100000 * 1000000000000000000;
  var BLS_TOTAL_CAP = 250000 * 1000000000000000000;
  var USD_SOFT_CAP = 10 * 1000;
  var USD_HARD_CAP = 250 * 1000;
  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  // Create the BitLumensCrowdsale object
  beforeEach(async function() {
    this.startTime = latestTime() + duration.minutes(10);
    this.roundTwoTime = this.startTime + duration.minutes(10);
    this.roundThreeTime = this.roundTwoTime + duration.minutes(10);
    this.roundFourTime = this.roundThreeTime + duration.minutes(10);
    this.roundFiveTime = this.roundFourTime + duration.minutes(10);
    this.endTime = this.roundFiveTime + duration.minutes(10);
    this.afterEndTime = this.endTime + duration.seconds(10);
    this.token = await BLS.new();

    this.crowdsale = await BitLumensCrowdsale.new(
      [SIGNER_ADDR],
      this.token.address,
      wallet,
      this.startTime,
      this.roundTwoTime,
      this.roundThreeTime,
      this.roundFourTime,
      this.roundFiveTime,
      this.endTime,
      BLS_PRE_ICO,
      BLS_TOTAL_CAP,
      USD_SOFT_CAP,
      USD_HARD_CAP,
      ETHUSDEXCHANGE,
      {
        from: wallet,
        value: 300000000000000000
      }
      );

    await this.token.transferOwnership(this.crowdsale.address);

  });

  describe('Initial tests:', function() {
    it('should create crowdsale with correct parameters', async function() {
      this.crowdsale.should.exist;
      this.token.should.exist;

       const startTime = await this.crowdsale.startTime();
       const endTime = await this.crowdsale.endTime();
       const roundTwoTime = await this.crowdsale.roundTwoTime();
       const roundThreeTime = await this.crowdsale.roundThreeTime();
       const roundFourTime = await this.crowdsale.roundFourTime();
       const roundFiveTime = await this.crowdsale.roundFiveTime();

       const blsPreIco = await this.crowdsale.BLS_PRE_ICO();
       const blsTotalCap = await this.crowdsale.BLS_TOTAL_CAP();
       const usdSofCap = await this.crowdsale.USD_SOFT_CAP();
       const usdHardCap = await this.crowdsale.USD_HARD_CAP();
       const exchangeRate = await this.crowdsale.ETH_USD_EXCHANGE_CENTS();
       const walletAddress = await this.crowdsale.wallet();

       startTime.should.be.bignumber.equal(this.startTime);
       endTime.should.be.bignumber.equal(this.endTime);
       roundTwoTime.should.be.bignumber.equal(this.roundTwoTime);
       roundThreeTime.should.be.bignumber.equal(this.roundThreeTime);
       roundFourTime.should.be.bignumber.equal(this.roundFourTime);
       roundFiveTime.should.be.bignumber.equal(this.roundFiveTime);

       blsPreIco.should.be.bignumber.equal(BLS_PRE_ICO);
       blsTotalCap.should.be.bignumber.equal(BLS_TOTAL_CAP);
       usdSofCap.should.be.bignumber.equal(USD_SOFT_CAP);
       usdHardCap.should.be.bignumber.equal(USD_HARD_CAP);

       exchangeRate.should.be.bignumber.equal(ETHUSDEXCHANGE);
       walletAddress.should.be.equal(wallet);

    });

    it('should be token owner', async function() {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });

    it('should fail the default callback', async function() {
      await this.crowdsale.sendTransaction({
        value: 100,
        from: investor
      }).should.be.rejectedWith(EVMRevert);
    });

    it('should be ended only after end', async function() {
      let ended = await this.crowdsale.ended();
      ended.should.equal(false);
      await increaseTimeTo(this.afterEndTime);
      ended = await this.crowdsale.ended();
      ended.should.equal(true);
    });

    it('shoud have total tokens correct', async function() {
      let totalTokens = await this.crowdsale.totalTokens();
      totalTokens.should.be.bignumber.equal(BLS_TOTAL_CAP);
    });
  });


  describe('Prices', function() {
    it('shoud mach price rates', async function() {
      await increaseTimeTo(this.startTime);
      var price = await this.crowdsale.price();
      price.should.be.bignumber.equal(20);


      await increaseTimeTo(this.roundTwoTime);
      var price = await this.crowdsale.price();
      price.should.be.bignumber.equal(15);


      await increaseTimeTo(this.roundThreeTime);
      var price = await this.crowdsale.price();
      price.should.be.bignumber.equal(14);

      await increaseTimeTo(this.roundFourTime);
      var price = await this.crowdsale.price();
      price.should.be.bignumber.equal(13);

      await increaseTimeTo(this.roundFiveTime);
      var price = await this.crowdsale.price();
      price.should.be.bignumber.equal(12);

      await increaseTimeTo(this.endTime);
      var price = await this.crowdsale.price();
      price.should.be.bignumber.equal(12);

    })
  });

  describe('Payments tests', function() {
    it('should reject payments before start', async function() {
      const d = getKycData(investor, 1, this.crowdsale.address, SIGNER_PK);
      await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
        from: investor,
        value: 1000
      }).should.be.rejectedWith(EVMRevert);
    });

    it('should accept valid payments after start', async function() {
      const d = getKycData(investor, 1, this.crowdsale.address, SIGNER_PK);
      await increaseTimeTo(this.startTime);
      const started = await this.crowdsale.started();
      started.should.be.all.equal(true);
      await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
        from: investor,
        value: 1000
      }).should.be.fulfilled;
      const d2 = getKycData(investor, 1, this.crowdsale.address, OTHER_PK);
      await this.crowdsale.buyTokens(d2.id, d2.max, d2.v, d2.r, d2.s, {
        from: investor,
        value: 1000
      }).should.be.rejectedWith(EVMRevert);
    });

    it('should reject payments after end', async function() {
      const d = getKycData(investor, 1, this.crowdsale.address, SIGNER_PK);
      await increaseTimeTo(this.endTime);
      const ended = await this.crowdsale.ended();
      ended.should.be.all.equal(true);
      await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
        from: investor,
        value: 1000
      }).should.be.rejectedWith(EVMRevert);
    });
  });

describe('ICO', function() {
  it('TEST ICO', async function() {

    const d = getKycData(investor, 1, this.crowdsale.address, SIGNER_PK);

    var started = await this.crowdsale.started();
    started.should.be.false;
    var ended = await this.crowdsale.ended();
    ended.should.be.false;

    // increase time to start
    await increaseTimeTo(this.startTime);

    started = await this.crowdsale.started();
    started.should.be.true;
    ended = await this.crowdsale.ended();
    ended.should.be.false;


    //checking presale
    var WEI = web3.toWei(1, 'ether');
    await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
      from: investor,
      value: WEI
    });

     var userBalance = await this.token.balanceOf(investor);
     userBalance.should.be.bignumber.equal(web3.toWei(2000, 'ether'));

     //checking presale
     var WEI = web3.toWei(50, 'ether');
     await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
       from: investor,
       value: WEI
     }).should.be.rejectedWith(EVMRevert);

     var userBalance = await this.token.balanceOf(investor);
     userBalance.should.be.bignumber.equal(web3.toWei(2000, 'ether'));
  });
  //it('test presale', async function() {});
});

describe('ICO sale', function() {
  it('Test rounds token buy', async function() {

    const d = getKycData(investor, 1, this.crowdsale.address, SIGNER_PK);
    var weiAmmount = 0;
    //first price
    var price = await this.crowdsale.price();
    price.should.be.bignumber.equal(20);

    var started = await this.crowdsale.started();
    started.should.be.false;
    var ended = await this.crowdsale.ended();
    ended.should.be.false;

    // increase time to start
    await increaseTimeTo(this.startTime);

    started = await this.crowdsale.started();
    started.should.be.true;
    ended = await this.crowdsale.ended();
    ended.should.be.false;

    price = await this.crowdsale.price();
    price.should.be.bignumber.equal(20);
    const WEI = web3.toWei(1, 'ether');
    await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
      from: investor,
      value: WEI
    });

    var balanceUser = await this.token.balanceOf(investor);
    balanceUser.should.be.bignumber.equal(web3.toWei(2000,'ether'));

//get second round ----------------------
    await increaseTimeTo(this.roundTwoTime);
    // price should be updated to phase 2
    price = await this.crowdsale.price();
    price.should.be.bignumber.equal(15);

    ended = await this.crowdsale.ended();
    ended.should.be.false;

    const WEI_2 = web3.toWei(1, 'ether');
    await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
      from: investor,
      value: WEI_2
    });
    var balanceUser = await this.token.balanceOf(investor);
    balanceUser.should.be.bignumber.equal(web3.toWei(3500,'ether'));
//get thrid round ----------------------
    await increaseTimeTo(this.roundThreeTime);

    price = await this.crowdsale.price();
    price.should.be.bignumber.equal(14);

    ended = await this.crowdsale.ended();
    ended.should.be.false;

    const WEI_3 = web3.toWei(1, 'ether');
    await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
      from: investor,
      value: WEI_3
    });
    var balanceUser = await this.token.balanceOf(investor);
    balanceUser.should.be.bignumber.equal(web3.toWei(4900,'ether'));

//get fourth round ----------------------
    await increaseTimeTo(this.roundFourTime);

    price = await this.crowdsale.price();
    price.should.be.bignumber.equal(13);

    ended = await this.crowdsale.ended();
    ended.should.be.false;

    const WEI_4 = web3.toWei(1, 'ether');
    await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
      from: investor,
      value: WEI_4
    });
    var balanceUser = await this.token.balanceOf(investor);
    balanceUser.should.be.bignumber.equal(web3.toWei(6200,'ether'));

//get fourth round ----------------------
    await increaseTimeTo(this.roundFiveTime);

    price = await this.crowdsale.price();
    price.should.be.bignumber.equal(12);

    ended = await this.crowdsale.ended();
    ended.should.be.false;

    const WEI_5 = web3.toWei(1, 'ether');
    await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
      from: investor,
      value: WEI_5
    });
    var balanceUser = await this.token.balanceOf(investor);
    balanceUser.should.be.bignumber.equal(web3.toWei(7400,'ether'));


    await increaseTimeTo(this.endTime);
    ended = await this.crowdsale.ended();
    ended.should.be.true;

  });

  it('Test soft cap failure', async function() {

    const d = getKycData(investor, 1, this.crowdsale.address, SIGNER_PK);

    var price = await this.crowdsale.price();
    price.should.be.bignumber.equal(20);

    var started = await this.crowdsale.started();
    started.should.be.false;
    var ended = await this.crowdsale.ended();
    ended.should.be.false;

    // increase time to start
    await increaseTimeTo(this.startTime);

    started = await this.crowdsale.started();
    started.should.be.true;
    ended = await this.crowdsale.ended();
    ended.should.be.false;

    // buy not enough token
    const WEI =  web3.toWei(1, 'ether');;
    await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
      from: investor,
      value: WEI
    });

    // increase time to start
    await increaseTimeTo(this.endTime);
    ended = await this.crowdsale.ended();
    ended.should.be.true;

    // state should be running (=0)
    var state = await this.crowdsale.state();
    state.should.be.bignumber.equal(0);

    // get refund should be rejected before finalize is called
    await this.crowdsale.claimRefund({
      from: investor
    }).should.be.rejectedWith(EVMRevert);

// call finalize
    await this.crowdsale.finalize(BITLUMENSACCOUNT,TEAMACCOUNT,BOUNTYACCOUNT,{from:wallet});

    // state should be failure (=2)
    state = await this.crowdsale.state();
    state.should.be.bignumber.equal(2);

    // get refund
    const GAS_PRICE = 10000000000;
    //const INVESTOR_BALANCE_PRIOR = web3.eth.getBalance(investor);
    //console.log(INVESTOR_BALANCE_PRIOR.toString());

    const receipt = await this.crowdsale.claimRefund({
      from: investor,
      gasPrice: GAS_PRICE
    }).should.be.fulfilled;


//  console.log(account);
//await this.crowdsale.finalize(BITLUMENSACCOUNT,TEAMACCOUNT,BOUNDYACCOUNT);

  });

  it('Test soft cap success', async function() {

    const d = getKycData(investor, 1, this.crowdsale.address, SIGNER_PK);
    // price should be the price with RATE_1
    var price = await this.crowdsale.price();
    price.should.be.bignumber.equal(20);


    var started = await this.crowdsale.started();
    started.should.be.false;
    var ended = await this.crowdsale.ended();
    ended.should.be.false;

    // increase time to start
    await increaseTimeTo(this.startTime);

    started = await this.crowdsale.started();
    started.should.be.true;
    ended = await this.crowdsale.ended();
    ended.should.be.false;

    // buy just enough token
    const WEI = web3.toWei(10, 'ether');;
    await this.crowdsale.buyTokens(d.id, d.max, d.v, d.r, d.s, {
      from: investor,
      value: WEI
    });

    // increase time to end
    await increaseTimeTo(this.endTime);
    ended = await this.crowdsale.ended();
    ended.should.be.true;

    // state should be running (=0)
    var state = await this.crowdsale.state();
    state.should.be.bignumber.equal(0);

    // get refund should be rejected
    await this.crowdsale.claimRefund({
      from: investor
    }).should.be.rejectedWith(EVMRevert);

    // call finalize
    await this.crowdsale.finalize(BITLUMENSACCOUNT,TEAMACCOUNT,BOUNTYACCOUNT,{from:wallet});

    var bitlumensTokens = await this.token.balanceOf(BITLUMENSACCOUNT);
    //console.log(web3.fromWei(bitlumensTokens,'ether'));
    bitlumensTokens.should.be.bignumber.equal(web3.toWei(10000, 'ether'));

    var teamTokens = await this.token.balanceOf(TEAMACCOUNT);
    //console.log(web3.fromWei(teamTokens,'ether'));
    teamTokens.should.be.bignumber.equal(web3.toWei(9600, 'ether'));


    var bountyTokens = await this.token.balanceOf(BOUNTYACCOUNT);
    //consle.log(web3.fromWei(bountyTokens,'ether'));
    bountyTokens.should.be.bignumber.equal(web3.toWei(400, 'ether'));

    // state should be success (=1)
    state = await this.crowdsale.state();
    state.should.be.bignumber.equal(1);

    // get refund should be rejected
    const receipt = await this.crowdsale.claimRefund({
      from: investor
    }).should.be.rejectedWith(EVMRevert);

    // const WALLET_BALANCE_POST = web3.eth.getBalance(wallet);
    // console.log(web3.fromWei(WALLET_BALANCE_POST - walletPreBalance,'ether'));
  });


});

});
