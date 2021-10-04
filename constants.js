require('dotenv').config();

module.exports = {
  BEGINNER_TIERS: [process.env.TIER_ONE, process.env.TIER_TWO, process.env.TIER_THREE, process.env.TIER_FOUR, process.env.TIER_GRAD],
  EMOJI_NUMBERS: ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
  PREFIX: '!',
  QUESTION_ANSWERABLE_IDS: [process.env.COACH, process.env.DFZ_ADMIN, process.env.DFZ_QA_CONTRIBUTOR],
  QUEUABLE_ROLES: [process.env.COACH, process.env.TIER_ONE, process.env.TIER_TWO, process.env.TIER_THREE, process.env.TIER_FOUR, process.env.TIER_GRAD, process.env.TIER_TRYOUT],

  // channels that the bot will show the tip message in
  WHITELISTED_TIP_CHANNELS: {
    '731171811437445152': true, // admin-chat
    '731171811437445153': true, // internal-talk
    '731171811437445154': true, // beep-boop
    '731171811437445160': true, // general
    '731171811647291456': true, // looking-for-group
    '731171811647291457': true, // bot-chat
    '731171811647291460': true, // dota2-talk
    '731171811844161608': true, // esports-discussions
    '731171812024778842': true, // bot-practice
    '731171812024778843': true, // lobby-discussions
    '731171812238557203': true, // eu-general
    '731171812481957923': true, // na-general
    '731171812666245222': true, // sea-general
    '731171812481957920': true, // eu-coaches
    '731171812481957926': true, // na-coaches
    '731171812666245223': true, // sea-coaches
    '731171812666245225': true, // memes-and-dreams
    '731171812666245226': true, // art-station
    '731171812666245227': true, // anime-channel
    '731171812666245229': true // muted-text-channel
  }
};
