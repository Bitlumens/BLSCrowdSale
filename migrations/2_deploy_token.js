var BLS = artifacts.require('./BLS.sol');
module.exports = function (deployer, network, accounts) {
  deployer.deploy(BLS);
};
