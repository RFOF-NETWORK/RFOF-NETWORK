// SPDX-License-Identifier: SEE LICENSE IN ../../LICENSE
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // For potential staking mechanism
import "@openzeppelin/contracts/utils/math/SafeMath.sol"; // For safe arithmetic operations

/**
 * @title ConsensusModule
 * @dev Manages the consensus mechanism for the RFOF-NETWORK,
 * ensuring agreement on the state and validity of data/BOx entries.
 * This module is crucial for maintaining the integrity and security of the decentralized network.
 */
contract ConsensusModule is Ownable {
    using SafeMath for uint256;

    // Define minimum required stake for a validator (example, adjust as per RFOF tokenomics)
    uint256 public minValidatorStake;
    // Define the percentage of total stake required for consensus (e.g., 66% for 2/3 majority)
    uint256 public consensusThresholdNumerator;
    uint256 public consensusThresholdDenominator;

    // Mapping of validator addresses to their staked amount (if using PoS/DPoS)
    mapping(address => uint256) public validatorStakes;
    // Mapping to track consensus votes for a given data hash
    mapping(bytes32 => mapping(address => bool)) private hasVoted; // dataHash => validatorAddress => voted
    mapping(bytes32 => uint256) private yesVotes; // dataHash => total 'yes' votes (based on stake)

    // Reference to the RFOF native token (e.g., ABILITY or NANO) for staking
    IERC20 public rfofToken;

    // Event emitted when a validator stakes tokens
    event ValidatorStaked(address indexed validator, uint256 amount);
    // Event emitted when a validator withdraws stake
    event ValidatorUnstaked(address indexed validator, uint256 amount);
    // Event emitted when a vote is cast for a data hash
    event VoteCast(bytes32 indexed dataHash, address indexed voter, bool decision, uint256 voteWeight);
    // Event emitted when consensus is reached for a data hash
    event ConsensusReached(bytes32 indexed dataHash);

    constructor(
        address _rfofTokenAddress,
        uint256 _minValidatorStake,
        uint256 _consensusThresholdNumerator,
        uint256 _consensusThresholdDenominator
    ) Ownable(msg.sender) {
        require(_rfofTokenAddress != address(0), "RFOF Token address cannot be zero");
        require(_minValidatorStake > 0, "Min validator stake must be greater than zero");
        require(_consensusThresholdDenominator > 0, "Consensus threshold denominator must be greater than zero");
        require(_consensusThresholdNumerator <= _consensusThresholdDenominator, "Numerator must be <= denominator");

        rfofToken = IERC20(_rfofTokenAddress);
        minValidatorStake = _minValidatorStake;
        consensusThresholdNumerator = _consensusThresholdNumerator;
        consensusThresholdDenominator = _consensusThresholdDenominator;
    }

    /**
     * @dev Allows a user to stake RFOF tokens to become a validator.
     * @param _amount The amount of RFOF tokens to stake.
     */
    function stake(uint256 _amount) public {
        require(_amount >= minValidatorStake, "Stake amount below minimum");
        // Transfer tokens from sender to this contract
        require(rfofToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        validatorStakes[msg.sender] = validatorStakes[msg.sender].add(_amount);
        emit ValidatorStaked(msg.sender, _amount);
    }

    /**
     * @dev Allows a validator to unstake their RFOF tokens.
     * @param _amount The amount of RFOF tokens to unstake.
     */
    function unstake(uint256 _amount) public {
        require(validatorStakes[msg.sender] >= _amount, "Insufficient staked amount");
        // Prevent unstaking if it brings stake below minimum while still acting as a validator
        // (more complex logic might be needed for active validator sets)
        validatorStakes[msg.sender] = validatorStakes[msg.sender].sub(_amount);
        require(rfofToken.transfer(msg.sender, _amount), "Token transfer failed during unstake");
        emit ValidatorUnstaked(msg.sender, _amount);
    }

    /**
     * @dev Records a vote for a specific data hash (e.g., a proposed BOx).
     * Only staked validators can vote. Each validator can vote once per dataHash.
     * The vote weight is determined by their stake.
     * @param _dataHash The hash of the data or BOx being voted on.
     * @param _decision True for 'yes', false for 'no'.
     */
    function vote(bytes32 _dataHash, bool _decision) public {
        require(validatorStakes[msg.sender] >= minValidatorStake, "Caller is not an active validator or stake is too low");
        require(!hasVoted[_dataHash][msg.sender], "Validator already voted for this data hash");

        hasVoted[_dataHash][msg.sender] = true;
        uint256 voteWeight = validatorStakes[msg.sender];

        if (_decision) {
            yesVotes[_dataHash] = yesVotes[_dataHash].add(voteWeight);
        }
        // No mechanism for 'no' votes yet, assuming 'no' is implicit absence of 'yes' vote
        // or handled by simply not increasing yesVotes. For more complex, could have a 'noVotes' mapping.

        emit VoteCast(_dataHash, msg.sender, _decision, voteWeight);
    }

    /**
     * @dev Checks if consensus has been reached for a given data hash.
     * This function would be called by RFOFNetworkCore to determine if a BOx is valid.
     * @param _dataHash The hash of the data or BOx to check consensus for.
     * @return bool True if consensus has been reached.
     */
    function achieveConsensus(bytes32 _dataHash) public view returns (bool) {
        uint256 totalActiveStake = getTotalActiveStake();
        if (totalActiveStake == 0) {
            // No active validators, consensus cannot be reached, or default to true for bootstrap
            // This logic needs careful consideration for network startup/edge cases.
            return false;
        }

        uint256 requiredYesVotes = totalActiveStake.mul(consensusThresholdNumerator).div(consensusThresholdDenominator);
        if (yesVotes[_dataHash] >= requiredYesVotes) {
            // In a more complex system, this would also trigger an event and potentially
            // clear vote data for _dataHash to save gas.
            // emit ConsensusReached(_dataHash); // Can't emit from view function
            return true;
        }
        return false;
    }

    /**
     * @dev Returns the total amount of RFOF tokens currently staked by all validators.
     * This represents the total "voting power" in the network.
     */
    function getTotalActiveStake() public view returns (uint256) {
        // In a large network, iterating over all validators is not feasible.
        // A more sophisticated system would use a dynamic validator set managed by the governance module,
        // or sum stakes only for actively participating validators in a round-based consensus.
        // For simplicity, this is a placeholder.
        return rfofToken.balanceOf(address(this)); // Assumes all tokens held by contract are staked
    }

    /**
     * @dev Allows the owner to update the minimum validator stake.
     * @param _newMinStake The new minimum amount of RFOF tokens required to be a validator.
     */
    function updateMinValidatorStake(uint256 _newMinStake) public onlyOwner {
        require(_newMinStake > 0, "New minimum stake must be greater than zero");
        minValidatorStake = _newMinStake;
    }

    /**
     * @dev Allows the owner to update the consensus threshold.
     * @param _newNumerator The new numerator for the consensus threshold.
     * @param _newDenominator The new denominator for the consensus threshold.
     */
    function updateConsensusThreshold(uint256 _newNumerator, uint256 _newDenominator) public onlyOwner {
        require(_newDenominator > 0, "Denominator must be greater than zero");
        require(_newNumerator <= _newDenominator, "Numerator must be less than or equal to denominator");
        consensusThresholdNumerator = _newNumerator;
        consensusThresholdDenominator = _newDenominator;
    }

    // Additional functions for validator management (e.g., slashing, rewards distribution from TokenDistribution)
    // - Registering/deregistering validators
    // - Handling validator punishments for malicious behavior (via NetworkGovernance)
}
