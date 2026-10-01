// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title RECToken
/// @notice Renewable energy certificates. One token per verified kWh batch, carrying the
///         meter ID, reading ID, timestamp and energy (Wh) it certifies.
contract RECToken is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct Certificate {
        bytes32 readingId;
        bytes32 meterId;
        address producer;
        uint64 timestamp;
        uint64 wh;
    }

    uint256 public totalMinted;
    mapping(uint256 tokenId => Certificate) private _certificates;

    event CertificateMinted(
        uint256 indexed tokenId, address indexed owner, bytes32 indexed readingId, bytes32 meterId, uint64 wh
    );

    error UnknownCertificate(uint256 tokenId);
    error ZeroAddress();

    constructor(address admin) ERC721("Sunpool Renewable Energy Certificate", "SREC") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(address to, Certificate calldata cert) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = ++totalMinted;
        _certificates[tokenId] = cert;
        _safeMint(to, tokenId);
        emit CertificateMinted(tokenId, to, cert.readingId, cert.meterId, cert.wh);
    }

    function certificate(uint256 tokenId) external view returns (Certificate memory) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownCertificate(tokenId);
        return _certificates[tokenId];
    }

    /// @notice Fully on-chain JSON metadata.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert UnknownCertificate(tokenId);
        Certificate memory c = _certificates[tokenId];
        string memory json = string.concat(
            '{"name":"Sunpool REC #',
            tokenId.toString(),
            '","description":"Renewable energy certificate for a verified rooftop solar export.",',
            '"attributes":[{"trait_type":"Wh","value":',
            uint256(c.wh).toString(),
            '},{"trait_type":"Timestamp","value":',
            uint256(c.timestamp).toString(),
            '},{"trait_type":"Meter ID","value":"',
            uint256(c.meterId).toHexString(32),
            '"},{"trait_type":"Reading ID","value":"',
            uint256(c.readingId).toHexString(32),
            '"},{"trait_type":"Producer","value":"',
            Strings.toHexString(c.producer),
            '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
