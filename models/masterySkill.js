const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('MasterySkill', {
    mastery_position_tier_id: {
      allowNull: false,
      type: Sequelize.INTEGER
    },
    name: {
      allowNull: false,
      type: Sequelize.STRING
    },
    description: {
      allowNull: true,
      type: Sequelize.STRING
    }
  });
};
