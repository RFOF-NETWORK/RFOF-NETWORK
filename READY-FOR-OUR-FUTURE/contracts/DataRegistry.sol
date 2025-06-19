// SPDX-License-Identifier: SEE LICENSE IN ../../LICENSE
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DataRegistry
 * @dev Manages the decentralized storage and indexing of "PRAI-Neuronen"
 * and other critical network data within the RFOF-NETWORK.
 * It serves as a secure, immutable ledger for all processed BOx data and derived insights.
 */
contract DataRegistry is Ownable {
    using Counters for Counters.Counter;

    // A mapping from a data hash (e.g., BOx hash, Neuron hash) to its raw bytes data.
    // This allows for retrieval of the original data payload.
    mapping(bytes32 => bytes) private dataStore;

    // A mapping from a data hash to its unique ID.
    // This provides a sequential identifier for each piece of data, useful for indexing.
    mapping(bytes32 => uint256) private dataId;

    // A mapping from a unique ID back to its data hash.
    // Facilitates retrieval of data by its sequential order.
    mapping(uint256 => bytes32) private idToDataHash;

    // Counter for total registered data entries.
    Counters.Counter private _dataCount;

    // Event emitted when new data is successfully registered.
    event DataRegistered(bytes32 indexed dataHash, uint256 indexed dataId, uint256 timestamp);
    // Event emitted when data is retrieved (for logging/auditing, optional).
    event DataRetrieved(bytes32 indexed dataHash, address indexed retriever, uint256 timestamp);

    constructor() Ownable(msg.sender) {} // Deployer is the initial owner

    /**
     * @dev Registers new data within the DataRegistry.
     * This function is expected to be called by authorized components (e.g., RFOFNetworkCore).
     * It stores the data and assigns a unique ID.
     * @param _dataHash The unique hash of the data to be registered (e.g., keccak256(_data)).
     * @param _data The raw bytes data to be stored.
     * @return uint256 The unique ID assigned to the registered data.
     */
    function registerData(bytes32 _dataHash, bytes memory _data) public onlyOwner returns (uint256) {
        // Ensure data with this hash hasn't been registered already.
        require(dataId[_dataHash] == 0, "Data already registered with this hash");

        _dataCount.increment();
        uint256 currentId = _dataCount.current();

        dataStore[_dataHash] = _data;
        dataId[_dataHash] = currentId;
        idToDataHash[currentId] = _dataHash;

        emit DataRegistered(_dataHash, currentId, block.timestamp);
        return currentId;
    }

    /**
     * @dev Retrieves the raw bytes data associated with a given data hash.
     * @param _dataHash The hash of the data to retrieve.
     * @return bytes The raw bytes data.
     */
    function getDataByHash(bytes32 _dataHash) public view returns (bytes memory) {
        emit DataRetrieved(_dataHash, msg.sender, block.timestamp);
        return dataStore[_dataHash];
    }

    /**
     * @dev Retrieves the raw bytes data associated with a given unique data ID.
     * @param _id The unique ID of the data to retrieve.
     * @return bytes The raw bytes data.
     */
    function getDataById(uint256 _id) public view returns (bytes memory) {
        require(_id > 0 && _id <= _dataCount.current(), "Invalid data ID");
        bytes32 hash = idToDataHash[_id];
        emit DataRetrieved(hash, msg.sender, block.timestamp);
        return dataStore[hash];
    }

    /**
     * @dev Returns the unique ID for a given data hash.
     * @param _dataHash The hash of the data.
     * @return uint256 The unique ID, or 0 if not found.
     */
    function getIdByHash(bytes32 _dataHash) public view returns (uint256) {
        return dataId[_dataHash];
    }

    /**
     * @dev Returns the total number of data entries registered in the registry.
     * @return uint256 The current count of registered data.
     */
    function getDataCount() public view returns (uint256) {
        return _dataCount.current();
    }

    // Future enhancements could include:
    // - More sophisticated access control for data retrieval based on permissions (PZQQET-Axiomatikx driven).
    // - Versioning of data entries.
    // - Integration with external storage solutions (e.g., IPFS CIDs) for larger data payloads.
}
