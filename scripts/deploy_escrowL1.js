const hre = require('hardhat');

const EthemeralsAddress_4 = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
	escrowL1 = await EscrowL1.deploy();
	await escrowL1.deployed();

	console.log('escrowL1 deployed to:', escrowL1.address);
	await sleep(4000);

	// register
	await escrowL1.addContract(1, EthemeralsAddress_4);
	console.log('add ethemerals contract');
	await sleep(4000);

	const Ethemerals = await ethers.getContractFactory('Ethemerals');
	const merals = await Ethemerals.attach(EthemeralsAddress_4);

	await merals.addDelegate(escrowL1.address, true);
	console.log('add escrow to delegates');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
