const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt, getIdFromType } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Meral Manager', function () {
	let merals;
	let meralManager;
	let wilds;
	let onsen;
	let admin;
	let player1;
	let player2;
	let player3;
	let [min, hour, day, week] = [60, 3600, 86400, 604800];
	let allMeralStats = MeralsL1Data();

	beforeEach(async function () {
		[admin, player1, player2, player3] = await ethers.getSigners();

		// L1 Contracts
		const Ethemerals = await ethers.getContractFactory('Ethemerals');
		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ELF ADDRESS
		await merals.deployed();

		// L2 Contracts
		const MeralManager = await ethers.getContractFactory('MeralManager');
		meralManager = await MeralManager.deploy();
		await meralManager.deployed();

		// L2 Wilds Contracts
		const WildsAdminActions = await ethers.getContractFactory('WildsAdminActions');
		wildsAdminActions = await WildsAdminActions.deploy();
		await wildsAdminActions.deployed();

		const WildsStaking = await ethers.getContractFactory('WildsStaking');
		wildsStaking = await WildsStaking.deploy();
		await wildsStaking.deployed();

		const WildsActions = await ethers.getContractFactory('WildsActions');
		wildsActions = await WildsActions.deploy();
		await wildsActions.deployed();

		const Wilds = await ethers.getContractFactory('Wilds');

		wilds = await Wilds.deploy(meralManager.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
		await wilds.deployed();

		const Onsen = await ethers.getContractFactory('Onsen');
		onsen = await Onsen.deploy(meralManager.address);
		await onsen.deployed();

		// L1 mint merals
		await merals.mintReserve();
		await merals.setPrice(0);
		await merals.setMaxMeralIndex(1000);

		await network.provider.send('evm_increaseTime', [day]);
		await network.provider.send('evm_mine');

		await merals.mintMeralsAdmin(player1.address, 10); // ID starts at 11
		await merals.mintMeralsAdmin(player2.address, 10); // ID starts at 21
		await merals.mintMeralsAdmin(player3.address, 10); // ID starts at 31

		// add admin as delegate and game master BRIDGE ADMIN
		await meralManager.addValidators(admin.address, true);

		await meralManager.addGM(admin.address, true);

		// NODE BACKEND MINT (MIGRATE) TO L2

		// // set and allow delegates
		await meralManager.addGM(onsen.address, true);
		await meralManager.addGM(wilds.address, true);
	});

	const macroRegisterMerals = async () => {
		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			if (i <= 10) {
				await meralManager.registerMeral(merals.address, i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			} else if (i > 10 && i <= 20) {
				await meralManager
					.connect(player1)
					.registerMeral(merals.address, i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			} else if (i > 20 && i <= 30) {
				await meralManager
					.connect(player2)
					.registerMeral(merals.address, i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			} else if (i > 30) {
				await meralManager
					.connect(player3)
					.registerMeral(merals.address, i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			}
		}
	};

	const macroMintMerals = async () => {
		for (let i = 1; i <= 40; i++) {
			await meralManager.mintMeral(getIdFromType(1, i));
		}
	};

	const macroBurnMerals = async () => {
		for (let i = 1; i <= 40; i++) {
			await meralManager.burn(getIdFromType(1, i));
		}
	};

	describe('Meral Manager', function () {
		it('Should Register and Mint Merals', async function () {
			await meralManager.registerContract(merals.address);
			let type = await meralManager.getTypeByContract(merals.address);
			expect(type).to.equal(1);

			await meralManager.registerContract(player1.address); // dummy address
			type = await meralManager.getTypeByContract(player1.address);
			expect(type).to.equal(2);

			await macroRegisterMerals();
			for (let i = 1; i <= 40; i++) {
				let meral = await meralManager.getMeralByType(1, i);
				expect(parseInt(meral.status)).to.equal(1);
			}

			await macroMintMerals();
			for (let i = 1; i <= 40; i++) {
				let meral = await meralManager.getMeralByType(1, i);
				expect(parseInt(meral.status)).to.equal(2);
			}

			await macroBurnMerals();
			for (let i = 1; i <= 40; i++) {
				let meral = await meralManager.getMeralByType(1, i);
				expect(parseInt(meral.status)).to.equal(0);
				let exists = await meralManager.exists(getIdFromType(1, i));
				expect(exists).to.equal(false);
			}

			// REVERTS
			await expect(meralManager.registerContract(merals.address)).to.be.revertedWith('already registered');
			await expect(meralManager.mintMeral(getIdFromType(1, 1))).to.be.revertedWith('need pending');
			await expect(meralManager.registerMeral(player3.address, 1, 1000, 3000, 125, 125, 125, 8, 1)).to.be.revertedWith('no contract');

			await macroRegisterMerals();
			await expect(meralManager.registerMeral(merals.address, 1, 1000, 3000, 125, 125, 125, 8, 1)).to.be.revertedWith('already registered');

			await macroMintMerals();

			// OWNERSHIP OF MERALS
			let meralId = getIdFromType(1, 11);
			let meralOwner = await meralManager.ownerOf(meralId);
			await expect(meralOwner).to.equal(player1.address);
			let meralInternalOwner = await meralManager.meralOwners(meralId);
			await expect(meralInternalOwner).to.equal(player1.address);

			await meralManager.changeMeralOwnership(meralId, player2.address);
			meralInternalOwner = await meralManager.meralOwners(meralId);
			await expect(meralInternalOwner).to.equal(player2.address);

			// INTERNAL TRANSFERS
			await meralManager.transfer(player1.address, player2.address, meralId);
			meralOwner = await meralManager.ownerOf(meralId);
			await expect(meralOwner).to.equal(player2.address);
		});

		it('Should change hp', async function () {
			await meralManager.registerContract(merals.address);
			await macroRegisterMerals();
			await macroMintMerals();

			await meralManager.addGM(admin.address, true);
			let offset = 300;
			let tokenId = 20;
			let type = await meralManager.getTypeByContract(merals.address);
			let id = getIdFromType(type, tokenId);
			let meral = await meralManager.getMeralById(id);
			let hp = meral.hp;
			let xp = meral.xp;
			await meralManager.changeHP(id, offset, true);
			meral = await meralManager.getMeralById(id);
			let hpAfter = meral.hp;
			expect(hp + offset).to.equal(hpAfter);
			expect(meral.xp).to.equal(xp);
			await meralManager.changeHP(id, 1000, false);
			meral = await meralManager.getMeralByType(1, tokenId);
			hpAfter = meral.hp;
			expect(hpAfter).to.equal(0);
		});

		it('Should change xp', async function () {
			await meralManager.registerContract(merals.address);
			await macroRegisterMerals();
			await macroMintMerals();

			await meralManager.addGM(admin.address, true);
			let offset = 300;
			let tokenId = 1;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			let meral = await meralManager.getMeralByType(type, tokenId);
			let xp = meral.xp;
			console.log(xp);

			await meralManager.changeXP(id, offset, true);
			meral = await meralManager.getMeralByType(1, tokenId);
			let xpAfter = meral.xp;

			expect(xp + offset).to.equal(xpAfter);

			await meralManager.changeXP(id, 5000, false);
			meral = await meralManager.getMeralByType(type, tokenId);
			xpAfter = meral.xp;

			expect(xpAfter).to.equal(0);
		});

		it('Should change elf', async function () {
			await meralManager.registerContract(merals.address);
			await macroRegisterMerals();
			await macroMintMerals();

			await meralManager.addGM(admin.address, true);
			let offset = 300;
			let tokenId = 1;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			let meral = await meralManager.getMeralByType(type, tokenId);
			let elf = meral.elf;
			console.log(elf);

			await meralManager.changeELF(id, offset, true);
			meral = await meralManager.getMeralByType(1, tokenId);
			let elfAfter = meral.elf;

			expect(elf + offset).to.equal(elfAfter);

			// await meralManager.changeELF(id, 5000, false);
			// meral = await meralManager.getMeralByType(type, tokenId);
			// elfAfter = meral.elf;

			// expect(elfAfter).to.equal(0);
		});

		it('Should change stats', async function () {
			await meralManager.registerContract(merals.address);
			await macroRegisterMerals();
			await macroMintMerals();

			await meralManager.addGM(admin.address, true);
			let tokenId = 30;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			await meralManager.changeStats(id, 1000, 2000, 3000);
			meral = await meralManager.getMeralByType(1, tokenId);

			expect(meral.atk).to.equal(1000);
			expect(meral.def).to.equal(2000);
			expect(meral.spd).to.equal(3000);
		});

		it('Should change element', async function () {
			await meralManager.registerContract(merals.address);
			await macroRegisterMerals();
			await macroMintMerals();

			await meralManager.addGM(admin.address, true);
			let tokenId = 30;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			await meralManager.changeElement(id, 25);
			meral = await meralManager.getMeralByType(1, tokenId);

			expect(meral.element).to.equal(25);
		});

		it('Should allow meralManager to transfer Merals', async function () {
			await meralManager.registerContract(merals.address);
			await macroRegisterMerals();
			await macroMintMerals();

			await meralManager.addGM(admin.address, true);
			let tokenId = 9;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			meralOwner = await meralManager.ownerOf(id);
			expect(meralOwner).to.equal(admin.address);

			await meralManager.transfer(admin.address, onsen.address, id);
			meralOwner = await meralManager.ownerOf(id);
			expect(meralOwner).to.equal(onsen.address);

			await meralManager.transfer(onsen.address, wilds.address, id);
			meralOwner = await meralManager.ownerOf(id);
			expect(meralOwner).to.equal(wilds.address);

			await meralManager.transfer(wilds.address, player1.address, id);
			meralOwner = await meralManager.ownerOf(id);
			expect(meralOwner).to.equal(player1.address);
		});
	});
});
