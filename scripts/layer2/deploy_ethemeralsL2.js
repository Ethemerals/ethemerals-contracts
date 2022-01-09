const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const meralManagerAddress = '0xC9e774d46FDa53A30952aAf1cD898C6B28Af2B56';
const deployedAddress = '0xB52c5C0B23b852783Ef99a64daEE9FbCE58B60f5';
// meralsL2 deployed to: 0x44A219c284DC38E6065c42723c31412EC3459a43

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
	// meralsL2 = await EthemeralsL2.deploy(meralManagerAddress);
	// await meralsL2.deployed();
	// console.log('meralsL2 deployed to:', meralsL2.address);

	await hre.run('verify:verify', {
		address: deployedAddress,
		constructorArguments: [meralManagerAddress],
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
