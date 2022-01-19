require('dotenv').config();
const meralsL1Address = '0xeE8C0131aa6B66A2CE3cad6D2A039c1473a79a6d';
const meralsL2Address = '0x39E75603BF945E4402421F43C1d6E630E68E0dCA';
const meralManagerAddress = '0xCbaAabB391140833419b3Adade77220084b84dB1';
const escrowL1Address = '0x52AD83F0aE762622eab23BF9A15508195d404ef5';
const onsenAddress = '0xe39d7C3C4Be47C8B08A03FA52683322aF6697FCD';

const BridgeGM1 = process.env.ADDRESS_MATIC_BRIDGE_1;
const BridgeGM2 = process.env.ADDRESS_MATIC_BRIDGE_2;
const BridgeGM3 = process.env.ADDRESS_MATIC_BRIDGE_3;

module.exports = { meralsL1Address, meralsL2Address, meralManagerAddress, escrowL1Address, onsenAddress, BridgeGM1, BridgeGM2, BridgeGM3 };
