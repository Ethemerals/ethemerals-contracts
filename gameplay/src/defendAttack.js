const { Merals, minMaxAvg } = require('../utils');

const merals = Merals();

// let stakeLength = 604800; // 7 days
let stakeLength = 86400; // 1 day
// let stakeLength = 3600; // 1 hour
// let stakeLength = 60; // 1 min
let damage = 0;

// DAIL IT
let defBonus = 1800; // lower more bonus applied min 1100
let ambientDamageRate = 100; // lower more damage applied

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
