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

	// L2 Wilds Contracts
	// const WildsAdminActions = await ethers.getContractFactory('WildsAdminActions');
	// wildsAdminActions = await WildsAdminActions.deploy();
	// await wildsAdminActions.deployed();
	// await sleep(10000);

	// const WildsStaking = await ethers.getContractFactory('WildsStaking');
	// wildsStaking = await WildsStaking.deploy();
	// await wildsStaking.deployed();
	// await sleep(10000);

	// const WildsActions = await ethers.getContractFactory('WildsActions');
	// wildsActions = await WildsActions.deploy();
	// await wildsActions.deployed();

	// await sleep(10000);

	// GET ADDRESSES FIRST
	const Wilds = await ethers.getContractFactory('Wilds');
	wilds = await Wilds.deploy(getAddresses(chain).meralManager, getAddresses(chain).wildsAdmin, getAddresses(chain).wildsStaking, getAddresses(chain).wildsActions);
	await wilds.deployed();
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
