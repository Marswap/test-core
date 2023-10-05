import { Address } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { LpAccount } from '../wrappers/LpAccount';
import { Router } from '../wrappers/Router';
import { JettonMinterB } from '../wrappers/JettonMinterB';
import { Pool } from '../wrappers/Pool';

export async function run(provider: NetworkProvider, args: string[]) {

    const userWalletAddressV4 = provider.sender().address as Address;

    const routerAddress = Address.parse('EQBpjR6BdZSL1XqpNAWg65nJNBhE-EZ3F-WK3w-sjvilUUgq');

    const router = provider.open(Router.createFromAddress(routerAddress));

    const routerJettonWalletAAddress = await router.getWalletAddress(routerAddress);

    const jettonMinterBAddress = Address.parse('EQDCJL0iQHofcBBvFBHdVG233Ri2V4kCNFgfRT-gqAd3Oc86');

    const jettonMinterB = provider.open(JettonMinterB.createFromAddress(jettonMinterBAddress));

    const routerJettonWalletBAddress = await jettonMinterB.getWalletAddress(routerAddress);

    const poolAddress = await router.getPoolAddress(routerJettonWalletAAddress, routerJettonWalletBAddress);

    console.log("Pool Address: ", poolAddress.toString(), poolAddress.toRawString());

    const pool = provider.open(Pool.createFromAddress(poolAddress));

    const lpAccountAddress = await pool.getLpAccountAddress(userWalletAddressV4);

    const lpAccount = provider.open(LpAccount.createFromAddress(lpAccountAddress));

    await lpAccount.sendRefundLiquidity(provider.sender());
}