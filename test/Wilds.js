const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt, getIdFromType } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Wilds', function () {
	let merals;
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

	const makeRaid = async () => {
		const landId = 1;
		for (let i = 1; i <= 5; i++) {
			let id = await getOGMeralId(i);
			await meralManager.changeHP(id, 1000, true);
			await wilds.stake(landId, id, 1);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}

		for (let i = 11; i <= 15; i++) {
			let id = getOGMeralId(i);
			await wilds.connect(player1).stake(landId, id, 4);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}
	};

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

		// add admin as delegate and game master
		await meralManager.addValidators(admin.address, true);
		await meralManager.addGM(admin.address, true);
		// register ethemeral contract address
		await meralManager.registerContract(merals.address);

		// // set and allow delegates
		await meralManager.addGM(onsen.address, true);
		await meralManager.addGM(wilds.address, true);

		// REGISTER MERALS
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

		// MINT MERALS
		for (let i = 1; i <= 40; i++) {
			await meralManager.mintMeral(getIdFromType(1, i));
		}
	});

	describe('DEPLOY AND ADMIN', function () {
		it('Should set the right admin', async function () {
			expect(await wilds.admin()).to.equal(admin.address);
		});

		it('Should do admin functions', async function () {
			await expect(wilds.connect(player1).setStaminas([1])).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).editLand(1, 100, 10, 1000, 1)).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).emergencyUnstake(1)).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).setPaused(true)).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).setAdmin(player1.address)).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).setAddresses(player1.address, player1.address)).to.be.revertedWith('admin only');
			await wilds.editLand(1, 2000, 100, 1000, 1);
			let land = await wilds.landPlots(1);
			expect(land.remainingELFx).to.equal(2000);
			expect(land.emissionRate).to.equal(100);
			expect(land.baseDefence).to.equal(1000);
			expect(land.raidStatus).to.equal(1);

			await makeRaid();
			let id = await getOGMeralId(1);
			let stake = await wilds.stakes(id);
			expect(stake.owner).to.equal(admin.address);
			await wilds.emergencyUnstake(1);
			stake = await wilds.stakes(id);
			expect(stake.owner).to.equal(addressZero);
			let slots = await wilds.getSlots(1, 1);
			expect(slots.length).to.equal(0);

			let pause = await wilds.paused();
			expect(pause).to.equal(false);
			await wilds.setPaused(true);
			pause = await wilds.paused();
			expect(pause).to.equal(true);
			await expect(wilds.stake(1, id, 2)).to.be.revertedWith('paused');
			await wilds.setPaused(false);
			pause = await wilds.paused();
			expect(pause).to.equal(false);

			let stakingValue = await wilds.staking();
			let actionsValue = await wilds.actions();
			expect(stakingValue).to.equal(wildsStaking.address);
			expect(actionsValue).to.equal(wildsActions.address);
			await wilds.setAddresses(player1.address, player2.address);
			stakingValue = await wilds.staking();
			actionsValue = await wilds.actions();
			expect(stakingValue).to.equal(player1.address);
			expect(actionsValue).to.equal(player2.address);

			let adminValue = await wilds.admin();
			expect(adminValue).to.equal(admin.address);
			await wilds.setAdmin(player1.address);
			adminValue = await wilds.admin();
			expect(adminValue).to.equal(player1.address);
		});

		it('Should add 6 lands and not more', async function () {
			let land6 = await wilds.landPlots(6);
			expect(land6.remainingELFx.toString()).to.not.equal('0');

			let land7 = await wilds.landPlots(7);
			expect(land7.remainingELFx.toString()).to.equal('0');
		});

		it('Should add land', async function () {
			let remainingELFx = 10000;
			let emissionRate = 20;
			let baseDefence = 1800;
			await wilds.addLand(7, 10, 10, [3, 4, 5], [4, 5, 6], remainingELFx, emissionRate, baseDefence);
			let land = await wilds.landPlots(7);

			expect(land.baseDefence).to.equal(baseDefence);
			expect(land.emissionRate).to.equal(emissionRate);
			expect(land.remainingELFx).to.equal(remainingELFx);
		});
	});
});
