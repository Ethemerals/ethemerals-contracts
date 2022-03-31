// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IPriceFeedProvider {
    /**
     * Returns the latest price for a price feed.
     * It reverts if the feed id is invalid: there was no price feed address provided for the given id yet
     */
    function getLatestPrice(uint16 _priceFeedId)
        external
        view
        returns (int256);
}