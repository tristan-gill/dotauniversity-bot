const LobbiesCtrl = require('./lobbiesCtrl.js');
const MasteryCtrl = require('./masteryCtrl.js');
const ReactionsCtrl = require('./reactionsCtrl.js');
const TipsCtrl = require('./tipsCtrl.js');
const UserCtrl = require('./userCtrl.js');
const VoiceChannelCtrl = require('./voiceChannelCtrl.js');

const controllers = {};
module.exports = controllers;

controllers.setup = function (models, client) {
  controllers.LobbiesCtrl = new LobbiesCtrl(models, client, controllers);
  controllers.MasteryCtrl = new MasteryCtrl(models, client, controllers);
  controllers.ReactionsCtrl = new ReactionsCtrl(models, client, controllers);
  controllers.TipsCtrl = new TipsCtrl(models, client, controllers);
  controllers.UserCtrl = new UserCtrl(models, client, controllers);
  controllers.VoiceChannelCtrl = new VoiceChannelCtrl(models, client, controllers);

  console.log('Controllers defined');

  return controllers;
};
