require('dotenv').config();

const getAddresses = (chain = 1) => {
	let addresses = {
		bridgeGM1: process.env.ADDRESS_MATIC_BRIDGE_1,
		bridgeGM2: process.env.ADDRESS_MATIC_BRIDGE_2,
		bridgeGM3: process.env.ADDRESS_MATIC_BRIDGE_3,
		merals: '0xeE8C0131aa6B66A2CE3cad6D2A039c1473a79a6d',
		escrowL1: '0x52AD83F0aE762622eab23BF9A15508195d404ef5',
		meralManager: '0x055F437a439CaEC49De34026e583528aae84d7aF',
		onsen: '0xdB405C016322F9BB24ceB8386BcFcA277adf5bCE',
		wildsAdmin: '0xd5365E5F68D841Ad50302747B4CdD7ecCfE53eD4',
		wildsStaking: '0x5c84ED29062b0219d8fFC624582E5068fE85fBe8',
		wildsActions: '0xa447936fc06FE9113d656ab490dBeD487Ce7F4c7',
		wilds: '0x7D37289d70E6Ba0907760b6B8fc76C0c987a3efc',
	};

	if (chain === 4) {
		addresses.merals = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';
		addresses.escrowL1 = '0x52AD83F0aE762622eab23BF9A15508195d404ef5';
	}

	return addresses;
};

module.exports = { getAddresses };
