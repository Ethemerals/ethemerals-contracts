const { Merals, minMaxAvg, getRandomInt } = require('../utils');

const merals = Merals();

// let stakeLength = 604800; // 7 days
let stakeLength = 86400; // 1 day
// let stakeLength = 3600; // 1 hour
// let stakeLength = 60; // 1 min
let damage = 0;

// DAIL IT
let defBonus = 1200; // lower more bonus applied min 1200 - 1700
let ambientDamageRate = 600; // lower more damage applied min 50 - 600

const ambientDamage = () => {
	const change = stakeLength;
	const bonuses = [];
	const changes = [];

	merals.forEach((meral) => {
		const defenceMod = (meral.def * change) / defBonus;
		const finalChange = (change - defenceMod) / ambientDamageRate;

		// console.log(parseInt(finalChange), meral.def, `defence bonus ${((defenceMod / change) * 100).toFixed(2)}`);
		bonuses.push((defenceMod / change) * 100);
		changes.push(parseInt(finalChange));
	});

	console.log('defBonus', minMaxAvg(bonuses));
	console.log('final Changes', minMaxAvg(changes));
};

ambientDamage();

function scale(number, inMin, inMax, outMin, outMax) {
	let scaled = ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
	return scaled > outMax ? outMax : scaled;
	// return ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function scaleSafe(number, inMax, outMin, outMax) {
	let scaled = (number * (outMax - outMin)) / inMax + outMin;
	return scaled > outMax ? outMax : scaled;
}

const addToAmbientDamage = () => {
	let damage = [];
	merals.forEach((meral) => {
		let damageBonus = meral.def / 100;
		// const defenceMod = (meral.def * change) / defBonus;
		// const finalChange = (change - defenceMod) / ambientDamageRate;

		// console.log(parseInt(finalChange), meral.def, `defence bonus ${((defenceMod / change) * 100).toFixed(2)}`);
		// bonuses.push((defenceMod / change) * 100);
		damage.push(parseInt(meral.def));
	});

	console.log('damage', minMaxAvg(damage));
};

addToAmbientDamage();
let num = 2000;
console.log(scale(num, 0, 1600, 60, 118));
console.log((num * 58) / 1600 + 60);

console.log(scale(num, 0, 2000, 400, 1000));
console.log((num * 600) / 2000 + 400);

//single attack
const singleAttack = () => {
	let rawDamage = [];
	let defendedDamage = [];
	let atk = [];
	let def = [];

	merals.forEach((meral) => {
		let randomDefender = merals[getRandomInt(merals.length)];
		let meralAtk = meral.atk * 1.5;
		let meralDef = randomDefender.def * 1.5;
		let scaledDamage = scaleSafe(meralAtk, 2000, 20, 80); // num, inMax, outMin, outMax
		let scaledDefence = scaleSafe(meralDef, 2000, 0, 40);

		console.log(`meralAtk: ${meralAtk}/ meralDef: ${meralDef} for ${scaledDamage - scaledDefence} hp`);

		rawDamage.push(parseInt(scaledDamage));
		defendedDamage.push(parseInt(scaledDamage - scaledDefence));
		atk.push(parseInt(meralAtk));
		def.push(parseInt(meralDef));
	});

	console.log('rawDamage', minMaxAvg(rawDamage));
	console.log('defendedDamage', minMaxAvg(defendedDamage));
	console.log('meralAttack', minMaxAvg(atk));
	console.log('meralDefence', minMaxAvg(def));
};

// singleAttack();

const staminaChange = () => {
	const change = stakeLength;
	const modifiedSpeed = [];
	const spd = [];
	const changes = [];

	merals.forEach((meral) => {
		const meralSpd = meral.spd;
		const scaledSpeed = scaleSafe(meralSpd, 1600, 2, 10);
		const finalChange = (change / 3600) * scaledSpeed;

		// console.log('finalChange', meralSpd, finalChange);

		changes.push(parseInt(finalChange));
		spd.push(parseInt(meralSpd));
		modifiedSpeed.push(parseInt(scaledSpeed));
	});

	console.log('spd', minMaxAvg(spd));
	console.log('scaledSpeed', minMaxAvg(modifiedSpeed));
	console.log('stamina', minMaxAvg(changes));
};

staminaChange();

// console.log((num * 1600) / 2000);

// bdef + 5 - 5;

// one day

// 1 defender 5 attackers max attack
// final Changes [ 703, 1619, 1296.066 ]

// 5 defender 1 attackers max attack
// final Changes [ 23, 131, 92.592 ]

// full slots
// damage [ 107, 1008, 424.44 ]

// 1 on 1
// [ 70, 161, 129.147 ]
