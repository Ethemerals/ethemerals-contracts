const hre = require('hardhat');
const { getAddresses } = require('./adminCalls/addresses');

let chain = 4;

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	const EthemeralsBurner = await ethers.getContractFactory('EthemeralsBurner');
	ethemeralsBurner = await EthemeralsBurner.deploy(getAddresses(chain).merals);
	await ethemeralsBurner.deployed();

	console.log('ethemeralsBurner deployed to:', ethemeralsBurner.address);

	// const Ethemerals = await ethers.getContractFactory('Ethemerals');
	// const merals = await Ethemerals.attach(EthemeralsAddress_4);

	// await merals.addDelegate(escrowL1.address, true);
	// console.log('add escrow to delegates');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
