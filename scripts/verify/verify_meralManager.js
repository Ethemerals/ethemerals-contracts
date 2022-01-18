const hre = require('hardhat');

const deployedAddress = '0x6eB5E38b2ecAD8759575a3C59254b32FAA84A257';

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	await hre.run('verify:verify', {
		address: deployedAddress,
		constructorArguments: [],
	});
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
