const hre = require('hardhat');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// L2 Contracts
	console.log(admin.address);

	const meralManagerAddress = '0xCbaAabB391140833419b3Adade77220084b84dB1';
	const Onsen = await ethers.getContractFactory('Onsen');
	onsen = await Onsen.deploy(meralManagerAddress);
	await onsen.deployed();
	console.log('onsen deployed to:', onsen.address);
	await sleep(4000);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
