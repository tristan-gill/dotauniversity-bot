const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('UserMasteryPositionTier', {
    user_id: {
      allowNull: false,
      type: Sequelize.BIGINT
    },
    mastery_position_tier_id: {
      allowNull: false,
      type: Sequelize.INTEGER
    }
  }, {
    tableName: 'users_mastery_positions_tiers'
  });
};
