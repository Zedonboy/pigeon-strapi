const crypto = require("crypto")
module.exports = ({ env }) => ({
    'users-permissions': {
        config: {
          jwtSecret: crypto.randomBytes(16).toString("base64"),
          jwt: {
            expiresIn: '2h',
          },
        },
      },
})