import React, { useEffect, useState } from 'react';
import { Avatar, Button } from 'antd';
import { useConnect } from '@particle-network/auth-core-modal';
import {
    getUserInfo,
} from "@particle-network/auth-core";
import { type UserInfo } from "@particle-network/auth-core/dist/api/types/index";
import { ScrollSepolia } from "@particle-network/chains";

interface HeaderProps {
    // Define the props for your component here
}

const Header: React.FC<HeaderProps> = (props) => {
    const { connect, disconnect, connected } = useConnect();
    const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        setUserInfo(getUserInfo());
        setLoading(false);
    }, []);

    useEffect(() => {
        if (connected) {
            setUserInfo(getUserInfo());
            setLoading(false);
        }
    }, [connected]);

    if (loading) {
        return null;
    }
    return (
        // JSX code for your component's UI
        <header>
            {/* Content of the header */}
            {!connected ? (
                <Button type="primary" onClick={async () => console.log(await connect({
                    socialType: 'google',
                    chain: ScrollSepolia,
                }))}>Connect</Button>
            ) : (
                <div>
                    {userInfo?.avatar ? (<Avatar src={userInfo.avatar} />) : (
                        <Avatar style={{ backgroundColor: '#f56a00', verticalAlign: 'middle' }} size="large" gap={4}>
                            {userInfo?.name?.charAt(0).toUpperCase()}
                        </Avatar>
                    )}
                    <Button type="default" onClick={disconnect}>Disconnect</Button>
                </div>
            )}
        </header>
    );
};

export default Header;
