require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');

require('dotenv').config();
if (process.env.REPORT_GAS === '1') {
	require('hardhat-gas-reporter');
}

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
	const accounts = await hre.ethers.getSigners();

	for (const account of accounts) {
		console.log(account.address);
	}
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	solidity: '0.8.7',
	settings: {
		optimizer: {
			enabled: true,
			runs: 200,
		},
	},
	mocha: {
		timeout: 100000,
	},
	paths: {
		artifacts: './src/artifacts',
	},
	networks: {
		hardhat: {
			chainId: 1337,
		},
		rinkeby: {
			url: `https://rinkeby.infura.io/v3/${process.env.INFURAID}`,
			accounts: [`0x${process.env.PRIV_KEY}`],
		},
		mainnet: {
			url: `https://mainnet.infura.io/v3/${process.env.INFURAID}`, // or any other JSON-RPC provider
			accounts: [`0x${process.env.PRIV_KEY}`],
		},
		// mumbai: {
		// 	url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMYID}`,
		// 	accounts: [`0x${process.env.PRIV_KEY_MATIC}`],
		// },
		mumbai: {
			url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURAID}`,
			accounts: [`0x${process.env.PRIV_KEY_MATIC}`],
		},
		matic: {
			url: 'https://speedy-nodes-nyc.moralis.io/<YOUR_ID>/polygon/mainnet',
			accounts: [`0x${process.env.PRIV_KEY_MATIC}`],
		},
	},
	etherscan: {
		// apiKey: {
		// 	mainnet: process.env.ETHERSCAN_APIKEY,
		// 	rinkeby: process.env.ETHERSCAN_APIKEY,
		// 	polygon = process.env.POLYGONSCAN_APIKEY,
		// 	polygonMumbai = process.env.POLYGONSCAN_APIKEY,
		// },
		apiKey: process.env.POLYGONSCAN_APIKEY,
		// apiKey: process.env.ETHERSCAN_APIKEY,
	},
	gasReporter: {
		currency: 'USD',
		gasPrice: 77,
		coinmarketcap: process.env.CMKEY,
	},
};

// npx hardhat node
// npx hardhat run scripts/deploy.js --network localhost
// npx hardhat run scripts/deploy.js --network rinkeby
// npx hardhat verify --constructor-args ./scripts/arguments/ethemeralArguments.js --network mumbai 0xc4f58128c639a6E2d9F2EcFA7C9c5EC00D0965B3
