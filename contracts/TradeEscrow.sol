// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TradeEscrow {
    enum TradeState {
        Pending,
        Paid,
        Sent,
        Completed,
        Dispute,
        Expired
    }

    struct Trade {
        address seller;
        address buyer;
        uint256 price;
        uint256 createdAt;
        uint256 paidAt;
        TradeState state;
    }

    uint256 public tradeCounter;
    mapping(uint256 => Trade) public trades;

    // Events
    event TradeCreated(uint256 tradeId, address seller, uint256 price);
    event TradePaid(uint256 tradeId, address buyer);
    event TicketSent(uint256 tradeId);
    event TicketConfirmed(uint256 tradeId);
    event TradeDisputed(uint256 tradeId);
    event TradeExpired(uint256 tradeId);
}
