const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('User', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT
    },
    username: {
      allowNull: true,
      type: Sequelize.STRING
    }
  });
};
