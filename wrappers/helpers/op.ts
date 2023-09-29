import { crc32 } from "./crc32";

export const Opcodes = {
    proxyProvideLiquidity: crc32("proxy_provide_liquidity"),
    proxySwap: crc32("proxy_swap"),
    deployPTonWallet: crc32("deploy_pton_wallet")
};