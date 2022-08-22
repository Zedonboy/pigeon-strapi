const crypto = require("crypto")
module.exports = ({ env }) => ({
  apiToken : {
    salt: crypto.randomBytes(16).toString("base64")
  },
  auth: {
    secret: env('ADMIN_JWT_SECRET', '38677bb7be81b208661ea53bd222815d'),
  },
});
