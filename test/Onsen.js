const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Onsen', function () {
	let merals;
	let meralsL2;
	let escrowL1;
	let meralManager;
	let wilds;
	let onsen;
	let admin;
	let player1;
	let player2;
	let player3;
	let [min, hour, day, week] = [60, 3600, 86400, 604800];
	let allMeralStats = MeralsL1Data();

	const getOGMeralId = async (tokenId) => {
		let type = 1;
		let id = await meralManager.getIdFromType(type, tokenId);
		return id;
	};

	beforeEach(async function () {
		[admin, player1, player2, player3] = await ethers.getSigners();

		// L1 Contracts
		const Ethemerals = await ethers.getContractFactory('Ethemerals');
		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ELF ADDRESS
		await merals.deployed();

		const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
		escrowL1 = await EscrowL1.deploy();
		await escrowL1.deployed();

		// L2 Contracts
		const MeralManager = await ethers.getContractFactory('MeralManager');
		meralManager = await MeralManager.deploy(); // TODO random register
		await meralManager.deployed();

		const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
		meralsL2 = await EthemeralsL2.deploy(meralManager.address);
		await meralsL2.deployed();

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

		// set approvals for bridge
		await merals.connect(admin).setApprovalForAll(escrowL1.address, true);
		await merals.connect(player1).setApprovalForAll(escrowL1.address, true);
		await merals.connect(player2).setApprovalForAll(escrowL1.address, true);
		await merals.connect(player3).setApprovalForAll(escrowL1.address, true);

		// register Meral Addresses
		await escrowL1.addContract(1, merals.address);
		await meralManager.addMeralContract(1, meralsL2.address);

		// add admin as delegate and game master BRIDGE ADMIN
		await meralsL2.addDelegate(admin.address, true);
		await meralManager.addGM(admin.address, true);

		// DO ESCROW ON L1
		let type = 1;
		for (let i = 1; i <= 10; i++) {
			await escrowL1.deposit(type, i);
		}
		for (let i = 11; i <= 20; i++) {
			await escrowL1.connect(player1).deposit(type, i);
		}
		for (let i = 21; i <= 30; i++) {
			await escrowL1.connect(player2).deposit(type, i);
		}
		for (let i = 31; i <= 40; i++) {
			await escrowL1.connect(player3).deposit(type, i);
		}

		// NODE BACKEND MINT (MIGRATE) TO L2

		// // set and allow delegates
		await meralManager.addGM(onsen.address, true);
		await meralManager.addGM(wilds.address, true);
		await meralManager.addGM(meralsL2.address, true);

		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}

		// ADMIN
		for (let i = 1; i <= 40; i++) {
			let deposits = await escrowL1.allDeposits(getOGMeralId(i));
			let _id = await escrowL1.getIdFromType(type, i);
			await meralManager.releaseFromPortal(deposits, _id);
		}
	});

	function safeScale(number, inMax, outMin, outMax) {
		let scaled = (number * (outMax - outMin)) / inMax + outMin;
		return scaled > outMax ? outMax : scaled;
	}

	const getXp = (now, start, mod) => {
		return parseInt((now - start) / mod);
	};

	const getElf = (now, start, mod) => {
		return parseInt((now - start) / mod);
	};

	const gethp = (now, start, stat, mod) => {
		let scaled = safeScale(stat, 2000, 14, 22);
		return parseInt(((now - start) * parseInt(scaled)) / mod);
	};

	describe('Onsen hp and xp gains', function () {
		it('should relax and gain', async function () {
			let type = 1;
			let tokenId = 1;
			let id = await meralManager.getIdFromType(type, tokenId);
			let meral = await meralManager.getMeralById(id);
			let hp = meral.hp;
			let xp = meral.xp;
			let elf = meral.elf;

			let xpMod = await onsen.xpMod();
			let hpMod = await onsen.hpMod();
			let elfMod = await onsen.elfMod();

			await onsen.stake(id);
			let blockNumBefore = await ethers.provider.getBlockNumber();
			let blockBefore = await ethers.provider.getBlock(blockNumBefore);
			let _start = blockBefore.timestamp;

			await network.provider.send('evm_increaseTime', [day * 2]);
			await network.provider.send('evm_mine');

			blockNumBefore = await ethers.provider.getBlockNumber();
			blockBefore = await ethers.provider.getBlock(blockNumBefore);
			let _now = blockBefore.timestamp;

			let change = await onsen.calculateChange(id);

			await onsen.unstake(id);
			let value = await meralManager.getMeral(type, tokenId);

			expect(value.xp - xp).to.equal(getXp(_now, _start, xpMod));
			expect(parseInt(value.elf) - elf).to.equal(getElf(_now, _start, elfMod));
			expect(value.hp - hp).to.equal(gethp(_now, _start, value.spd, hpMod));

			xpMod = 3600;
			hpMod = 5000;
			elfMod = 5000;
			await onsen.setMods(hpMod, xpMod, elfMod);
			await onsen.stake(id);
			await expect(onsen.connect(player1).setMods(100, 100, 100)).to.be.revertedWith('admin only');
			await expect(onsen.connect(player1).unstake(id)).to.be.revertedWith('owner only');
			await expect(onsen.connect(player1).stake(id)).to.be.revertedWith('ERC721: transfer of token that is not own');

			await network.provider.send('evm_increaseTime', [day * 2]);
			await network.provider.send('evm_mine');

			// change = await onsen.calculateChange(id);
			// console.log(change);
			// await onsen.unstake(id);
			// value = await meralManager.getMeralById(id);
			// console.log(value);
		});
	});
});
