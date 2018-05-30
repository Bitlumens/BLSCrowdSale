pragma solidity 0.4.21;

import './MintableToken.sol';
import './SafeMath.sol';

contract BLS is MintableToken {
  using SafeMath for uint256;

  string public name = "BLS Token";
  string public symbol = "BLS";
  uint8 public decimals = 18;

  bool public enableTransfers = false;

  // functions overrides in order to maintain the token locked during the ICO
  function transfer(address _to, uint256 _value) public returns(bool) {
    require(enableTransfers);
    return super.transfer(_to,_value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns(bool) {
      require(enableTransfers);
      return super.transferFrom(_from,_to,_value);
  }

  function approve(address _spender, uint256 _value) public returns (bool) {
    require(enableTransfers);
    return super.approve(_spender,_value);
  }


  function increaseApproval(address _spender, uint _addedValue) public returns (bool) {
    require(enableTransfers);
    super.increaseApproval(_spender, _addedValue);
  }

  function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) {
    require(enableTransfers);
    super.decreaseApproval(_spender, _subtractedValue);
  }

  // enable token transfers
  function enableTokenTransfers() public onlyOwner {
    enableTransfers = true;
  }
}
