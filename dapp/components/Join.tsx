import { useConnect, useEthereum } from '@particle-network/auth-core-modal';
import React from 'react';
import { ethers } from "ethers";
import { Button, notification } from "antd";
import {
    AAWrapProvider,
    SmartAccount,
    SendTransactionMode,

} from "@particle-network/aa";
import { ScrollSepolia } from "@particle-network/chains";
import config from '../utils/config';

interface JoinProps {
    // Add any props you need for your component here
}

const Join: React.FC<JoinProps> = (props) => {
    const { provider } = useEthereum();
    const { connected } = useConnect();

    if (!connected) {
        return null;
    }

    const executeUserOp = async () => {
        const smartAccount = new SmartAccount(provider, {
            ...config.particleNetwork,
            aaOptions: {
                simple: [{ chainId: ScrollSepolia.id, version: "1.0.0" }],
            },
        });

        const customProvider = new ethers.providers.Web3Provider(
            new AAWrapProvider(smartAccount, SendTransactionMode.Gasless),
            "any"
        );

        // actual action

        const signer = customProvider.getSigner();

        const tx = {
            to: "0xA6b94Ce98D6CD4f447a9C6788F169DD17f65f747",
            value: ethers.utils.parseEther("0.0001"),
        };

        const txResponse = await signer.sendTransaction(tx);
        const txReceipt = await txResponse.wait();

        notification.success({
            message: txReceipt.transactionHash,
        });
    };

    return (
        // Add your JSX code here
        <div>
            <Button type="primary" onClick={executeUserOp}>executeUserOp</Button>
        </div>
    );
};

export default Join;
