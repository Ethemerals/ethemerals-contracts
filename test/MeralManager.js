// const { expect } = require('chai');
// const { ethers } = require('hardhat');
// const addressZero = '0x0000000000000000000000000000000000000000';

// describe('Meral Manager', function () {
// 	let merals;
// 	let wilds;
// 	let admin;
// 	let player1;
// 	let player2;
// 	let player3;
// 	let [min, hour, day, week] = [60, 3600, 86400, 604800];

// 	beforeEach(async function () {
// 		[admin, player1, player2, player3] = await ethers.getSigners();

// 		const Ethemerals = await ethers.getContractFactory('Ethemerals');
// 		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ADDRESS
// 		await merals.deployed();

// 		const MeralManager = await ethers.getContractFactory('MeralManager');
// 		meralManager = await MeralManager.deploy('0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // random
// 		await meralManager.deployed();

// 		const WildsAdminActions = await ethers.getContractFactory('WildsAdminActions');
// 		wildsAdminActions = await WildsAdminActions.deploy();
// 		await wildsAdminActions.deployed();

// 		const WildsStaking = await ethers.getContractFactory('WildsStaking');
// 		wildsStaking = await WildsStaking.deploy();
// 		await wildsStaking.deployed();

// 		const WildsActions = await ethers.getContractFactory('WildsActions');
// 		wildsActions = await WildsActions.deploy();
// 		await wildsActions.deployed();

// 		const Wilds = await ethers.getContractFactory('Wilds');

// 		wilds = await Wilds.deploy(merals.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
// 		await wilds.deployed();

// 		const Onsen = await ethers.getContractFactory('Onsen');
// 		onsen = await Onsen.deploy(merals.address, meralManager.address);
// 		await onsen.deployed();

// 		// mint merals
// 		await merals.mintReserve();
// 		await merals.setPrice(0);
// 		await merals.setMaxMeralIndex(1000);

// 		await network.provider.send('evm_increaseTime', [day]);
// 		await network.provider.send('evm_mine');

// 		await merals.mintMeralsAdmin(player1.address, 10); // ID starts at 11
// 		await merals.mintMeralsAdmin(player2.address, 10); // ID starts at 21
// 		await merals.mintMeralsAdmin(player3.address, 10); // ID starts at 31

// 		// set and allow delegates
// 		await merals.addDelegate(wilds.address, true);
// 		await merals.addDelegate(admin.address, true);
// 		await merals.addDelegate(onsen.address, true);
// 		await merals.addDelegate(meralManager.address, true);
// 		await merals.setAllowDelegates(true);
// 		await merals.connect(player1).setAllowDelegates(true);
// 		await merals.connect(player2).setAllowDelegates(true);
// 		await merals.connect(player3).setAllowDelegates(true);

// 		await meralManager.addGM(admin.address, true);
// 		// await meralManager.addGM(onsen.address, true);
// 		await meralManager.addMeralContracts(0, merals.address);
// 	});

// 	const migrateOGMerals = async () => {
// 		for (let i = 1; i < 30; i++) {
// 			let meral = await merals.getEthemeral(i);
// 			let element = 1;
// 			let subclass = 4;
// 			await meralManager.registerOGMeral(i, meral.score, meral.rewards, meral.atk, meral.def, meral.spd, element, subclass);
// 		}
// 	};

// 	describe('Meral Manager', function () {
// 		it('Should register OG Meral', async function () {
// 			let meral = await merals.getEthemeral(1);

// 			let id = 20;
// 			let element = 1;
// 			let subclass = 4;

// 			await meralManager.registerOGMeral(id, meral.score, meral.rewards, meral.atk, meral.def, meral.spd, element, subclass);
// 			let meralMigrated = await meralManager.getMeral(0, id);

// 			expect(meralMigrated.hp).to.equal(meral.score);
// 			expect(meralMigrated.xp).to.equal(meral.rewards);
// 			expect(meralMigrated.atk).to.equal(meral.atk);
// 			expect(meralMigrated.def).to.equal(meral.def);
// 			expect(meralMigrated.spd).to.equal(meral.spd);
// 			expect(meralMigrated.maxHp).to.equal(1000);
// 			expect(meralMigrated.maxStamina).to.equal(100);
// 			expect(meralMigrated.element).to.equal(element);
// 			expect(meralMigrated.subclass).to.equal(subclass);
// 		});

// 		it('Should change hp', async function () {
// 			await migrateOGMerals();
// 			let offset = 300;
// 			let tokenId = 20;

// 			let meral = await meralManager.getMeral(0, tokenId);
// 			let hp = meral.hp;
// 			let xp = meral.xp;

// 			await meralManager.changeHP(0, tokenId, offset, true, 0);
// 			meral = await meralManager.getMeral(0, tokenId);
// 			let hpAfter = meral.hp;

// 			expect(hp + offset).to.equal(hpAfter);
// 			expect(meral.xp).to.equal(xp);

// 			await meralManager.changeHP(0, tokenId, 1000, false, 0);
// 			meral = await meralManager.getMeral(0, tokenId);
// 			hpAfter = meral.hp;

// 			expect(hpAfter).to.equal(0);
// 		});

// 		it('Should change xp', async function () {
// 			await migrateOGMerals();
// 			let offset = 300;
// 			let tokenId = 1;

// 			let meral = await meralManager.getMeral(0, tokenId);
// 			let xp = meral.xp;
// 			console.log(xp);

// 			await meralManager.changeXP(0, tokenId, offset, true);
// 			meral = await meralManager.getMeral(0, tokenId);
// 			let xpAfter = meral.xp;

// 			expect(xp + offset).to.equal(xpAfter);

// 			await meralManager.changeXP(0, tokenId, 5000, false);
// 			meral = await meralManager.getMeral(0, tokenId);
// 			xpAfter = meral.xp;

// 			expect(xpAfter).to.equal(0);
// 		});

// 		it('Should change stats', async function () {
// 			await migrateOGMerals();

// 			let tokenId = 30;

// 			await meralManager.changeStats(0, tokenId, 1000, 2000, 3000);
// 			meral = await meralManager.getMeral(0, tokenId);

// 			expect(meral.atk).to.equal(1000);
// 			expect(meral.def).to.equal(2000);
// 			expect(meral.spd).to.equal(3000);
// 		});

// 		it('Should change element', async function () {
// 			await migrateOGMerals();

// 			let tokenId = 30;

// 			await meralManager.changeElement(0, tokenId, 25);
// 			meral = await meralManager.getMeral(0, tokenId);

// 			expect(meral.element).to.equal(25);
// 		});

// 		it.only('Should transfer Merals', async function () {
// 			await migrateOGMerals();

// 			let tokenId = 15;
// 			let meralOwner = await merals.ownerOf(tokenId);
// 			expect(meralOwner).to.equal(player1.address);

// 			await meralManager.transfer(0, player1.address, admin.address, tokenId);
// 			meralOwner = await merals.ownerOf(tokenId);
// 			expect(meralOwner).to.equal(admin.address);

// 			await meralManager.transfer(0, admin.address, onsen.address, tokenId);
// 			meralOwner = await merals.ownerOf(tokenId);
// 			expect(meralOwner).to.equal(onsen.address);

// 			await meralManager.transfer(0, onsen.address, wilds.address, tokenId);
// 			meralOwner = await merals.ownerOf(tokenId);
// 			expect(meralOwner).to.equal(wilds.address);

// 			// await meralManager.transfer(0, wilds.address, player1.address, tokenId);
// 			// meralOwner = await merals.ownerOf(tokenId);
// 			// expect(meralOwner).to.equal(player1.address);
// 		});
// 	});
// });
