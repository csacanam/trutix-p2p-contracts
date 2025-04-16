// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);
}

contract TradeEscrow is ReentrancyGuard {
    // 1. Enums

    /// @notice Represents the current status of a ticket trade.
    enum TradeStatus {
        Created, // Trade was created by the seller. Awaiting buyer payment.
        Paid, // Buyer has paid. Awaiting ticket transfer by seller.
        Sent, // Seller marked the ticket as sent. Awaiting buyer confirmation.
        Completed, // Buyer confirmed ticket was received. Payment released to seller.
        Expired, // Trade expired due to inactivity (no payment or no confirmation).
        Refunded, // Trade was cancelled or expired. Funds returned to buyer
        Dispute // Trade is in dispute. Requires manual intervention or resolution.
    }

    /// @notice Represents a peer-to-peer ticket trade using USDC as escrow.
    /// @dev Created by the seller, funded by the buyer, and completed upon mutual confirmation.
    struct Trade {
        /// @dev Address of the seller who created the trade offer.
        address seller;
        /// @dev Address of the buyer who paid for the trade.
        /// This is set when the buyer successfully funds the trade.
        address buyer;
        /// @dev Base price of the ticket (before applying buyer/seller fees).
        /// Example: If the ticket is priced at 100 USDC, this field holds 100e6 (assuming 6 decimals).
        uint256 amount;
        /// @dev Fee (in basis points) deducted from the seller's payout.
        /// Example: 500 = 5% seller fee.
        uint256 sellerFee;
        /// @dev Fee (in basis points) added to the buyer's payment amount.
        /// Example: 500 = 5% buyer fee.
        uint256 buyerFee;
        /// @dev Timestamp when the trade was created by the seller.
        /// Used to determine expiration if the trade is not paid.
        uint256 createdAt;
        /// @dev Timestamp when the trade was paid by the buyer.
        /// Used to track expiration window for seller to send the ticket.
        uint256 paidAt;
        /// @dev Timestamp when the seller marked the ticket as sent.
        uint256 sentAt;
        /// @dev Current status of the trade.
        /// Example values: Created, Paid, Sent, Completed, Expired, Refunded, Dispute.
        TradeStatus status;
    }

    // 2. Storage and Global State

    IERC20 public usdc;
    address public owner;

    uint256 public tradeCounter;
    uint256 public feeBalance;

    uint256 public sellerFee = 500; // 5% default
    uint256 public buyerFee = 500; // 5% default

    mapping(uint256 => Trade) public trades;

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    // 3. Functions
    /// @notice Creates a new trade offer.
    /// @param _amount The base price of the tickets (in USDC).
    function createTrade(uint256 _amount) external returns (uint256) {
        require(_amount > 0, "Invalid amount");

        tradeCounter++;

        trades[tradeCounter] = Trade({
            seller: msg.sender,
            buyer: address(0),
            amount: _amount,
            sellerFee: sellerFee,
            buyerFee: buyerFee,
            createdAt: block.timestamp,
            paidAt: 0,
            sentAt: 0,
            status: TradeStatus.Created
        });

        emit TradeCreated(
            tradeCounter,
            msg.sender,
            _amount,
            sellerFee,
            buyerFee,
            block.timestamp
        );

        return tradeCounter;
    }

    /// @notice Allows a buyer to pay for a trade.
    /// Transfers USDC from the buyer to the contract.
    /// @param tradeId The ID of the trade being paid.
    function payTrade(uint256 tradeId) external {
        require(
            msg.sender != trades[tradeId].seller,
            "Seller cannot buy own trade"
        );
        Trade storage trade = trades[tradeId];
        require(trade.status == TradeStatus.Created, "Trade is not available");
        require(trade.buyer == address(0), "Already paid");
        require(block.timestamp <= trade.createdAt + 12 hours, "Trade expired");

        (uint256 buyerTotal, , ) = calculateFees(
            trade.amount,
            trade.buyerFee,
            trade.sellerFee
        );

        // Transfer USDC from buyer to this contract
        bool success = usdc.transferFrom(msg.sender, address(this), buyerTotal);
        require(success, "Payment failed");

        trade.buyer = msg.sender;
        trade.paidAt = block.timestamp;
        trade.status = TradeStatus.Paid;

        emit TradePaid(tradeId, msg.sender, buyerTotal, block.timestamp);
    }

    /// @notice Allows the seller to mark the ticket as sent to the buyer.
    /// @param tradeId The ID of the trade.
    function markAsSent(uint256 tradeId) external onlySeller(tradeId) {
        Trade storage trade = trades[tradeId];

        require(trade.status == TradeStatus.Paid, "Trade not paid");

        trade.status = TradeStatus.Sent;
        trade.sentAt = block.timestamp;

        emit TradeMarkedAsSent(tradeId, msg.sender);
    }

    /// @notice Buyer confirms ticket reception. Funds are released to seller.
    /// @param tradeId The ID of the trade being completed.
    function confirmReception(
        uint256 tradeId
    ) external onlyBuyer(tradeId) nonReentrant {
        Trade storage trade = trades[tradeId];
        require(trade.status == TradeStatus.Sent, "Ticket not marked as sent");

        (, uint256 sellerReceives, uint256 totalFee) = calculateFees(
            trade.amount,
            trade.buyerFee,
            trade.sellerFee
        );

        trade.status = TradeStatus.Completed;
        feeBalance += totalFee;

        // Transfer seller payout (after fees)
        bool success = usdc.transfer(trade.seller, sellerReceives);
        require(success, "Transfer to seller failed");

        emit TradeCompleted(tradeId, msg.sender);
    }

    /// @notice Expires a trade if it has passed the allowed time window without action.
    /// - If unpaid after 12h, it expires and does nothing.
    /// - If paid but not sent after 12h, it refunds the buyer.
    /// Anyone can call this function to trigger expiration.
    /// @param tradeId The ID of the trade to check and expire.
    function expireTrade(
        uint256 tradeId
    ) external nonReentrant notInDispute(tradeId) {
        Trade storage trade = trades[tradeId];

        require(
            trade.status == TradeStatus.Created ||
                trade.status == TradeStatus.Paid,
            "Trade not expirable"
        );

        // Case 1: Not paid after 12h → Expire without refund
        if (
            trade.status == TradeStatus.Created &&
            block.timestamp > trade.createdAt + 12 hours
        ) {
            trade.status = TradeStatus.Expired;
            emit TradeExpired(tradeId);
            return;
        }

        // Case 2: Paid but not marked as sent after 12h → Refund buyer
        if (
            trade.status == TradeStatus.Paid &&
            block.timestamp > trade.paidAt + 12 hours
        ) {
            (uint256 buyerTotal, , ) = calculateFees(
                trade.amount,
                trade.buyerFee,
                trade.sellerFee
            );

            trade.status = TradeStatus.Refunded;

            bool success = usdc.transfer(trade.buyer, buyerTotal);
            require(success, "Refund failed");

            emit TradeRefunded(tradeId, trade.buyer);
            return;
        }

        // Case 3: Ticket marked as sent, but buyer did not confirm in 12h → Release to seller
        if (
            trade.status == TradeStatus.Sent &&
            block.timestamp > trade.sentAt + 12 hours
        ) {
            (, uint256 sellerReceives, uint256 totalFee) = calculateFees(
                trade.amount,
                trade.buyerFee,
                trade.sellerFee
            );

            trade.status = TradeStatus.Completed;
            feeBalance += totalFee;

            bool success = usdc.transfer(trade.seller, sellerReceives);
            require(success, "Auto-payment to seller failed");

            emit TradeCompleted(tradeId, trade.buyer);
            return;
        }

        revert("Trade is still valid");
    }

    /// @notice Allows the buyer to mark the trade as disputed if they did not receive the ticket.
    /// This freezes the trade and prevents automatic refund or payment.
    /// @param tradeId The ID of the trade being disputed.
    function disputeTrade(uint256 tradeId) external onlyBuyer(tradeId) {
        Trade storage trade = trades[tradeId];

        require(
            trade.status == TradeStatus.Sent,
            "Can only dispute after ticket is sent"
        );

        trade.status = TradeStatus.Dispute;

        emit TradeDisputed(tradeId);
    }

    /// @notice Allows the contract owner to manually resolve a disputed trade.
    /// @dev Sends funds either to the buyer (refund) or to the seller (payout).
    /// This is only callable if the trade is in Dispute mode.
    /// @param tradeId The ID of the disputed trade.
    /// @param toBuyer If true, refunds the buyer. If false, releases funds to the seller.
    function resolveDispute(
        uint256 tradeId,
        bool toBuyer
    ) external onlyOwner nonReentrant {
        Trade storage trade = trades[tradeId];
        require(trade.status == TradeStatus.Dispute, "Trade is not in dispute");

        if (toBuyer) {
            // Refund to buyer
            (uint256 buyerTotal, , ) = calculateFees(
                trade.amount,
                trade.buyerFee,
                trade.sellerFee
            );

            trade.status = TradeStatus.Refunded;

            bool success = usdc.transfer(trade.buyer, buyerTotal);
            require(success, "Refund to buyer failed");

            emit TradeRefunded(tradeId, trade.buyer);
        } else {
            // Release payment to seller
            (, uint256 sellerReceives, uint256 totalFee) = calculateFees(
                trade.amount,
                trade.buyerFee,
                trade.sellerFee
            );

            trade.status = TradeStatus.Completed;
            feeBalance += totalFee;

            bool success = usdc.transfer(trade.seller, sellerReceives);
            require(success, "Transfer to seller failed");

            emit TradeCompleted(tradeId, trade.buyer);
        }

        emit TradeResolved(tradeId, toBuyer);
    }

    /// @notice Returns detailed trade information for a given trade ID.
    /// @dev Useful for frontends that want to avoid multiple `trades[tradeId].field` calls.
    /// @param tradeId The ID of the trade to fetch.
    /// @return seller The address of the seller.
    /// @return buyer The address of the buyer.
    /// @return amount The base price of the trade.
    /// @return createdAt Timestamp when the trade was created.
    /// @return paidAt Timestamp when the trade was paid.
    /// @return sentAt Timestamp when the seller marked it as sent.
    /// @return status Current status of the trade.
    function getTrade(
        uint256 tradeId
    )
        external
        view
        returns (
            address seller,
            address buyer,
            uint256 amount,
            uint256 createdAt,
            uint256 paidAt,
            uint256 sentAt,
            TradeStatus status
        )
    {
        Trade storage t = trades[tradeId];
        return (
            t.seller,
            t.buyer,
            t.amount,
            t.createdAt,
            t.paidAt,
            t.sentAt,
            t.status
        );
    }

    /// @notice Allows the contract owner to withdraw the accumulated platform fees.
    /// @param to The address to receive the fees.
    function withdrawFees(address to) external onlyOwner nonReentrant {
        require(feeBalance > 0, "No fees to withdraw");

        uint256 amount = feeBalance;
        feeBalance = 0; // Reset balance before transfer to prevent reentrancy

        bool success = usdc.transfer(to, amount);
        require(success, "Transfer failed");

        emit FeesWithdrawn(to, amount);
    }

    //4. Helpers

    /// @notice Calculates the fee amounts for buyer and seller based on trade config.
    /// @param baseAmount The base price of the trade (in USDC, with 6 decimals).
    /// @param _buyerFee The buyer fee in basis points (1% = 100).
    /// @param _sellerFee The seller fee in basis points (1% = 100).
    /// @return buyerTotal The total amount the buyer has to pay.
    /// @return sellerReceives The amount the seller will receive after fees.
    /// @return totalFee The platform fee earned from this trade (buyer + seller fee).
    function calculateFees(
        uint256 baseAmount,
        uint256 _buyerFee,
        uint256 _sellerFee
    )
        internal
        pure
        returns (uint256 buyerTotal, uint256 sellerReceives, uint256 totalFee)
    {
        uint256 buyerFeeAmount = (baseAmount * _buyerFee) / 10_000;
        uint256 sellerFeeAmount = (baseAmount * _sellerFee) / 10_000;

        buyerTotal = baseAmount + buyerFeeAmount;
        sellerReceives = baseAmount - sellerFeeAmount;
        totalFee = buyerFeeAmount + sellerFeeAmount;
    }

    function setFees(uint256 _sellerFee, uint256 _buyerFee) external onlyOwner {
        require(_sellerFee <= 10000 && _buyerFee <= 10000, "Invalid fees");
        sellerFee = _sellerFee;
        buyerFee = _buyerFee;
    }

    //5. Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    /// @dev Restricts function access to the buyer of a specific trade.
    modifier onlyBuyer(uint256 tradeId) {
        require(msg.sender == trades[tradeId].buyer, "Not buyer");
        _;
    }

    /// @dev Restricts function access to the seller of a specific trade.
    modifier onlySeller(uint256 tradeId) {
        require(msg.sender == trades[tradeId].seller, "Not seller");
        _;
    }

    /// @dev Restricts function access if the trade is in dispute mode.
    modifier notInDispute(uint256 tradeId) {
        require(trades[tradeId].status != TradeStatus.Dispute, "In dispute");
        _;
    }

    // 6. Events
    /// @notice Emitted when a new trade is created by the seller.
    event TradeCreated(
        uint256 indexed tradeId,
        address indexed seller,
        uint256 amount,
        uint256 sellerFee,
        uint256 buyerFee,
        uint256 createdAt
    );

    /// @notice Emitted when a buyer pays for a trade.
    event TradePaid(
        uint256 indexed tradeId,
        address indexed buyer,
        uint256 totalAmountPaid,
        uint256 paidAt
    );

    /// @notice Emitted when the seller marks the ticket as sent.
    event TradeMarkedAsSent(uint256 indexed tradeId, address indexed seller);

    /// @notice Emitted when the buyer confirms reception and funds are released.
    event TradeCompleted(uint256 indexed tradeId, address indexed buyer);

    /// @notice Emitted when a trade is refunded to the buyer.
    event TradeRefunded(uint256 indexed tradeId, address indexed buyer);

    /// @notice Emitted when a trade expires and no action was taken.
    event TradeExpired(uint256 indexed tradeId);

    /// @notice Emitted when a trade is moved to dispute state.
    event TradeDisputed(uint256 indexed tradeId);

    /// @notice Emitted when admin withdraws accumulated platform fees.
    event FeesWithdrawn(address indexed to, uint256 amount);

    /// @notice Emitted when a disputed trade is manually resolved by the admin.
    /// @param tradeId ID of the trade.
    /// @param resolvedToBuyer True if refunded to buyer, false if paid to seller.
    event TradeResolved(uint256 indexed tradeId, bool resolvedToBuyer);
}
