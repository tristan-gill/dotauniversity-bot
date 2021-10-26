const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('Lobby', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.STRING
    },
    data: {
      allowNull: true,
      type: Sequelize.JSON
    }
  }, {
    paranoid: true
  });
};
