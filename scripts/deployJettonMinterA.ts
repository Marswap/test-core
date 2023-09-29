import { Address, beginCell, toNano } from 'ton-core';
import { JettonMinterA } from '../wrappers/JettonMinterA';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {

    const jettonMinterA = provider.open(JettonMinterA.createFromConfig({
        
        adminAddress: provider.sender().address as Address,
        content: beginCell()
            .storeUint(1, 8)
            .storeStringTail('https://lp.optus.fi/an1.json')
        .endCell(),
        jettonWalletCode: await compile('JettonWalletA')
        
    }, await compile('JettonMinterA')));

    await jettonMinterA.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(jettonMinterA.address);
}
