import { NetworkProvider } from '@ton-community/blueprint';
import { JettonWalletB } from '../wrappers/JettonWalletB';
import { Address, beginCell, toNano } from 'ton-core';
import { JettonMinterB } from '../wrappers/JettonMinterB';
import { Router } from '../wrappers/Router';

export async function run(provider: NetworkProvider, args: string[]) {

    // Minter A

    const routerAddress = Address.parse('EQBpjR6BdZSL1XqpNAWg65nJNBhE-EZ3F-WK3w-sjvilUUgq');

    const jettonMinterA = provider.open(Router.createFromAddress(routerAddress));

    // Wallet A

    const routerJettonWalletAaddress = await jettonMinterA.getWalletAddress(routerAddress);

    // Miner B

    const jettonMinterBAddress = Address.parse('EQDdcF7zjjnSX8Ie7B588ZxY44U3idOAZnddHGmOET8q4E2e');

    const jettonMinterB = provider.open(JettonMinterB.createFromAddress(jettonMinterBAddress));

    const userWalletAddressV4 = Address.parse('kQAULcjDZ4TK9huUxR4Vl_Tfa8JRooU3bhvPrmHJHZIPGdKY');

    // Wallet B

    const userJettonWalletBAddress = await jettonMinterB.getWalletAddress(userWalletAddressV4);

    const userJettonWalletB = provider.open(JettonWalletB.createFromAddress(userJettonWalletBAddress));

    // provide liq

    await userJettonWalletB.sendTransfer(provider.sender(), {
        jettonAmount: 2002n,
        toAddress: routerAddress,
        fromAddress: provider.sender().address as Address,
        fwdAmount: toNano('0.4'),
        fwdPayload: beginCell()
            .storeUint(0xfcf9e58f, 32)
            .storeAddress(routerJettonWalletAaddress)
            .storeCoins(1)
            .endCell(),
        value: toNano('0.5'),
    });
}