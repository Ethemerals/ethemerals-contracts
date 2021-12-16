const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('IntoTheWilds', function () {
	let merals;
	let wilds;
	let admin;
	let player1;
	let player2;
	let player3;

	beforeEach(async function () {
		[admin, player1, player2, player3] = await ethers.getSigners();

		const Ethemerals = await ethers.getContractFactory('Ethemerals');
		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ADDRESS
		await merals.deployed();

		const IntoTheWilds = await ethers.getContractFactory('IntoTheWilds');
		wilds = await IntoTheWilds.deploy(merals.address);
		await wilds.deployed();

		// mint merals
		await merals.mintReserve();
		await merals.setPrice(0);
		await merals.setMaxMeralIndex(1000);

		await merals.mintMeralsAdmin(player1.address, 10); // ID starts at 11
		await merals.mintMeralsAdmin(player2.address, 10); // ID starts at 21
		await merals.mintMeralsAdmin(player3.address, 10); // ID starts at 31

		// set and allow delegates
		await merals.addDelegate(wilds.address, true);
		await merals.setAllowDelegates(true);
		await merals.connect(player1).setAllowDelegates(true);
		await merals.connect(player2).setAllowDelegates(true);
		await merals.connect(player3).setAllowDelegates(true);
	});

	// You can nest describe calls to create subsections.
	describe('Deployment', function () {
		// `it` is another Mocha function. This is the one you use to define your
		// tests. It receives the test name, and a callback function.

		// If the callback function is async, Mocha will `await` it.
		it('Should set the right admin', async function () {
			expect(await wilds.admin()).to.equal(admin.address);
		});

		it('Should add 6 lands and not more', async function () {
			let land6 = await wilds.landPlots(6);
			expect(land6.remainingELFx.toString()).to.not.equal('0');

			let land7 = await wilds.landPlots(7);
			expect(land7.remainingELFx.toString()).to.equal('0');
		});
	});

	describe('Staking and Unstaking', function () {
		it('Should stake into land1', async function () {
			await wilds.stake(1, 10, 1);
			expect(await merals.ownerOf(10)).to.equal(wilds.address);

			await wilds.unstake(10);
			expect(await merals.ownerOf(10)).to.equal(admin.address);

			await expect(wilds.stake(1, 11, 1)).to.be.revertedWith('ERC721: transfer of token that is not own');
			await wilds.connect(player1).stake(1, 11, 1);
			expect(await merals.ownerOf(11)).to.equal(wilds.address);

			await expect(wilds.connect(player2).unstake(11)).to.be.revertedWith('owner only');
			await wilds.connect(player1).unstake(11);
			expect(await merals.ownerOf(11)).to.equal(player1.address);

			// // admin unstake
			await wilds.connect(player1).stake(1, 20, 1);
			await wilds.unstake(20);
			expect(await merals.ownerOf(20)).to.equal(player1.address);
		});

		it('Should stake into land1 but not more then maxSlot', async function () {
			let slots = 5;
			await wilds.setMaxSlots(slots);
			await wilds.stake(1, 1, 1);
			await wilds.stake(1, 2, 1);
			await wilds.stake(1, 3, 1);
			await wilds.stake(1, 4, 1);
			await wilds.stake(1, 5, 1);

			await expect(wilds.stake(1, 5, 1)).to.be.revertedWith('already staked');
			await expect(wilds.stake(1, 6, 1)).to.be.revertedWith('full');

			slots = 6;
			await wilds.setMaxSlots(slots);
			await wilds.stake(1, 6, 1);
			await wilds.stake(1, 7, 2);
		});
	});
});
