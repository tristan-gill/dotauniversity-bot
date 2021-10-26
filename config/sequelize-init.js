const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.HEROKU_POSTGRESQL_ONYX_URL, {
  define: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    underscored: true
  }
  //TODO
  // dialectOptions: {
  //   ssl: ['production', 'staging'].includes(config.get('NODE_ENV')) || !!ssl || url.includes('amazonaws.com') ? { rejectUnauthorized: false } : false,
  // },
});

module.exports = sequelize;
