module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
  'development': {
      host: "localhost",
      port: 7545,
      gas: 4600000,
      gasPrice: 65000000000,
      network_id: "*" // Match any network id
      //gasPrice: 65000000000,
    },
  }
}
