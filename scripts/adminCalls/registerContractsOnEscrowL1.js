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

	const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
	const escrowL1 = await EscrowL1.attach(getAddresses(chain).escrowL1);

	let value = await escrowL1.allContracts(1);
	console.log(value);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
