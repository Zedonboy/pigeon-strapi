'use strict';
const port = "";
const token = {
  "X-API-Key": "OGKyWzuveD7K0pEzegBu12PMwLe7SfV154aBTF8o",
};
const baseServer = "https://testnet-algorand.api.purestake.io/ps2";
const algosdk = require("algosdk")
module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    let testClient = new algosdk.Algodv2(token, baseServer, port);
    strapi.testClient = testClient

    let mainClient = new algosdk.Algodv2(token, "https://mainnet-algorand.api.purestake.io/ps2", token)
    strapi.mainClient = mainClient
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
