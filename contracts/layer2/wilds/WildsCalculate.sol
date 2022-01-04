 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

contract WildsCalculate {

  function calculateChange(uint start, uint end, uint def, uint baseDefence) public pure returns (uint) {
    uint change = end - start;
    uint scaledDefence = safeScale(def, 1600, 50, 150);
    return (change * 1000) / scaledDefence / baseDefence;
  }

  function calculateDefendedDamage(uint atk, uint def) public pure returns(uint) {
    uint scaledDamage = safeScale(atk, 1600, 20, 100);
    uint scaledDefence = safeScale(def, 1600, 0, 50);
    return scaledDefence > scaledDamage ? 0 : scaledDamage - scaledDefence;
  }

  function calculateLightMagicDamage(uint def, uint spd) public pure returns(uint) {
    return safeScale(def, 1600, 0, 80) + safeScale(spd, 1600, 0, 60);
  }

  function calculateDarkMagicDamage(uint atk, uint def) public pure returns(uint) {
    return safeScale(atk, 1600, 20, 100) + safeScale(def, 1600, 0, 50);
  }

  function calculateSpdDamage(uint atk, uint def, uint spd) public pure returns(uint) {
    uint scaledDamage = safeScale(atk, 1600, 10, 50) + safeScale(spd, 1600, 20, 100);
    uint scaledDefence = safeScale(def, 1600, 0, 50);
    return scaledDefence > scaledDamage ? 0 : scaledDamage - scaledDefence;
  }

  function safeScale(uint num, uint inMax, uint outMin, uint outMax) public pure returns(uint) {
    uint scaled = (num * (outMax - outMin)) / inMax + outMin;
    return scaled > outMax ? outMax : scaled;
  }


}
