import { useState } from 'react'
import {
  AccountInfo,
  AccountInfoQuery,
  Hbar,
  Transaction as HederaTransaction,
  TransactionId,
  TransferTransaction,
} from '@hashgraph/sdk'
import {
  HederaProvider,
  queryToBase64String,
  SignAndExecuteQueryParams,
  SignMessageParams,
  transactionToBase64String,
} from '@hashgraph/hedera-wallet-connect'

export interface HederaSignTransactionParams {
  recipientId: string
  amount: string
  maxFee: string
}
export interface HederaSignAndExecuteTransactionParams {
  recipientId: string
  amount: string
}
export interface HederaSignMessageParams {
  message: string
}

export const useHederaMethods = (
  walletProvider: HederaProvider,
  address: string,
  sendTxId: (id: string) => void,
  sendSignMsg: (msg: string) => void,
  sendNodeAddresses: (nodes: string[]) => void,
) => {
  const [signedHederaTx, setSignedHederaTx] = useState<HederaTransaction>()

  const execute = async (methodName: string, params: Record<string, string>) => {
    switch (methodName) {
      case 'hedera_getNodeAddresses': {
        const result = await walletProvider.hedera_getNodeAddresses()
        sendNodeAddresses(result.nodes)
        return result.nodes
      }
      case 'hedera_executeTransaction': {
        if (!signedHederaTx)
          throw Error('Transaction not signed, use hedera_signTransaction first')
        const transactionList = transactionToBase64String(signedHederaTx)
        const result = await walletProvider.hedera_executeTransaction({ transactionList })
        setSignedHederaTx(undefined)
        sendTxId(result.transactionId)
        return result.transactionId
      }
      case 'hedera_signMessage': {
        const p = params as unknown as HederaSignMessageParams
        const signParams: SignMessageParams = {
          signerAccountId: 'hedera:testnet:' + address,
          message: p.message,
        }
        const { signatureMap } = await walletProvider.hedera_signMessage(signParams)
        sendSignMsg(signatureMap)
        return signatureMap
      }
      case 'hedera_signTransaction': {
        const p = params as unknown as HederaSignTransactionParams
        const accountId = address
        const hbarAmount = new Hbar(Number(p.amount))
        const transaction = new TransferTransaction()
          .setTransactionId(TransactionId.generate(accountId))
          .addHbarTransfer(accountId, hbarAmount.negated())
          .addHbarTransfer(p.recipientId, hbarAmount)
          .setMaxTransactionFee(new Hbar(Number(p.maxFee)))
          .freezeWith(null)
        const transactionSigned = await walletProvider.hedera_signTransaction({
          signerAccountId: 'hedera:testnet:' + accountId,
          transactionBody: transaction,
        })
        setSignedHederaTx(transactionSigned as HederaTransaction)
        return 'Transaction signed successfully'
      }
      case 'hedera_signAndExecuteTransaction': {
        const p = params as unknown as HederaSignAndExecuteTransactionParams
        const accountId = address
        const hbarAmount = new Hbar(Number(p.amount))
        const transaction = new TransferTransaction()
          .setTransactionId(TransactionId.generate(accountId))
          .addHbarTransfer(accountId, hbarAmount.negated())
          .addHbarTransfer(p.recipientId, hbarAmount)
        const result = await walletProvider.hedera_signAndExecuteTransaction({
          signerAccountId: 'hedera:testnet:' + accountId,
          transactionList: transactionToBase64String(transaction),
        })
        sendTxId(result.transactionId)
        return result.transactionId
      }
      case 'hedera_signAndExecuteQuery': {
        const accountId = address
        const query = new AccountInfoQuery().setAccountId(accountId)
        const queryParams: SignAndExecuteQueryParams = {
          signerAccountId: 'hedera:testnet:' + accountId,
          query: queryToBase64String(query),
        }
        const { response } = await walletProvider.hedera_signAndExecuteQuery(queryParams)
        const accountInfo = AccountInfo.fromBytes(Buffer.from(response, 'base64'))
        return JSON.stringify(accountInfo)
      }
      default:
        throw new Error(`Unsupported Hedera method: ${methodName}`)
    }
  }

  return { executeHederaMethod: execute }
}
