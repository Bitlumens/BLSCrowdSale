var BLS = artifacts.require('./BLS.sol');
var BitLumensCrowdsale = artifacts.require('./BitLumensCrowdsale.sol');

module.exports = function(deployer, network, accounts) {
  deployer.then(() => {
    BLS.deployed().then(function(bls) {
      return bls.transferOwnership(BitLumensCrowdsale.address).then(function() {
        return BitLumensCrowdsale.deployed();
      });
    })
  })
};
