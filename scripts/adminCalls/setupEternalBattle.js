const { ethers } = require('hardhat');
const hre = require('hardhat');
const { getAddresses } = require('./addresses');

let chain = 4;

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(getAddresses(chain).meralManager);

	const EternalBattle = await ethers.getContractFactory('EternalBattle');
	const eternalBattle = await EternalBattle.attach(getAddresses(chain).eternalBattle);

	console.log('set contract');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
