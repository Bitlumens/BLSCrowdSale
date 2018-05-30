pragma solidity 0.4.21;

import './SafeMath.sol';
import './Ownable.sol';
import './RefundVault.sol';
import "./ICOEngineInterface.sol";
import "./KYCBase.sol";
import "./BLS.sol";
import "./usingOraclize.sol";


contract BitLumensCrowdsale is Ownable, ICOEngineInterface, KYCBase,usingOraclize {
    using  SafeMath for uint;
    enum State {Running,Success,Failure}

    // Current ETH/USD exchange rate
    uint256 public ETH_USD_EXCHANGE_CENTS= 500;// must be set by orcalize

    // Everything oraclize related
    event updatedPrice(string price);
    event newOraclizeQuery(string description);
    uint public oraclizeQueryCost;

    uint public etherPriceUSD;
    event Log(string text);


    uint public USD_SOFT_CAP;
    uint public USD_HARD_CAP;

    uint public BLS_TOTAL_CAP;
    uint public BLS_PRE_ICO;

    State public state;

    BLS public token;

    address public wallet;
    address public bitlumensAccount= 0x40d41c859016ec561891526334881326f429b513;
    address public teamAccount= 0xdf71b93617e5197cee3b9ad7ad05934467f95f44;
    address public bountyAccount= 0x1b7b2c0a8d0032de88910f7ff5838f5f35bc9537;

    // from ICOEngineInterface
    uint public startTime;
    uint public endTime;
    // Time Rounds for ICO
    uint public roundTwoTime;
    uint public roundThreeTime;
    uint public roundFourTime;
    uint public roundFiveTime;

    // Discount multipliers , we will divide by 10 later -- divede by 10 later
    uint public constant TOKEN_FIRST_PRICE_RATE  = 20;
    uint public constant TOKEN_SECOND_PRICE_RATE = 15;
    uint public constant TOKEN_THIRD_PRICE_RATE  = 14;
    uint public constant TOKEN_FOURTH_PRICE_RATE  = 13;
    uint public constant TOKEN_FIFTH_PRICE_RATE = 12;


    // to track if team members already got their tokens
    bool public teamTokensDelivered = false;
    bool public bountyDelivered = false;
    bool public bitlumensDelivered = false;

    // from ICOEngineInterface
    uint public remainingTokens;
    // from ICOEngineInterface
    uint public totalTokens;

    // amount of wei raised
    uint public weiRaised;

    //amount of $$ raised
    uint public dollarRaised;

    // boolean to make sure preallocate is called only once
    bool public isPreallocated;

    // vault for refunding
    RefundVault public vault;

    /**
     * event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the token
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    /* event for ICO successfully finalized */
    event FinalizedOK();

    /* event for ICO not successfully finalized */
    event FinalizedNOK();

    /**
     * event for additional token minting
     * @param to who got the tokens
     * @param amount amount of tokens purchased
     */
    event Preallocated(address indexed to, uint256 amount);

    /**
     *  Constructor
     */
    function BitLumensCrowdsale(
      address [] kycSigner,
      address _token,
      address _wallet,
      uint _startTime,
      uint _roundTwoTime,
      uint _roundThreeTime,
      uint _roundFourTime,
      uint _roundFiveTime,
      uint _endTime,
      uint _BlsPreIco,
      uint _blsTotalCap,
      uint _softCapUsd,
      uint _hardCapUsd,
      uint _ethUsdExchangeCents
      )
        public payable
        KYCBase(kycSigner)
    {
        require(_token != address(0));
        require(_wallet != address(0));

        require(bitlumensAccount != address(0));
        require(teamAccount != address(0));
        require(bountyAccount != address(0));
        //please make sure that the start in 3)depoly_tokenSale is larger than now before migrate
        require(_startTime > now);
        require (_startTime < _roundTwoTime);
        require (_roundTwoTime < _roundThreeTime);
        require (_roundThreeTime < _roundFourTime);
        require (_roundFourTime < _roundFiveTime);
        require (_roundFiveTime < _endTime);

        token = BLS(_token);
        wallet = _wallet;

        startTime = _startTime;
        endTime = _endTime;
        roundTwoTime= _roundTwoTime;
        roundThreeTime= _roundThreeTime;
        roundFourTime= _roundFourTime;
        roundFiveTime= _roundFiveTime;

        ETH_USD_EXCHANGE_CENTS = _ethUsdExchangeCents;

        USD_SOFT_CAP = _softCapUsd;
        USD_HARD_CAP = _hardCapUsd;

        BLS_PRE_ICO = _BlsPreIco;
        BLS_TOTAL_CAP = _blsTotalCap;
        totalTokens = _blsTotalCap;
        remainingTokens = _blsTotalCap;

        vault = new RefundVault(_wallet);

        state = State.Running;

       oraclize_setCustomGasPrice(100000000000 wei); // set the gas price a little bit higher, so the pricefeed definitely works
       updatePrice();
       oraclizeQueryCost = oraclize_getPrice("URL");

    }

    /// oraclize START
        // @dev oraclize is called recursively here - once a callback fetches the newest ETH price, the next callback is scheduled for the next hour again
        function __callback(bytes32 myid, string result) {
            require(msg.sender == oraclize_cbAddress());
            // setting the token price here
            ETH_USD_EXCHANGE_CENTS = SafeMath.parse(result);
            updatedPrice(result);
            // fetch the next price
            updatePrice();
        }

        function updatePrice() payable {    // can be left public as a way for replenishing contract's ETH balance, just in case
            if (msg.sender != oraclize_cbAddress()) {
                require(msg.value >= 200 finney);
            }
            if (oraclize_getPrice("URL") > this.balance) {
                newOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
            } else {
                newOraclizeQuery("Oraclize sent, wait..");
                // Schedule query in 1 hour. Set the gas amount to 220000, as parsing in __callback takes around 70000 - we play it safe.
                //the time will be changed to higher value in real network(60 - > 3600 )
                oraclize_query(86400, "URL", "json(https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD).USD", 220000);
            }
        }
        //// oraclize END

    // function that is called from KYCBase
    function releaseTokensTo(address buyer) internal returns(bool) {
        // needs to be started
        require(started());
        require(!ended());

        //get the amount send in wei
        uint256 weiAmount = msg.value;


        uint256 WeiDollars = weiAmount.mul(ETH_USD_EXCHANGE_CENTS);
        // ammount of dollars X 1e18 (1token)
        WeiDollars = WeiDollars.div(100);

        //calculating number of tokens x 10 to prevent decemil
        uint256 currentPrice = price();
        uint tokens = WeiDollars.mul(currentPrice);

        //fix the number of tokens
        tokens = tokens.div(10);

        //calculate tokens Raised by subtracting total tokens from remaining tokens
        uint tokenRaised = totalTokens.sub(remainingTokens) ;

        // check if total token raised + the tokens calculated for investor <= (pre ico token limit)
        if(now < roundTwoTime ){
          require(tokenRaised.add(tokens) <= BLS_PRE_ICO);
        }

        //check if total token raised + the tokens calculated for investor <= (total token cap)
        require(tokenRaised.add(tokens) <= BLS_TOTAL_CAP);

        //check if hard cap is reached
        weiRaised = weiRaised.add(weiAmount);
        // total usd in wallet
        uint centsWeiRaised = weiRaised.mul(ETH_USD_EXCHANGE_CENTS);
        uint goal  = USD_HARD_CAP * (10**18) * (10**2);

        // if 25,000,000 $$ raised stop the ico
        require(centsWeiRaised <= goal);

        //decrease the number of remaining tokens
        remainingTokens = remainingTokens.sub(tokens);

        // mint tokens and transfer funds to investor
        token.mint(buyer, tokens);
        forwardFunds();
        TokenPurchase(msg.sender, buyer, weiAmount, tokens);
        return true;
    }

    function forwardFunds() internal {
      vault.deposit.value(msg.value)(msg.sender);
    }


    function finalize() onlyOwner public {
      require(state == State.Running);
      require(ended());

      uint centsWeiRaised = weiRaised.mul(ETH_USD_EXCHANGE_CENTS);
      uint minGoal  = USD_SOFT_CAP * (10**18) * (10**2);

      // Check the soft goal reaching
      if(centsWeiRaised >= minGoal) {

        //token Raised
        uint tokenRaised = totalTokens - remainingTokens;
        //bitlumes tokes 25% equivelent to (tokenraied / 2) (token raised = 50 %)
        uint bitlumensTokens = tokenRaised.div(2);
        uint bountyTokens = 4 * bitlumensTokens.div(100);
        uint TeamTokens = bitlumensTokens.sub(bountyTokens);


        token.mint(bitlumensAccount, bitlumensTokens);
        token.mint(teamAccount, TeamTokens);
        token.mint(bountyAccount, bountyTokens);

        teamTokensDelivered = true;
        bountyDelivered = true;
        bitlumensDelivered = true;

        // if goal reached
        // stop the minting
        token.finishMinting();
        // enable token transfers
        token.enableTokenTransfers();
        // close the vault and transfer funds to wallet
        vault.close();
        // ICO successfully finalized
        // set state to Success
        state = State.Success;
        FinalizedOK();
      }
      else {
        // if goal NOT reached
        // ICO not successfully finalized
        finalizeNOK();
      }
    }



     function finalizeNOK() onlyOwner public {
       // run checks again because this is a public function
       require(state == State.Running);
       require(ended());
       // enable the refunds
       vault.enableRefunds();
       // ICO not successfully finalised
       // set state to Failure
       state = State.Failure;
       FinalizedNOK();
     }

     // if crowdsale is unsuccessful, investors can claim refunds here
     function claimRefund() public {
       require(state == State.Failure);
       vault.refund(msg.sender);
    }


    // from ICOEngineInterface
    function started() public view returns(bool) {
        return now >= startTime;
    }

    // from ICOEngineInterface
    function ended() public view returns(bool) {
        return now >= endTime || remainingTokens == 0;
    }

    function startTime() public view returns(uint) {
      return(startTime);
    }

    function endTime() public view returns(uint){
      return(endTime);
    }

    function totalTokens() public view returns(uint){
      return(totalTokens);
    }

    function remainingTokens() public view returns(uint){
      return(remainingTokens);
    }

    // return the price as number of tokens released for each ether
    function price() public view returns(uint){
      // determine which discount to apply
      if (now < roundTwoTime) {
          return(TOKEN_FIRST_PRICE_RATE);
      } else if (now < roundThreeTime){
          return (TOKEN_SECOND_PRICE_RATE);
      } else if (now < roundFourTime) {
          return (TOKEN_THIRD_PRICE_RATE);
      }else if (now < roundFiveTime) {
          return (TOKEN_FOURTH_PRICE_RATE);
      } else {
          return (TOKEN_FIFTH_PRICE_RATE);
      }
    }

    // No payable fallback function, the tokens must be buyed using the functions buyTokens and buyTokensFor
    function () public {
        revert();
    }

}
