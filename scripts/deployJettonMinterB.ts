import { Address, beginCell, toNano } from 'ton-core';
import { JettonMinterB } from '../wrappers/JettonMinterB';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {

    const jettonMinterB = provider.open(JettonMinterB.createFromConfig({
        
        adminAddress: provider.sender().address as Address,
        content: beginCell()
            .storeUint(1, 8)
            .storeStringTail('https://lp.optus.fi/bn2.json')
        .endCell(),
        jettonWalletCode: await compile('JettonWalletB')

    }, await compile('JettonMinterB')));

    await jettonMinterB.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(jettonMinterB.address);
}
