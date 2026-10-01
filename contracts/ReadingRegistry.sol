// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title ReadingRegistry
/// @notice Verifies meter readings signed by registered meter keys and records each
///         reading ID as consumed exactly once, so a kWh batch can never back two
///         certificates.
contract ReadingRegistry is AccessControl, EIP712 {
    /// @notice Can register and revoke meter signing keys.
    bytes32 public constant METER_ADMIN_ROLE = keccak256("METER_ADMIN_ROLE");
    /// @notice Can consume readings (the EnergyMarket).
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    /// @notice A batch of exported energy, signed by the meter that measured it.
    struct Reading {
        bytes32 readingId;
        bytes32 meterId;
        address seller;
        uint64 timestamp;
        uint64 wh;
    }

    bytes32 public constant READING_TYPEHASH =
        keccak256("Reading(bytes32 readingId,bytes32 meterId,address seller,uint64 timestamp,uint64 wh)");

    /// @notice Signing key => meter ID it is registered for (zero if unregistered).
    mapping(address signer => bytes32 meterId) public meterOf;
    /// @notice Reading ID => block timestamp it was consumed at (zero if unused).
    mapping(bytes32 readingId => uint256 consumedAt) public consumedAt;

    event MeterRegistered(bytes32 indexed meterId, address indexed signer);
    event MeterRevoked(bytes32 indexed meterId, address indexed signer);
    event ReadingConsumed(bytes32 indexed readingId, bytes32 indexed meterId, address indexed seller, uint64 wh);

    error ReadingAlreadyConsumed(bytes32 readingId, uint256 consumedAt);
    error InvalidSignature();
    error UnregisteredMeter(address signer);
    error MeterMismatch(bytes32 expected, bytes32 actual);
    error EmptyReading();
    error ZeroAddress();

    constructor(address admin) EIP712("Sunpool ReadingRegistry", "1") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(METER_ADMIN_ROLE, admin);
    }

    // -------------------------------------------------------------------------
    // Meter keys
    // -------------------------------------------------------------------------

    function registerMeter(bytes32 meterId, address signer) external onlyRole(METER_ADMIN_ROLE) {
        if (signer == address(0)) revert ZeroAddress();
        meterOf[signer] = meterId;
        emit MeterRegistered(meterId, signer);
    }

    function revokeMeter(address signer) external onlyRole(METER_ADMIN_ROLE) {
        bytes32 meterId = meterOf[signer];
        delete meterOf[signer];
        emit MeterRevoked(meterId, signer);
    }

    // -------------------------------------------------------------------------
    // Readings
    // -------------------------------------------------------------------------

    /// @notice EIP-712 digest a meter signs for a reading.
    function hashReading(Reading calldata reading) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    READING_TYPEHASH,
                    reading.readingId,
                    reading.meterId,
                    reading.seller,
                    reading.timestamp,
                    reading.wh
                )
            )
        );
    }

    /// @notice Reverts unless the reading is signed by the key registered for its meter.
    function verify(Reading calldata reading, bytes calldata signature) public view returns (address signer) {
        if (reading.wh == 0 || reading.seller == address(0)) revert EmptyReading();
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(hashReading(reading), signature);
        if (err != ECDSA.RecoverError.NoError) revert InvalidSignature();
        bytes32 registered = meterOf[recovered];
        if (registered == bytes32(0)) revert UnregisteredMeter(recovered);
        if (registered != reading.meterId) revert MeterMismatch(registered, reading.meterId);
        return recovered;
    }

    function isConsumed(bytes32 readingId) external view returns (bool) {
        return consumedAt[readingId] != 0;
    }

    /// @notice Verifies and consumes a reading. A second attempt for the same ID reverts.
    function consume(Reading calldata reading, bytes calldata signature) external onlyRole(CONSUMER_ROLE) {
        uint256 previous = consumedAt[reading.readingId];
        if (previous != 0) revert ReadingAlreadyConsumed(reading.readingId, previous);
        verify(reading, signature);
        consumedAt[reading.readingId] = block.timestamp;
        emit ReadingConsumed(reading.readingId, reading.meterId, reading.seller, reading.wh);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
