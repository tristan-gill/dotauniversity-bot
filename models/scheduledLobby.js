const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('ScheduledLobby', {
    min: {
      allowNull: false,
      type: Sequelize.STRING
    },
    hour: {
      allowNull: false,
      type: Sequelize.STRING
    },
    day_of_month: {
      allowNull: false,
      type: Sequelize.STRING
    },
    month: {
      allowNull: false,
      type: Sequelize.STRING
    },
    day_of_week: {
      allowNull: false,
      type: Sequelize.STRING
    },
    tier: {
      allowNull: false,
      type: Sequelize.STRING
    },
    region: {
      allowNull: false,
      type: Sequelize.STRING
    },
    name: {
      allowNull: false,
      type: Sequelize.STRING
    }
  });
};
