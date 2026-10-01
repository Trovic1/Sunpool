// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ReadingRegistry} from "./ReadingRegistry.sol";
import {RECToken} from "./RECToken.sol";

/// @title EnergyMarket
/// @notice Sellers list surplus backed by a signed meter reading; buyers pay in a
///         stablecoin (USDm, formerly cUSD) and receive a renewable energy certificate.
///         Listing consumes the reading, so the same kWh can never be sold or certified twice.
contract EnergyMarket is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct Listing {
        address seller;
        uint64 wh;
        uint64 listedAt;
        bool active;
        /// Stablecoin base units per kWh (18 decimals for USDm).
        uint256 pricePerKwh;
        ReadingRegistry.Reading reading;
    }

    IERC20 public immutable stablecoin;
    ReadingRegistry public immutable registry;
    RECToken public immutable certificates;

    uint256 public listingCount;
    mapping(uint256 listingId => Listing) private _listings;

    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        bytes32 indexed readingId,
        bytes32 meterId,
        uint64 wh,
        uint256 pricePerKwh
    );
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event TradeSettled(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        bytes32 readingId,
        uint64 wh,
        uint256 pricePerKwh,
        uint256 total,
        uint256 certificateId
    );

    error NotSeller(address caller, address seller);
    error ListingNotActive(uint256 listingId);
    error ZeroPrice();
    error SelfPurchase();
    error PriceChanged(uint256 expected, uint256 actual);
    error ZeroAddress();

    constructor(address admin, IERC20 stablecoin_, ReadingRegistry registry_, RECToken certificates_) {
        if (
            admin == address(0) || address(stablecoin_) == address(0) || address(registry_) == address(0)
                || address(certificates_) == address(0)
        ) revert ZeroAddress();
        stablecoin = stablecoin_;
        registry = registry_;
        certificates = certificates_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /// @notice Total price for `wh` watt-hours at `pricePerKwh`, rounded down.
    function quote(uint64 wh, uint256 pricePerKwh) public pure returns (uint256) {
        return (uint256(wh) * pricePerKwh) / 1000;
    }

    /// @notice List the energy in a signed reading. The reading is consumed here, so a
    ///         second listing of the same reading reverts with ReadingAlreadyConsumed.
    function list(ReadingRegistry.Reading calldata reading, bytes calldata signature, uint256 pricePerKwh)
        external
        whenNotPaused
        returns (uint256 listingId)
    {
        if (msg.sender != reading.seller) revert NotSeller(msg.sender, reading.seller);
        if (pricePerKwh == 0) revert ZeroPrice();

        registry.consume(reading, signature);

        listingId = ++listingCount;
        _listings[listingId] = Listing({
            seller: msg.sender,
            wh: reading.wh,
            listedAt: uint64(block.timestamp),
            active: true,
            pricePerKwh: pricePerKwh,
            reading: reading
        });
        emit Listed(listingId, msg.sender, reading.readingId, reading.meterId, reading.wh, pricePerKwh);
    }

    function cancel(uint256 listingId) external {
        Listing storage listing = _listings[listingId];
        if (!listing.active) revert ListingNotActive(listingId);
        if (msg.sender != listing.seller) revert NotSeller(msg.sender, listing.seller);
        listing.active = false;
        emit ListingCancelled(listingId, msg.sender);
    }

    /// @notice Buy a whole listing. `maxPricePerKwh` protects the buyer from a changed price.
    ///         The buyer must have approved this contract for at least `quote(wh, price)`.
    function buy(uint256 listingId, uint256 maxPricePerKwh)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 certificateId)
    {
        Listing storage listing = _listings[listingId];
        if (!listing.active) revert ListingNotActive(listingId);
        if (msg.sender == listing.seller) revert SelfPurchase();
        if (listing.pricePerKwh > maxPricePerKwh) revert PriceChanged(maxPricePerKwh, listing.pricePerKwh);

        listing.active = false;
        uint256 total = quote(listing.wh, listing.pricePerKwh);
        stablecoin.safeTransferFrom(msg.sender, listing.seller, total);

        ReadingRegistry.Reading memory r = listing.reading;
        certificateId = certificates.mint(
            msg.sender,
            RECToken.Certificate({
                readingId: r.readingId,
                meterId: r.meterId,
                producer: listing.seller,
                timestamp: r.timestamp,
                wh: r.wh
            })
        );

        emit TradeSettled(
            listingId, listing.seller, msg.sender, r.readingId, listing.wh, listing.pricePerKwh, total, certificateId
        );
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
