// const { expect } = require('chai');
// const { ethers } = require('hardhat');
// const addressZero = '0x0000000000000000000000000000000000000000';

// describe('Wilds XP', function () {
// 	let merals;
// 	let ethemeralsBurner;
// 	let admin;
// 	let player1;
// 	let player2;
// 	let player3;
// 	let [min, hour, day, week] = [60, 3600, 86400, 604800];

// 	beforeEach(async function () {
// 		[admin, player1, player2, player3] = await ethers.getSigners();

// 		// L1 Contracts
// 		const Ethemerals = await ethers.getContractFactory('Ethemerals');
// 		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ELF ADDRESS
// 		await merals.deployed();

// 		const EthemeralsBurner = await ethers.getContractFactory('EthemeralsBurner');
// 		ethemeralsBurner = await EthemeralsBurner.deploy(merals.address);
// 		await ethemeralsBurner.deployed();

// 		// L1 mint merals
// 		await merals.mintReserve();
// 		await merals.setPrice(0);
// 		await merals.setMaxMeralIndex(50);

// 		await network.provider.send('evm_increaseTime', [day]);
// 		await network.provider.send('evm_mine');

// 		await merals.mintMeralsAdmin(player1.address, 10); // ID starts at 11
// 		await merals.mintMeralsAdmin(player2.address, 10); // ID starts at 21
// 		await merals.mintMeralsAdmin(player3.address, 10); // ID starts at 31

// 		await merals.transferOwnership(ethemeralsBurner.address);
// 	});

// 	describe('Should run Ethemerals Manager functions', function () {
// 		it('Should set props', async function () {
// 			let burnableLimit = 100;
// 			let maxTokenId = 1000;
// 			await ethemeralsBurner.setProps(burnableLimit, maxTokenId);
// 			let v1 = await ethemeralsBurner.burnableLimit();
// 			let v2 = await ethemeralsBurner.maxTokenId();
// 			expect(v1).to.equal(burnableLimit);
// 			expect(v2).to.equal(maxTokenId);

// 			await ethemeralsBurner.setBurnAddress(player1.address);
// 			let burnAddress = await ethemeralsBurner.burnAddress();
// 			expect(burnAddress).to.equal(player1.address);
// 		});

// 		it('Should Transfer Ownership', async function () {
// 			let owner = await merals.owner();
// 			expect(owner).to.equal(ethemeralsBurner.address);

// 			await ethemeralsBurner.transferCoreOwnership(admin.address);
// 			owner = await merals.owner();
// 			expect(owner).to.equal(admin.address);

// 			await merals.setPrice(1000);
// 		});

// 		it('Should burn and mint', async function () {
// 			let supply = await merals.totalSupply();
// 			console.log(supply, 'supply');
// 			// ID starts at 11 p1
// 			// ID starts at 21 p2
// 			// ID starts at 31 p3
// 			await ethemeralsBurner.setProps(5, 20);
// 			await ethemeralsBurner.setBurnAddress(player3.address);
// 			let burnAddress = await ethemeralsBurner.burnAddress();
// 			let meralsToBurn = [11, 12, 13, 14, 15];

// 			for (let i = 0; i < meralsToBurn.length; i++) {
// 				await merals.connect(player1)['safeTransferFrom(address,address,uint256)'](player1.address, ethemeralsBurner.address, meralsToBurn[i]);
// 			}

// 			for (let i = 0; i < meralsToBurn.length; i++) {
// 				let ownerOf = await merals.ownerOf(meralsToBurn[i]);
// 				expect(ownerOf).to.equal(burnAddress);
// 			}

// 			// CHECK OWNERSHIP NEW MINTS
// 			for (let i = 41; i <= 45; i++) {
// 				let ownerOf = await merals.ownerOf(i);
// 				expect(ownerOf).to.equal(player1.address);
// 			}

// 			// COUNT REACHED
// 			await expect(merals.connect(player1)['safeTransferFrom(address,address,uint256)'](player1.address, ethemeralsBurner.address, 16)).to.be.revertedWith('max reached');

// 			// INCREASE COUNT
// 			await ethemeralsBurner.setProps(10, 20);
// 			await expect(merals.connect(player2)['safeTransferFrom(address,address,uint256)'](player2.address, ethemeralsBurner.address, 21)).to.be.revertedWith('max gen');

// 			// INCREASE GEN
// 			await ethemeralsBurner.setProps(10, 50);
// 			await merals.connect(player2)['safeTransferFrom(address,address,uint256)'](player2.address, ethemeralsBurner.address, 21);
// 			let ownerOf = await merals.ownerOf(21);
// 			expect(ownerOf).to.equal(burnAddress);

// 			for (let i = 46; i <= 46; i++) {
// 				let ownerOf = await merals.ownerOf(i);
// 				expect(ownerOf).to.equal(player2.address);
// 			}
// 		});
// 	});
// });
