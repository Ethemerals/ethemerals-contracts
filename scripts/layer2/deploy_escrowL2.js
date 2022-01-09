const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const meralsL2Address = '0xB52c5C0B23b852783Ef99a64daEE9FbCE58B60f5';
const deployedAddress = '0x60F99755E830A25BFBd085826Bc4fA453932D5C3';
// escrowL2 deployed to: 0x22769e093D82eb50Fa9025a19309052c799CA9dE

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// const EscrowL2 = await ethers.getContractFactory('EscrowOnL2');
	// escrowL2 = await EscrowL2.deploy(meralsL2Address);
	// await escrowL2.deployed();
	// console.log('escrowL2 deployed to:', escrowL2.address);

	await hre.run('verify:verify', {
		address: deployedAddress,
		constract: 'src/artifacts/contracts/layer2/EscrowOnL2.sol:EscrowOnL2',
		constructorArguments: [meralsL2Address],
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
