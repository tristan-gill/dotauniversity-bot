const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('UserTip', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT
    },
    current_tips: {
      allowNull: false,
      defaultValue: 0,
      type: Sequelize.INTEGER
    },
    received_tips: {
      allowNull: false,
      defaultValue: 0,
      type: Sequelize.INTEGER
    }
  });
};
