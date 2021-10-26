const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('MasteryPositionTier', {
    mastery_position_id: {
      allowNull: false,
      type: Sequelize.INTEGER
    },
    mastery_tier_id: {
      allowNull: false,
      type: Sequelize.INTEGER
    }
  }, {
    tableName: 'mastery_positions_tiers'
  });
};
