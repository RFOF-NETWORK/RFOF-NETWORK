// SPDX-License-Identifier: SEE LICENSE IN ../../LICENSE
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title TokenDistribution
 * @dev Manages the allocation and distribution of ABILITY and NANO Tokens
 * within the RFOF-NETWORK. This includes rewards for validators,
 * participants, and the ecosystem fund, based on network activity and
 * PZQQET Axiomatikx derived value.
 */
contract TokenDistribution is Ownable {
    using SafeMath for uint256;

    IERC20 public abilityToken; // The main utility and governance token
    IERC20 public nanoToken;    // The micro-transaction/data-value token

    // Define reward rates per type of contribution (e.g., per BOx processed, per valid vote)
    uint256 public constant BOx_PROCESSING_REWARD = 100; // Example: 100 NANO per BOx
    uint256 public constant VALIDATOR_REWARD_PERCENTAGE = 5; // Example: 5% of a pool/block reward

    // Address of the ecosystem fund wallet
    address public ecosystemFundAddress;

    // Event emitted when tokens are distributed as rewards
    event TokensDistributed(address indexed recipient, uint256 abilityAmount, uint256 nanoAmount, string rewardType);
    // Event emitted when ecosystem fund address is updated
    event EcosystemFundAddressUpdated(address indexed newAddress);

    constructor(
        address _abilityTokenAddress,
        address _nanoTokenAddress,
        address _ecosystemFundAddress
    ) Ownable(msg.sender) {
        require(_abilityTokenAddress != address(0), "ABILITY Token address cannot be zero");
        require(_nanoTokenAddress != address(0), "NANO Token address cannot be zero");
        require(_ecosystemFundAddress != address(0), "Ecosystem Fund address cannot be zero");

        abilityToken = IERC20(_abilityTokenAddress);
        nanoToken = IERC20(_nanoTokenAddress);
        ecosystemFundAddress = _ecosystemFundAddress;
    }

    /**
     * @dev Distributes tokens for processing a BOx or other network activity.
     * This function is expected to be called by authorized network components
     * (e.g., RFOFNetworkCore upon successful BOx processing).
     * @param _recipient The address to which the reward should be sent.
     * @param _typeOfActivity A string describing the activity (e.g., "BOx Processing", "Consensus Vote").
     */
    function distributeBOxProcessingReward(address _recipient, string memory _typeOfActivity) public onlyOwner {
        require(_recipient != address(0), "Recipient address cannot be zero");

        uint256 rewardAmount = BOx_PROCESSING_REWARD; // Example: Based on constant, or dynamic calculation
        require(nanoToken.transfer(_recipient, rewardAmount), "NANO token transfer failed");

        emit TokensDistributed(_recipient, 0, rewardAmount, _typeOfActivity);
    }

    /**
     * @dev Distributes validator rewards based on their participation and stake.
     * This would typically be called periodically or after a consensus round.
     * @param _validator The address of the validator.
     * @param _earnedAbility The amount of ABILITY tokens earned by the validator.
     * @param _earnedNano The amount of NANO tokens earned by the validator.
     */
    function distributeValidatorReward(address _validator, uint256 _earnedAbility, uint256 _earnedNano) public onlyOwner {
        require(_validator != address(0), "Validator address cannot be zero");
        if (_earnedAbility > 0) {
            require(abilityToken.transfer(_validator, _earnedAbility), "ABILITY token transfer failed");
        }
        if (_earnedNano > 0) {
            require(nanoToken.transfer(_validator, _earnedNano), "NANO token transfer failed");
        }
        emit TokensDistributed(_validator, _earnedAbility, _earnedNano, "Validator Reward");
    }

    /**
     * @dev Sends a portion of network fees or generated revenue to the ecosystem fund.
     * This function could be called periodically or upon specific network events.
     * @param _amountAbility The amount of ABILITY tokens to send.
     * @param _amountNano The amount of NANO tokens to send.
     */
    function contributeToEcosystemFund(uint256 _amountAbility, uint256 _amountNano) public onlyOwner {
        if (_amountAbility > 0) {
            require(abilityToken.transfer(ecosystemFundAddress, _amountAbility), "ABILITY to ecosystem fund failed");
        }
        if (_amountNano > 0) {
            require(nanoToken.transfer(ecosystemFundAddress, _amountNano), "NANO to ecosystem fund failed");
        }
        emit TokensDistributed(ecosystemFundAddress, _amountAbility, _amountNano, "Ecosystem Fund Contribution");
    }

    /**
     * @dev Allows the owner to update the ecosystem fund address.
     * @param _newAddress The new address for the ecosystem fund.
     */
    function updateEcosystemFundAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "New ecosystem fund address cannot be zero");
        ecosystemFundAddress = _newAddress;
        emit EcosystemFundAddressUpdated(_newAddress);
    }

    // Functions to retrieve current token balances within the contract (for auditing)
    function getAbilityBalance() public view returns (uint256) {
        return abilityToken.balanceOf(address(this));
    }

    function getNanoBalance() public view returns (uint256) {
        return nanoToken.balanceOf(address(this));
    }

    // Future enhancements for complex tokenomics based on PZQQET Axiomatikx:
    // - Dynamic reward calculation based on data value, network load, PRAI insights.
    // - Slashing mechanism for misbehaving validators, with funds directed here.
    // - Token burn mechanisms for inflation control.
    // - Integration with external oracle for real-world data valuation impacting token rewards.
}
