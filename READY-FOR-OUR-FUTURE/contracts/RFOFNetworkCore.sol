// SPDX-License-Identifier: SEE LICENSE IN ../../LICENSE
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./DataRegistry.sol";
import "./ConsensusModule.sol";
import "./TokenDistribution.sol";
import "./NetworkGovernance.sol";

// RFOFNetworkCore is the central Smart Contract for the READY-FOR-OUR-FUTURE blockchain logic.
// It integrates the BOxchain concept and orchestrates interaction with other core modules.
contract RFOFNetworkCore is Context, Ownable {
    using Address for address;

    // References to integrated core modules
    DataRegistry public dataRegistry;
    ConsensusModule public consensusModule;
    TokenDistribution public tokenDistribution;
    NetworkGovernance public networkGovernance;

    // Event emitted when a new BOx (Block-Object-eXtension) is processed
    event BOxProcessed(bytes32 indexed boxHash, uint256 timestamp, address indexed processor);
    // Event emitted when the core network state is updated
    event NetworkStateUpdated(bytes32 indexed newStateHash, uint256 timestamp);

    // Modifier to restrict calls to PRAI-OS, if directly interacting with a single contract
    // For full PRAI-OS interaction, this would typically be handled at a higher integration layer
    modifier onlyPRAIOS() {
        // This is a placeholder for a more complex PRAI-OS authentication/authorization mechanism.
        // In a real decentralized system, this would involve verifiable credentials,
        // decentralized identity (DID) linked to PRAI-OS, or specific contract calls from PRAI-OS.
        // For now, we might use a trusted address or a more sophisticated multi-sig/DAO approach.
        require(msg.sender == address(0xPRAIOS_TRUSTED_ADDRESS), "Only PRAI-OS can call this function");
        _;
    }

    constructor(
        address _dataRegistryAddress,
        address _consensusModuleAddress,
        address _tokenDistributionAddress,
        address _networkGovernanceAddress
    ) Ownable(msg.sender) { // Constructor uses the deployer as initial owner
        require(_dataRegistryAddress != address(0), "DataRegistry address cannot be zero");
        require(_consensusModuleAddress != address(0), "ConsensusModule address cannot be zero");
        require(_tokenDistributionAddress != address(0), "TokenDistribution address cannot be zero");
        require(_networkGovernanceAddress != address(0), "NetworkGovernance address cannot be zero");

        dataRegistry = DataRegistry(_dataRegistryAddress);
        consensusModule = ConsensusModule(_consensusModuleAddress);
        tokenDistribution = TokenDistribution(_tokenDistributionAddress);
        networkGovernance = NetworkGovernance(_networkGovernanceAddress);
    }

    /**
     * @dev Processes a new BOx (Block-Object-eXtension) for the RFOF network.
     * This function would ingest transformed data from other blockchains or native RFOF data.
     * It should interact with the DataRegistry and ConsensusModule.
     * @param _boxData The raw data of the BOx to be processed.
     * @return boolean True if the BOx was successfully processed.
     */
    function processBOx(bytes memory _boxData) public returns (bool) {
        // In a real scenario, _boxData would be validated against BOx structure
        // and PZQQET-Axiomatikx principles.
        bytes32 boxHash = keccak256(_boxData);

        // Example: Interact with ConsensusModule to get approval
        require(consensusModule.achieveConsensus(boxHash), "Consensus failed for BOx");

        // Example: Register data in DataRegistry
        dataRegistry.registerData(boxHash, _boxData);

        // Update network state (simplified)
        bytes32 newStateHash = keccak256(abi.encodePacked(block.timestamp, boxHash, dataRegistry.getDataCount()));
        emit NetworkStateUpdated(newStateHash, block.timestamp);
        emit BOxProcessed(boxHash, block.timestamp, _msgSender());
        return true;
    }

    /**
     * @dev Allows the owner to update the address of the DataRegistry contract.
     * @param _newDataRegistryAddress The new address of the DataRegistry contract.
     */
    function updateDataRegistryAddress(address _newDataRegistryAddress) public onlyOwner {
        require(_newDataRegistryAddress != address(0), "New DataRegistry address cannot be zero");
        dataRegistry = DataRegistry(_newDataRegistryAddress);
    }

    /**
     * @dev Allows the owner to update the address of the ConsensusModule contract.
     * @param _newConsensusModuleAddress The new address of the ConsensusModule contract.
     */
    function updateConsensusModuleAddress(address _newConsensusModuleAddress) public onlyOwner {
        require(_newConsensusModuleAddress != address(0), "New ConsensusModule address cannot be zero");
        consensusModule = ConsensusModule(_newConsensusModuleAddress);
    }

    /**
     * @dev Allows the owner to update the address of the TokenDistribution contract.
     * @param _newTokenDistributionAddress The new address of the TokenDistribution contract.
     */
    function updateTokenDistributionAddress(address _newTokenDistributionAddress) public onlyOwner {
        require(_newTokenDistributionAddress != address(0), "New TokenDistribution address cannot be zero");
        tokenDistribution = TokenDistribution(_newTokenDistributionAddress);
    }

    /**
     * @dev Allows the owner to update the address of the NetworkGovernance contract.
     * @param _newNetworkGovernanceAddress The new address of the NetworkGovernance contract.
     */
    function updateNetworkGovernanceAddress(address _newNetworkGovernanceAddress) public onlyOwner {
        require(_newNetworkGovernanceAddress != address(0), "New NetworkGovernance address cannot be zero");
        networkGovernance = NetworkGovernance(_newNetworkGovernanceAddress);
    }

    // Additional functions for network-wide operations, e.g.,
    // - Managing network parameters (via NetworkGovernance)
    // - Interfacing with PRAI-OS for specific commands (e.g., system-wide updates, data re-evaluation)
    // - Handling external blockchain integration logic beyond simple BOx processing
    // - Function to retrieve current network status or metrics
}
