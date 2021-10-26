const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('MasteryToken', {
    user_id: {
      allowNull: false,
      type: Sequelize.BIGINT
    },
    mastery_tier_id: {
      allowNull: false,
      type: Sequelize.INTEGER
    }
  }, {
    paranoid: true
  });
};
