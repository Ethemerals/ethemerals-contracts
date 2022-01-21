const hre = require('hardhat');
const { getAddresses } = require('./adminCalls/addresses');

let chain = 4;
async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// L2 Contracts
	console.log(admin.address);

	const Onsen = await ethers.getContractFactory('Onsen');
	onsen = await Onsen.deploy(getAddresses().meralManager);
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
