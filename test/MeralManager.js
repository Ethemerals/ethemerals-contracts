const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Meral Manager', function () {
	let merals;
	let meralsL2;
	let escrowL1;
	let escrowL2;
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

		const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
		escrowL1 = await EscrowL1.deploy(merals.address); // RANDOM ADDRESS
		await escrowL1.deployed();

		// L2 Contracts
		const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
		meralsL2 = await EthemeralsL2.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ELF ADDRESS
		await meralsL2.deployed();

		const EscrowL2 = await ethers.getContractFactory('EscrowOnL2');
		escrowL2 = await EscrowL2.deploy(meralsL2.address); // RANDOM ADDRESS
		await escrowL2.deployed();

		const MeralManager = await ethers.getContractFactory('MeralManager');
		meralManager = await MeralManager.deploy('0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // TODO random register
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

		wilds = await Wilds.deploy(meralsL2.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
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

		// DO ESCROW ON L1
		// set and allow delegates
		await merals.addDelegate(escrowL1.address, true);
		await merals.connect(admin).setAllowDelegates(true);
		await merals.connect(player1).setAllowDelegates(true);
		await merals.connect(player2).setAllowDelegates(true);
		await merals.connect(player3).setAllowDelegates(true);

		for (let i = 1; i <= 10; i++) {
			await escrowL1.transfer(i);
		}
		for (let i = 11; i <= 20; i++) {
			await escrowL1.connect(player1).transfer(i);
		}
		for (let i = 21; i <= 30; i++) {
			await escrowL1.connect(player2).transfer(i);
		}
		for (let i = 31; i <= 40; i++) {
			await escrowL1.connect(player3).transfer(i);
		}

		// NODE BACKEND MIGRATE TO L2
		await meralManager.addGM(admin.address, true);
		// await meralManager.addGM(onsen.address, true);
		await meralManager.addMeralContracts(1, meralsL2.address);

		await meralsL2.setEscrowAddress(admin.address);
		for (let i = 1; i <= 10; i++) {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, admin.address, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd);
			await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}
		for (let i = 11; i <= 20; i++) {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, player1.address, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd);
			await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}
		for (let i = 21; i <= 30; i++) {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, player2.address, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd);
			await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}
		for (let i = 31; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, player3.address, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd);
			await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}

		// set and allow delegates
		// await meralsL2.addDelegate(wilds.address, true);
		// await meralsL2.addDelegate(admin.address, true);
		// await meralsL2.addDelegate(onsen.address, true);
		await meralsL2.addDelegate(meralManager.address, true);
	});

	describe('Meral Manager', function () {
		it('Should change hp', async function () {
			let offset = 300;
			let tokenId = 20;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			let meral = await meralManager.getMeral(type, tokenId);
			let hp = meral.hp;
			let xp = meral.xp;

			await meralManager.changeHP(id, offset, true, 0);
			meral = await meralManager.getMeralById(id);
			let hpAfter = meral.hp;

			expect(hp + offset).to.equal(hpAfter);
			expect(meral.xp).to.equal(xp);

			await meralManager.changeHP(id, 1000, false, 0);
			meral = await meralManager.getMeral(1, tokenId);
			hpAfter = meral.hp;

			expect(hpAfter).to.equal(0);
		});

		it('Should change xp', async function () {
			let offset = 300;
			let tokenId = 1;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			let meral = await meralManager.getMeral(type, tokenId);
			let xp = meral.xp;
			console.log(xp);

			await meralManager.changeXP(id, offset, true);
			meral = await meralManager.getMeral(1, tokenId);
			let xpAfter = meral.xp;

			expect(xp + offset).to.equal(xpAfter);

			await meralManager.changeXP(id, 5000, false);
			meral = await meralManager.getMeral(type, tokenId);
			xpAfter = meral.xp;

			expect(xpAfter).to.equal(0);
		});

		it('Should change stats', async function () {
			let tokenId = 30;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			await meralManager.changeStats(id, 1000, 2000, 3000);
			meral = await meralManager.getMeral(1, tokenId);

			expect(meral.atk).to.equal(1000);
			expect(meral.def).to.equal(2000);
			expect(meral.spd).to.equal(3000);
		});

		it('Should change element', async function () {
			let tokenId = 30;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);

			await meralManager.changeElement(id, 25);
			meral = await meralManager.getMeral(1, tokenId);

			expect(meral.element).to.equal(25);
		});

		it('Should allow meralManager to transfer Merals', async function () {
			let tokenId = 15;
			let type = 1;
			let id = await meralManager.getIdFromType(type, tokenId);
			let meralOwner = await meralsL2.ownerOf(tokenId);
			expect(meralOwner).to.equal(player1.address);

			await meralManager.transfer(player1.address, admin.address, id);
			meralOwner = await meralsL2.ownerOf(tokenId);
			expect(meralOwner).to.equal(admin.address);

			await meralManager.transfer(admin.address, onsen.address, id);
			meralOwner = await meralsL2.ownerOf(tokenId);
			expect(meralOwner).to.equal(onsen.address);

			await meralManager.transfer(onsen.address, wilds.address, id);
			meralOwner = await meralsL2.ownerOf(tokenId);
			expect(meralOwner).to.equal(wilds.address);

			await meralManager.transfer(wilds.address, player1.address, id);
			meralOwner = await meralsL2.ownerOf(tokenId);
			expect(meralOwner).to.equal(player1.address);
		});
	});
});
