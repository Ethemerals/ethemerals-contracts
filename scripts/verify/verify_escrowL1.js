const hre = require('hardhat');

const escrowL1Address = '0xF77D83997d4a4c7A55f54FF59b15464D05AC8336';

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	await hre.run('verify:verify', {
		address: escrowL1Address,
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
