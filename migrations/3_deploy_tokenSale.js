var SafeMath = artifacts.require('./SafeMath.sol');
var BLS = artifacts.require('./BLS.sol');
var BitLumensCrowdsale = artifacts.require('./BitLumensCrowdsale.sol');
const moment = require('moment');

module.exports = function(deployer, network, accounts) {
  if (network == 'development') {
    // Wallet
    var wallet = accounts[0];
    var dat = moment.utc('2018-05-25 22:45').toDate().getTime() / 1000;
    //var initialDelay = web3.eth.getBlock(web3.eth.blockNumber).timestamp; //+ (60 * 1);
    var startTime = dat;
    var roundTwoTime=startTime + (34560 * 1);
    var roundThreeTime=roundTwoTime + (34560 * 1);
    var roundFourTime=roundThreeTime + (34560 * 1);
    var roundFiveTime=roundFourTime + (34560 * 1);
    var endTime = roundFiveTime + (34560 * 1); // ICO end


    //kyc signers
    // divide caps by 100 for the sake of testing
    var ETHUSDEXCHANGE = 1000 * 100;
    var BLS_PRE_ICO =   10000 * 1000000000000000000;
    var BLS_TOTAL_CAP = 25000 * 1000000000000000000;
    var USD_SOFT_CAP = 1 * 1000;
    var USD_HARD_CAP = 25 * 1000;
    var kycSigners = ['0xdd5ecefcaa0cb5d75f7b72dc9d2ce446d6d00520'.toLowerCase(),'0x4e315e5de2abbf7b745d9628ee60e4355c0fab86'.toLowerCase()] ;
  }

  else if (network == 'ropsten') {
    // Wallet
    var wallet =  accounts[0];


    // time in cet = utc - 3600
    var startTime = (moment.utc('2018-05-29 00:00').toDate().getTime() / 1000) - 3600;
    var roundTwoTime=(moment.utc('2018-06-19 00:00').toDate().getTime() / 1000) - 3600;
    var roundThreeTime=(moment.utc('2018-06-20 00:00').toDate().getTime() / 1000) - 3600;
    var roundFourTime=(moment.utc('2018-06-26 00:00').toDate().getTime() / 1000) - 3600;
    var roundFiveTime=(moment.utc('2018-07-03 00:00').toDate().getTime() / 1000) - 3600;
    var endTime = (moment.utc('2018-07-16 23:59').toDate().getTime() / 1000) - 3600;

    var ETHUSDEXCHANGE = 500 * 100; // in cents (will divide by 100 in sc)
    var BLS_PRE_ICO =   10000000 * 1000000000000000000;
    var BLS_TOTAL_CAP = 25000000 * 1000000000000000000;
    var USD_SOFT_CAP = 1 * 1000000;
    var USD_HARD_CAP = 25 * 1000000;

    var kycSigners = ['0xdd5ecefcaa0cb5d75f7b72dc9d2ce446d6d00520'.toLowerCase(),'0x4e315e5de2abbf7b745d9628ee60e4355c0fab86'.toLowerCase()] ;
  }

  deployer.deploy(SafeMath);
  deployer.link(SafeMath, BitLumensCrowdsale);
  deployer.deploy(BitLumensCrowdsale,
    kycSigners,
    BLS.address,
    wallet,
    startTime,
    roundTwoTime,
    roundThreeTime,
    roundFourTime,
    roundFiveTime,
    endTime,
    BLS_PRE_ICO,
    BLS_TOTAL_CAP,
    USD_SOFT_CAP,
    USD_HARD_CAP,
    ETHUSDEXCHANGE,
    {from:wallet, value:200000000000000000}
  );
};
