import { AppKitNetwork } from '@reown/appkit/networks'
import {
  HederaProvider,
  HederaAdapter,
  HederaChainDefinition,
  hederaNamespace,
} from '@hashgraph/hedera-wallet-connect'
import UniversalProvider from '@walletconnect/universal-provider'
import { JsonRpcProvider } from 'ethers'

// Get projectId from https://cloud.reown.com
export const projectId = import.meta.env.NEXT_PUBLIC_PROJECT_ID
export const hederaRpcUrl =
  import.meta.env.VITE_HEDERA_RPC_URL || 'https://testnet.hedera.api.hgraph.io/v1/pk_test/rpc'
export const jsonRpcProvider = new JsonRpcProvider(hederaRpcUrl)

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const metadata = {
  name: 'Hedera EIP155 & HIP820 Example',
  description: 'Hedera EIP155 & HIP820 Example',
  url: 'https://github.com/hashgraph/hedera-wallet-connect/',
  icons: ['https://avatars.githubusercontent.com/u/31002956'],
}

export const networks = [
  HederaChainDefinition.Native.Mainnet,
  HederaChainDefinition.Native.Testnet,
  //should be same as import {hedera, hederaTestnet}from '@reown/appkit/networks'
  HederaChainDefinition.EVM.Mainnet,
  HederaChainDefinition.EVM.Testnet,
] as [AppKitNetwork, ...AppKitNetwork[]]

export const nativeHederaAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.Native.Mainnet, HederaChainDefinition.Native.Testnet],
  namespace: hederaNamespace,
})

export const eip155HederaAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.EVM.Mainnet, HederaChainDefinition.EVM.Testnet],
  namespace: 'eip155',
})

export const universalProvider = (await HederaProvider.init({
  projectId,
  metadata,
  logger: 'debug',
})) as unknown as UniversalProvider // avoid type mismatch error due to missing of private properties in HederaProvider
