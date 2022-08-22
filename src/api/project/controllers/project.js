'use strict';
"use strict";
const { Algodv2, OnApplicationComplete } = require("algosdk");
const algosdk = require("algosdk");
const DAO_DAPP_ID = 105302377
const PARTICIPATION_ASSET_ID = 105293033
const crypto = require("crypto")
/**
 *  project controller
 */

function generateProject(rnd) {
  return `#pragma version 5
  byte "${rnd}"
  arg 0
  b==
  assert
  int 1
  return`
}
 function getClient(network) {
    if (network === "main") return strapi.mainClient;
    return strapi.testClient;
  }
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::project.project', ({ strapi }) => ({
    async create(ctx){
      let net = ctx.request.headers["network"];
      //TODO(USer must pay to create project.)
      let encoder = new TextEncoder()
      let rndBytes = crypto.randomBytes(32)
      let code = rndBytes.toString("hex")
      let projectTeal = generateProject(code)
      let client = getClient(net)
      let response = await client.compile(projectTeal).do()
      let projectAddr = response["hash"]
      let creator_account = algosdk.mnemonicToSecretKey(process.env.MNEMONIC)
      let params = await client.getTransactionParams().do()
      //TODO(Validate these variabeles)
      let {lang, max_dev, github_issue, txId} = ctx.request.body
      
      // Verifying if you sent us token.
      let confirmedTxn = await algosdk.waitForConfirmation(getClient(net), txId, 4);
      if (confirmedTxn["confirmed-round"] === 0) {
        ctx.throw(400, "Transaction Failed or not commited");
        return;
      }
      let txn = confirmedTxn.txn.txn;
      if (txn["type"] !== "pay") {
        ctx.throw(400, "Transaction is not a paying transation");
        return;
      }
  
      if (txn["amt"] < 2*1000000) {
        ctx.throw(400, "Amount sent not allowed");
        return;
      }
      // You actually sent us token. then we are processing your project creation

      if(!params) {
        ctx.throw(500, "Could not fetch suggested Params")
        return
      }

      let tranferTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: creator_account.addr,
        to: projectAddr,
        amount: 1000000*1,
        suggestedParams:params,
      })

      let st = tranferTxn.signTxn(creator_account.sk)
      await client.sendRawTransaction(st).do()

      let optinDao = algosdk.makeApplicationOptInTxnFromObject({
        from:projectAddr,
        suggestedParams: params,
        appIndex: DAO_DAPP_ID,
      })

      let optInToken = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: projectAddr,
        to: projectAddr,
        assetIndex: PARTICIPATION_ASSET_ID,
        amount: 0,
        suggestedParams:params
      })

      const app_args = [encoder.encode("register_project"), encoder.encode(lang)]
      if(max_dev){
        app_args.push(algosdk.encodeUint64(max_dev))
      }

      if(github_issue){
        app_args.push(encoder.encode(github_issue))
      }

      let sender = algosdk.encodeAddress(txn["snd"])

      let appCall = algosdk.makeApplicationCallTxnFromObject({
        from: projectAddr,
        onComplete: OnApplicationComplete.NoOpOC,
        appIndex: DAO_DAPP_ID,
        appArgs: app_args,
        suggestedParams: params,
        accounts:[sender]
      })

      let txnGroup = [optInToken, optinDao, appCall]
      algosdk.assignGroupID(txnGroup)

      let program = new Uint8Array(Buffer.from(response["result"] , "base64"));
      const logic_args = []
      logic_args.push(Buffer.from(code))
      const lsig = new algosdk.LogicSigAccount(program, logic_args)
      let s_optintoken = algosdk.signLogicSigTransaction(optInToken, lsig)
      let s_optindao = algosdk.signLogicSigTransaction(optinDao, lsig)
      let s_appcall = algosdk.signLogicSigTransaction(appCall, lsig)

      await client.sendRawTransaction([s_optintoken.blob, s_optindao.blob, s_appcall.blob]).do()
      let projectEntity = await strapi.service("api::project.project").create({
        data: {
          ...ctx.request.body.project,
          address: projectAddr,
          creator: sender,
          bytes: response["result"],
          participants:[]
        }
      })
      return {
        passcode: code,
        project: projectEntity
      }
      //OptIn to DAO
      //Optin to PGPT
      // Call application register project. with Max dev and lang parameters
     
    },
    async applyProject(ctx) {
      let net = ctx.request.headers["network"];
      let txId = ctx.request.body.txId;
      let memberId = ctx.request.body.memberId
      if(!memberId || !txId) {
          ctx.throw(400, "Transaction Id or Member ID is missing")
          return
      }
      let confirmedTxn = await algosdk.waitForConfirmation(getClient(net), txId, 4);
      if (confirmedTxn["confirmed-round"] === 0) {
        ctx.throw(400, "Transaction Failed or not commited");
        return;
      }
      let txn = confirmedTxn.txn.txn;
      if (txn["type"] !== "axfer") {
        ctx.throw(400, "Transaction is not a paying transation");
        return;
      }

      if (txn["xaid"] !== PARTICIPATION_ASSET_ID) {
        ctx.throw(400, "Asset not supported");
        return;
      }
  
      if (txn["amt"] < 1) {
        ctx.throw(400, "Amount sent not allowed");
        return;
      }
  
      let sender = algosdk.encodeAddress(txn["snd"]);
      let projectAddr = algosdk.encodeAddress(txn["arcv"])

      let client = getClient(net)
      let params = await client.getTransactionParams().do()
      let encoder = new TextEncoder()
      let account = algosdk.mnemonicToSecretKey(process.env.MNEMONIC)
      let applyProjectTxn = algosdk.makeApplicationCallTxnFromObject({
        from: account.addr,
        suggestedParams: params,
        appIndex: DAO_DAPP_ID,
        accounts: [sender, projectAddr],
        foreignAssets: [memberId],
        appArgs: [encoder.encode("apply_project")]
      })
      let signedTxn = applyProjectTxn.signTxn(account.sk)
      let txnId
      try { 
        let {txnId : id} = await client.sendRawTransaction(signedTxn).do()
        txnId = id
      } catch(err) {
        ctx.throw(400, "Internal Transaction failed.")
        return
      }

      //TODO(PGPT Reversal Logic)

      let { results, pagination } = await strapi
        .service("api::project.project")
        .find({
          filters: {
            address: projectAddr,
          },
        });
  
  
        if(results.length === 0) {
          ctx.throw(400, "Receiver Adddress is not a project.")
          return
        }
  
        let projectEntity = results[0]
        await strapi.service("api::participant.participant").create({
          data: {
              address: sender,
              project: projectEntity.id
          }
        })

  
        return {
          transaction: txnId,
          message: "ok"
        }
    }
  }));
