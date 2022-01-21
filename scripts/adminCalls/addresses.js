require('dotenv').config();

const getAddresses = (chain = 1) => {
	let addresses = {
		bridgeGM1: process.env.ADDRESS_MATIC_BRIDGE_1,
		bridgeGM2: process.env.ADDRESS_MATIC_BRIDGE_2,
		bridgeGM3: process.env.ADDRESS_MATIC_BRIDGE_3,
		merals: '0xeE8C0131aa6B66A2CE3cad6D2A039c1473a79a6d',
		escrowL1: '0x52AD83F0aE762622eab23BF9A15508195d404ef5',
		meralManager: '0x055F437a439CaEC49De34026e583528aae84d7aF',
		onsen: '0xe39d7C3C4Be47C8B08A03FA52683322aF6697FCD',
	};

	if (chain === 4) {
		addresses.merals = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';
		addresses.escrowL1 = '0x52AD83F0aE762622eab23BF9A15508195d404ef5';
	}

	return addresses;
};

module.exports = { getAddresses };
