const hre = require('hardhat');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// L2 Contracts
	console.log(admin.address);
	// const MeralManager = await ethers.getContractFactory('MeralManager');
	// meralManager = await MeralManager.deploy(); // TODO random register
	// await meralManager.deployed();
	// console.log('meralManager deployed to:', meralManager.address);
	// await sleep(4000);

	const meralManagerAddress = '0xCbaAabB391140833419b3Adade77220084b84dB1';
	const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
	meralsL2 = await EthemeralsL2.deploy(meralManagerAddress);
	await meralsL2.deployed();
	console.log('meralsL2 deployed to:', meralsL2.address);
	await sleep(4000);

	// // register
	// await meralManager.addMeralContract(1, meralsL2.address);
	// console.log('register meralL2 contract');
	// await sleep(4000);

	// // approvals
	// await meralManager.addGM(admin.address, true);
	// console.log('add admin gm');
	// await sleep(4000);

	// await meralManager.addGM(meralsL2.address, true);
	// console.log('add meralsL2 gm');
	// await sleep(4000);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
