// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// MOCK
contract PriceFeedMock {

    // mapping of addresses to addresses to uint
    mapping (uint16 => uint) private prices;

    function getLatestPrice(uint16 _id) external view returns(uint price){
        return prices[_id];
    }

    // FAKE MOCK
    function updatePrice(uint16 _id, uint price) external {
        prices[_id] = price;
    }

}