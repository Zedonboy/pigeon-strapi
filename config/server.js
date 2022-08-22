module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS', ["7rh4fgvbubgvugffurrt4t6, loll;lhglfkdwqge6273748ru4hef"]),
  },
});
